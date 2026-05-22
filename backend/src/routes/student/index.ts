import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { verifyStudentSession, studentSessionStore } from '../../middlewares/auth'
import { userModel } from '../../models/userModel'
import { assignmentModel } from '../../models/assignmentModel'
import { paperModel } from '../../models/paperModel'
import { examModel } from '../../models/examModel'
import { examService } from '../../services/examService'
import { apiResponse, errorResponse } from '../../utils/helpers'

const router = Router()

/**
 * POST /api/student/login
 * 考生登录
 */
router.post('/login', (req, res) => {
  try {
    const { name, grade, phone } = req.body

    if (!name || !grade || !phone) {
      res.status(400).json(errorResponse(1000, '请填写完整信息'))
      return
    }

    const student = userModel.findByNameGradePhone(name, grade, phone)
    if (!student) {
      res.status(401).json(errorResponse(2001, '未找到您的信息，请联系辅导老师导入'))
      return
    }

    // 生成 sessionId
    const sessionId = uuidv4()
    studentSessionStore.set(sessionId, {
      studentId: student.id,
      name: student.name,
      grade: student.grade,
      createdAt: new Date().toISOString(),
    })

    // 设置 cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      path: '/',
    })

    res.json(apiResponse({ sessionId }, '登录成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/papers
 * 我的试卷列表
 */
router.get('/papers', verifyStudentSession, (req, res) => {
  try {
    const session = req.studentSession!
    const assignments = assignmentModel.findByStudentId(session.studentId)

    // 获取每份试卷的考试记录
    const list = assignments.map(a => {
      const examRecord = examModel.findByAssignmentId(a.id)
      return {
        id: a.id,
        paperId: a.paper_id,
        paperTitle: a.paper_title,
        paperSubject: a.paper_subject,
        paperGrade: a.paper_grade,
        paperTotalScore: a.paper_total_score,
        status: examRecord
          ? (examRecord.status === 'submitted' ? 'completed' : examRecord.status)
          : 'pending',
        score: examRecord?.score ?? null,
        examRecordId: examRecord?.id ?? null,
      }
    })

    res.json(apiResponse({ list }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/papers/:id/exam
 * 获取答题内容（不含答案）
 */
router.get('/papers/:id/exam', verifyStudentSession, (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id)
    const session = req.studentSession!

    const assignment = assignmentModel.findById(assignmentId)
    if (!assignment) {
      res.status(404).json(errorResponse(1003, '分配不存在'))
      return
    }
    if (assignment.student_id !== session.studentId) {
      res.status(403).json(errorResponse(1002, '无权访问'))
      return
    }

    let examRecord = examModel.findByAssignmentId(assignmentId)
    if (!examRecord) {
      res.status(404).json(errorResponse(4001, '请先开始考试'))
      return
    }

    const paper = paperModel.findById(assignment.paper_id)
    if (!paper) {
      res.status(404).json(errorResponse(3001, '试卷不存在'))
      return
    }

    // 获取题目（不含答案，解析 options JSON）
    const questions = paperModel.findQuestionsByPaperId(paper.id)
    const questionsWithoutAnswer = questions.map(({ correct_answer: _, ...q }) => ({
      ...q,
      options: q.options ? JSON.parse(q.options as string) : null,
    }))

    // 获取科目分段
    const sections = paperModel.findSectionsByPaperId(paper.id)

    res.json(apiResponse({
      examRecord,
      paper: {
        id: paper.id,
        title: paper.title,
        totalScore: paper.total_full_score || paper.total_score,
        totalTime: paper.total_time,
        subjectsIncluded: paper.subjects_included ? JSON.parse(paper.subjects_included) : undefined,
      },
      questions: questionsWithoutAnswer,
      sections,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/student/exams/start
 * 开始考试
 */
router.post('/exams/start', verifyStudentSession, (req, res) => {
  try {
    const { assignmentId } = req.body
    const session = req.studentSession!

    const assignment = assignmentModel.findById(assignmentId)
    if (!assignment) {
      res.status(404).json(errorResponse(1003, '分配不存在'))
      return
    }
    if (assignment.student_id !== session.studentId) {
      res.status(403).json(errorResponse(1002, '无权访问'))
      return
    }

    const examRecordId = examService.startExam(assignmentId)
    const record = examModel.findById(examRecordId)

    res.json(apiResponse({
      examRecordId,
      startedAt: record?.started_at,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(4002, err.message))
  }
})

/**
 * PUT /api/student/exams/:id
 * 提交答案
 */
router.put('/exams/:id', verifyStudentSession, (req, res) => {
  try {
    const examRecordId = parseInt(req.params.id)
    const { answers, action } = req.body

    const record = examModel.findById(examRecordId)
    if (!record) {
      res.status(404).json(errorResponse(1003, '考试记录不存在'))
      return
    }

    if (record.status === 'submitted') {
      res.status(400).json(errorResponse(4002, '该试卷已提交'))
      return
    }

    const result = examService.submitAnswers(
      examRecordId,
      answers || [],
      action || 'save'
    )

    res.json(apiResponse(result, action === 'submit' ? '提交成功' : '保存成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/exams/:id/result
 * 获取成绩
 * v1.1: 返回分科成绩和S班资格
 */
router.get('/exams/:id/result', verifyStudentSession, (req, res) => {
  try {
    const examRecordId = parseInt(req.params.id)
    const result = examService.getResult(examRecordId)
    res.json(apiResponse(result))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

export { router as studentRoutes }
