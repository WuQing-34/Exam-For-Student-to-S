import { Router } from 'express'
import { verifyJWT } from '../../middlewares/auth'
import { examModel } from '../../models/examModel'
import { assignmentModel } from '../../models/assignmentModel'
import { paperModel } from '../../models/paperModel'
import { userModel } from '../../models/userModel'
import { exportService } from '../../services/exportService'
import { apiResponse, errorResponse, calcScoreRate, calcDuration, formatDuration } from '../../utils/helpers'

const router = Router()

/**
 * GET /api/admin/exams
 * 考试记录列表（分页+筛选）
 * v1.1: 返回增加 subject_scores, s_class_qualified, total_full_score, score_rate
 */
router.get('/', verifyJWT, (req, res) => {
  try {
    const { grade, minScore, maxScore, paperId, page, pageSize } = req.query

    const result = examModel.findAll({
      grade: grade as string,
      minScore: minScore !== undefined ? parseInt(minScore as string) : undefined,
      maxScore: maxScore !== undefined ? parseInt(maxScore as string) : undefined,
      paperId: paperId ? parseInt(paperId as string) : undefined,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    // 格式化数据
    const list = result.list.map(record => {
      // 计算得分率
      const totalScore = record.total_full_score || record.paper_total_score
      const scoreRate = record.score !== null ? calcScoreRate(record.score, totalScore) : null

      // 解析分科成绩
      let subjectScores = null
      if (record.subject_scores) {
        try {
          subjectScores = JSON.parse(record.subject_scores)
        } catch {
          subjectScores = null
        }
      }

      return {
        id: record.id,
        studentName: record.student_name,
        studentGrade: record.student_grade,
        studentPhone: record.student_phone,
        paperTitle: record.paper_title,
        paperSubject: record.paper_subject,
        paperGrade: record.paper_grade,
        score: record.score,
        totalScore,
        scoreRate,
        subjectScores,  // v1.1
        sClassQualified: record.s_class_qualified === 1,  // v1.1
        duration: calcDuration(record.started_at, record.submitted_at),
        durationFormatted: formatDuration(calcDuration(record.started_at, record.submitted_at)),
        status: record.status,
        startedAt: record.started_at,
        submittedAt: record.submitted_at,
      }
    })

    res.json(apiResponse({
      list,
      total: result.total,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/admin/exams/:id
 * 考试详情（含判分详情）
 */
router.get('/:id', verifyJWT, (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const record = examModel.findById(id)
    if (!record) {
      res.status(404).json(errorResponse(1003, '考试记录不存在'))
      return
    }

    const assignment = assignmentModel.findById(record.assignment_id)
    if (!assignment) {
      res.status(404).json(errorResponse(1003, '分配记录不存在'))
      return
    }

    const student = userModel.findById(assignment.student_id)
    if (!student) {
      res.status(404).json(errorResponse(1003, '考生不存在'))
      return
    }

    const paper = paperModel.findById(assignment.paper_id)
    if (!paper) {
      res.status(404).json(errorResponse(3001, '试卷不存在'))
      return
    }

    const questions = paperModel.findQuestionsByPaperId(paper.id)
    const studentAnswers = record.answers ? JSON.parse(record.answers) : []

    // 解析分科成绩
    let subjectScores = null
    if (record.subject_scores) {
      try {
        subjectScores = JSON.parse(record.subject_scores)
      } catch {
        subjectScores = null
      }
    }

    res.json(apiResponse({
      record: {
        ...record,
        subjectScores,
        sClassQualified: record.s_class_qualified === 1,
      },
      student: {
        id: student.id,
        name: student.name,
        grade: student.grade,
      },
      paper: {
        id: paper.id,
        title: paper.title,
        total_score: paper.total_score,
        subjects_included: paper.subjects_included ? JSON.parse(paper.subjects_included) : undefined,
      },
      questions,
      studentAnswers,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/admin/exams/:id/export
 * 导出 Word 报告
 */
router.post('/:id/export', verifyJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const buffer = await exportService.generateExamReport(id)

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    res.setHeader('Content-Disposition', `attachment; filename=考试报告_${Date.now()}.docx`)
    res.send(buffer)
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

export { router as adminExamRoutes }
