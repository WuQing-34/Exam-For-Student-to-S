import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { verifyStudentSession, studentSessionStore } from '../../middlewares/auth'
import { userModel } from '../../models/userModel'
import { questionBankModel } from '../../models/questionBankModel'
import { studentExamModel } from '../../models/studentExamModel'
import { getDb } from '../../models/db'
import { apiResponse, errorResponse, calcScoreRate } from '../../utils/helpers'

const router = Router()

const SUBJECT_NAMES: Record<string, string> = {
  chinese: '语文', math: '数学', english: '英语', physics: '物理', chemistry: '化学',
}

/**
 * POST /api/student/register
 * 学生自助注册 (v2.0)
 */
router.post('/register', (req, res) => {
  try {
    const { name, phone, grade, subjects, salesId } = req.body

    if (!name || !phone || !grade) {
      res.status(400).json(errorResponse(1000, '请填写完整信息（微信昵称/手机号/年级）'))
      return
    }
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      res.status(400).json(errorResponse(1000, '请至少选择一门科目'))
      return
    }
    if (!salesId) {
      res.status(400).json(errorResponse(1000, '请选择辅导老师'))
      return
    }

    // 检查是否已注册（按姓名+手机号）
    const existing = userModel.findByNamePhone(name, phone)
    if (existing) {
      res.status(400).json(errorResponse(1000, '该手机号已注册，请直接登录'))
      return
    }

    // 验证销售是否存在且为 short_term_tutor
    const db = getDb()
    const sales = db.exec('SELECT id, role FROM admin WHERE id = ? AND role = ?', [salesId, 'short_term_tutor'])
    if (!sales[0]?.values?.length) {
      res.status(400).json(errorResponse(1000, '选择的辅导老师不存在'))
      return
    }

    const id = userModel.create({
      name, phone, grade,
      subjects: JSON.stringify(subjects),
      sales_id: salesId,
    })

    // 自动登录
    const sessionId = uuidv4()
    studentSessionStore.set(sessionId, {
      studentId: id,
      name,
      grade,
      createdAt: new Date().toISOString(),
    })

    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    })

    res.json(apiResponse({ sessionId, studentId: id }, '注册成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/student/login
 * 学生登录 (v2.0: 按姓名+手机号，返回 subjects)
 */
router.post('/login', (req, res) => {
  try {
    const { name, phone } = req.body

    if (!name || !phone) {
      res.status(400).json(errorResponse(1000, '请输入微信昵称和手机号'))
      return
    }

    const student = userModel.findByNamePhone(name, phone)
    if (!student) {
      res.status(401).json(errorResponse(2001, '未找到您的信息，请先注册'))
      return
    }

    // 解析 subjects
    let subjects: string[] = []
    if (student.subjects) {
      try { subjects = JSON.parse(student.subjects) } catch { subjects = [] }
    }

    const sessionId = uuidv4()
    studentSessionStore.set(sessionId, {
      studentId: student.id,
      name: student.name,
      grade: student.grade,
      createdAt: new Date().toISOString(),
    })

    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    })

    res.json(apiResponse({
      sessionId,
      studentId: student.id,
      name: student.name,
      grade: student.grade,
      subjects,
    }, '登录成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/sales
 * 获取销售列表（仅 short_term_tutor 角色）
 */
router.get('/sales', (req, res) => {
  try {
    const db = getDb()
    const result = db.exec(
      "SELECT id, name, email FROM admin WHERE role = 'short_term_tutor' ORDER BY id"
    )
    if (!result.length) {
      res.json(apiResponse({ list: [] }))
      return
    }
    const { columns, values } = result[0]
    const list = values.map(row => {
      const obj: Record<string, unknown> = {}
      columns.forEach((c, i) => { obj[c] = row[i] })
      return obj
    })
    res.json(apiResponse({ list }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/subjects
 * 我的报名科目
 */
router.get('/subjects', verifyStudentSession, (req, res) => {
  try {
    const session = req.studentSession!
    const student = userModel.findById(session.studentId)
    if (!student) {
      res.status(404).json(errorResponse(1003, '学生不存在'))
      return
    }

    let subjects: string[] = []
    if (student.subjects) {
      try { subjects = JSON.parse(student.subjects) } catch { subjects = [] }
    }

    // 获取每科的考试状态
    const exams = studentExamModel.findByStudentId(session.studentId)
    const examMap = new Map(exams.map(e => [e.subject, e]))

    const subjectList = subjects.map(s => {
      const exam = examMap.get(s)
      return {
        subject: s,
        subjectName: SUBJECT_NAMES[s] || s,
        status: exam?.status ?? 'pending',
        score: exam?.score ?? null,
        fullScore: exam?.full_score ?? 100,
        scoreRate: exam?.score != null ? calcScoreRate(exam.score, exam.full_score) : null,
        sClassQualified: exam?.score != null ? (exam.score / exam.full_score) >= 0.6 : false,
        examId: exam?.id ?? null,
      }
    })

    res.json(apiResponse({ subjects: subjectList }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/student/exams/start
 * 开始某科考试 (v2.0)
 * body: { subject }
 */
router.post('/exams/start', verifyStudentSession, (req, res) => {
  try {
    const { subject } = req.body
    const session = req.studentSession!

    if (!subject) {
      res.status(400).json(errorResponse(1000, '请指定科目'))
      return
    }

    // 检查学生是否报名了该科目
    const student = userModel.findById(session.studentId)
    if (!student) {
      res.status(404).json(errorResponse(1003, '学生不存在'))
      return
    }
    let subjects: string[] = []
    if (student.subjects) {
      try { subjects = JSON.parse(student.subjects) } catch { subjects = [] }
    }
    if (!subjects.includes(subject)) {
      res.status(400).json(errorResponse(1000, '您未报名该科目'))
      return
    }

    // 检查是否已经考过
    const existing = studentExamModel.findByStudentAndSubject(session.studentId, subject)
    if (existing && existing.status === 'submitted') {
      res.status(400).json(errorResponse(4002, '该科目已提交，不能重新考试'))
      return
    }

    // 检查题库是否足够
    const choiceCount = questionBankModel.countBySubject(subject, 'choice')
    const fillCount = questionBankModel.countBySubject(subject, 'fill')
    if (choiceCount < 5 || fillCount < 5) {
      res.status(400).json(errorResponse(1000, `该科目题库不足（需选择题≥5、填空题≥5，当前选择${choiceCount}、填空${fillCount}）`))
      return
    }

    // 随机抽题：5 选择 + 5 填空
    const choices = questionBankModel.randomPick(subject, 'choice', 5)
    const fills = questionBankModel.randomPick(subject, 'fill', 5)
    const questions = [...choices, ...fills]

    // 去掉正确答案后返回
    const questionsWithoutAnswer = questions.map(({ correct_answer: _, options, ...q }) => ({
      ...q,
      type: q.type,
      id: q.id,
      content: q.content,
      options: options ? JSON.parse(options) : null,
    }))

    // 如果已有 in_progress 记录，返回存储的题目（复用已有考试）
    if (existing && existing.status === 'in_progress') {
      // 从已有记录中解析题目，去掉正确答案
      let storedQuestions: Array<Record<string, unknown>> = []
      if (existing.questions_json) {
        try { storedQuestions = JSON.parse(existing.questions_json) } catch { storedQuestions = [] }
      }
      const storedWithoutAnswer = storedQuestions.map(({ correct_answer: _, options, ...q }) => ({
        ...q,
        type: q.type,
        id: q.id,
        content: q.content,
        options: options ? (typeof options === 'string' ? JSON.parse(options as string) : options) : null,
      }))

      res.json(apiResponse({
        examId: existing.id,
        subject,
        questions: storedWithoutAnswer,
        startedAt: existing.started_at,
      }, '继续考试'))
      return
    }

    // 创建新考试记录（保留 correct_answer 用于判分，getExamContent 会移除）
    const questionsStored = questions.map(({ options, ...q }) => ({
      ...q,
      options: options,
    }))
    const exam = studentExamModel.create(
      session.studentId,
      subject,
      JSON.stringify(questionsStored),
      100
    )

    res.json(apiResponse({
      examId: exam.id,
      subject,
      questions: questionsWithoutAnswer,
      startedAt: exam.started_at,
    }, '考试已开始'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/exams/results
 * 获取所有科目成绩汇总 (v2.0) — 必须在 /:id 之前定义，避免路由冲突
 */
router.get('/exams/results', verifyStudentSession, (req, res) => {
  try {
    const session = req.studentSession!
    const student = userModel.findById(session.studentId)

    let subjects: string[] = []
    if (student?.subjects) {
      try { subjects = JSON.parse(student.subjects) } catch { subjects = [] }
    }

    const exams = studentExamModel.findByStudentId(session.studentId)
    const examMap = new Map(exams.map(e => [e.subject, e]))

    const results = subjects.map(s => {
      const exam = examMap.get(s)
      const score = exam?.score ?? 0
      const fullScore = exam?.full_score ?? 100
      return {
        subject: s,
        subjectName: SUBJECT_NAMES[s] || s,
        status: exam?.status ?? 'pending',
        score: exam?.score ?? null,
        fullScore,
        scoreRate: exam?.score != null ? calcScoreRate(score, fullScore) : null,
        sClassQualified: exam?.score != null ? (score / fullScore) >= 0.6 : false,
        submittedAt: exam?.submitted_at ?? null,
      }
    })

    res.json(apiResponse({ results }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/exams/:id
 * 获取考试题目 (v2.0)
 */
router.get('/exams/:id', verifyStudentSession, (req, res) => {
  try {
    const examId = parseInt(req.params.id)
    if (isNaN(examId)) {
      res.status(400).json(errorResponse(1000, '无效的考试ID'))
      return
    }
    const session = req.studentSession!

    const exam = studentExamModel.findById(examId)
    if (!exam) {
      res.status(404).json(errorResponse(1003, '考试记录不存在'))
      return
    }
    if (exam.student_id !== session.studentId) {
      res.status(403).json(errorResponse(1002, '无权访问'))
      return
    }

    let questions: unknown[] = []
    if (exam.questions_json) {
      try { questions = JSON.parse(exam.questions_json) } catch { questions = [] }
    }

    // 去掉正确答案
    const questionsWithoutAnswer = (questions as Array<Record<string, unknown>>).map((q: Record<string, unknown>) => {
      const { correct_answer, ...rest } = q
      return {
        ...rest,
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options as string) : q.options) : null,
      }
    })

    res.json(apiResponse({
      examId: exam.id,
      subject: exam.subject,
      questions: questionsWithoutAnswer,
      status: exam.status,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/student/exams/:id/submit
 * 提交考试 (v2.0: 按科判分)
 */
router.post('/exams/:id/submit', verifyStudentSession, (req, res) => {
  try {
    const examId = parseInt(req.params.id)
    if (isNaN(examId)) {
      res.status(400).json(errorResponse(1000, '无效的考试ID'))
      return
    }
    const { answers } = req.body
    const session = req.studentSession!

    const exam = studentExamModel.findById(examId)
    if (!exam) {
      res.status(404).json(errorResponse(1003, '考试记录不存在'))
      return
    }
    if (exam.student_id !== session.studentId) {
      res.status(403).json(errorResponse(1002, '无权访问'))
      return
    }
    if (exam.status === 'submitted') {
      res.status(400).json(errorResponse(4002, '该科目已提交'))
      return
    }

    // 解析题目和答案
    let questions: Array<{ id: number; correct_answer: string; score?: number }> = []
    if (exam.questions_json) {
      try { questions = JSON.parse(exam.questions_json) } catch { questions = [] }
    }

    const answerArray: Array<{ questionId: number; answer: string }> = answers || []

    // 判分：按满分均分到每题
    const pointPerQuestion = questions.length > 0 ? Math.round(exam.full_score / questions.length) : 0
    let score = 0
    for (const q of questions) {
      const studentAnswer = answerArray.find((a: { questionId: number }) => a.questionId === q.id)
      const answerText = (studentAnswer?.answer ?? '').trim().toLowerCase()
      const correctText = (q.correct_answer ?? '').trim().toLowerCase()
      if (answerText === correctText) {
        score += pointPerQuestion
      }
    }
    // 修正舍入误差，确保满分
    if (questions.length > 0 && score > exam.full_score) {
      score = exam.full_score
    }

    const fullScore = exam.full_score
    studentExamModel.submit(examId, JSON.stringify(answerArray), score)

    res.json(apiResponse({
      examId,
      subject: exam.subject,
      score,
      fullScore,
      scoreRate: calcScoreRate(score, fullScore),
      sClassQualified: (score / fullScore) >= 0.6,
    }, '提交成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/exams/:id/result
 * 获取单科成绩 (兼容旧版)
 */
router.get('/exams/:id/result', verifyStudentSession, (req, res) => {
  try {
    const examId = parseInt(req.params.id)
    const exam = studentExamModel.findById(examId)
    if (!exam) {
      res.status(404).json(errorResponse(1003, '考试记录不存在'))
      return
    }
    const score = exam.score ?? 0
    const fullScore = exam.full_score
    res.json(apiResponse({
      examId: exam.id,
      subject: exam.subject,
      score,
      fullScore,
      scoreRate: calcScoreRate(score, fullScore),
      sClassQualified: (score / fullScore) >= 0.6,
      status: exam.status,
      submittedAt: exam.submitted_at,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

export { router as studentRoutes }
