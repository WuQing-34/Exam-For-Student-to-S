import { Router } from 'express'
import { verifyJWT } from '../../middlewares/auth'
import { studentExamModel } from '../../models/studentExamModel'
import { userModel } from '../../models/userModel'
import { apiResponse, errorResponse, calcScoreRate, calcDuration, formatDuration } from '../../utils/helpers'

const router = Router()

const SUBJECT_NAMES: Record<string, string> = {
  chinese: '语文', math: '数学', english: '英语', physics: '物理', chemistry: '化学',
}

/**
 * GET /api/admin/exams
 * 考试记录列表（v2.0: student_exam 表）
 */
router.get('/', verifyJWT, async (req, res) => {
  try {
    const { subject, studentId, page, pageSize } = req.query

    const result = await studentExamModel.findResults({
      subject: subject as string,
      studentId: studentId ? parseInt(studentId as string) : undefined,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    const list = await Promise.all(result.list.map(async record => {
      const student = await userModel.findById(record.student_id)
      const score = record.score ?? 0
      const fullScore = record.full_score
      return {
        id: record.id,
        studentId: record.student_id,
        studentName: student?.name ?? '未知',
        studentGrade: student?.grade ?? '',
        studentPhone: student?.phone ?? '',
        subject: record.subject,
        subjectName: SUBJECT_NAMES[record.subject] || record.subject,
        score: record.score,
        fullScore,
        scoreRate: record.score != null ? calcScoreRate(score, fullScore) : null,
        sClassQualified: record.score != null ? (score / fullScore) >= 0.6 : false,
        duration: calcDuration(record.started_at, record.submitted_at),
        durationFormatted: formatDuration(calcDuration(record.started_at, record.submitted_at)),
        status: record.status,
        startedAt: record.started_at,
        submittedAt: record.submitted_at,
      }
    }))

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
 * 考试详情
 */
router.get('/:id', verifyJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const record = await studentExamModel.findById(id)
    if (!record) {
      res.status(404).json(errorResponse(1003, '考试记录不存在'))
      return
    }

    const student = await userModel.findById(record.student_id)
    let questions: unknown[] = []
    if (record.questions_json) {
      try { questions = JSON.parse(record.questions_json) } catch { questions = [] }
    }
    let studentAnswers: unknown[] = []
    if (record.answers_json) {
      try { studentAnswers = JSON.parse(record.answers_json) } catch { studentAnswers = [] }
    }

    const score = record.score ?? 0
    const fullScore = record.full_score

    res.json(apiResponse({
      record: {
        id: record.id,
        subject: record.subject,
        subjectName: SUBJECT_NAMES[record.subject] || record.subject,
        score,
        fullScore,
        scoreRate: calcScoreRate(score, fullScore),
        sClassQualified: (score / fullScore) >= 0.6,
        status: record.status,
        startedAt: record.started_at,
        submittedAt: record.submitted_at,
      },
      student: {
        id: student?.id,
        name: student?.name,
        grade: student?.grade,
        phone: student?.phone,
      },
      questions,
      studentAnswers,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

export { router as adminExamRoutes }
