import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { RowDataPacket } from 'mysql2'
import { verifyStudentSession, setStudentSession } from '../../middlewares/auth'
import { getPool } from '../../models/db'
import { userModel } from '../../models/userModel'
import { studentExamModel } from '../../models/studentExamModel'
import { assignmentModel } from '../../models/assignmentModel'
import { apiResponse, errorResponse, calcScoreRate, normalizeOptions, compareAnswers, getBlankCount, splitCircleAnswer, splitSlashAnswer } from '../../utils/helpers'
import { everosBridge } from '../../services/everosBridge'

const router = Router()

const SUBJECT_NAMES: Record<string, string> = {
  chinese: '语文', math: '数学', english: '英语', physics: '物理', chemistry: '化学',
}

/**
 * POST /api/student/register
 * 学生自助注册 (v2.0)
 */
router.post('/register', async (req, res) => {
  try {
    const { name, phone, grade, subjects, salesId } = req.body

    if (!name || !phone || !grade) {
      res.status(400).json(errorResponse(1000, '请填写完整信息（微信昵称/手机号/年级）'))
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      res.status(400).json(errorResponse(1000, '请输入正确的11位手机号'))
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

    // 检查是否已注册（按手机号，同一手机号只能注册一次）
    const existingByPhone = await userModel.findByPhone(phone)
    if (existingByPhone) {
      res.status(400).json(errorResponse(1000, '该手机号已注册，请直接登录'))
      return
    }

    // 验证销售是否存在且为 short_term_tutor
    const pool = getPool()
    const [sales] = await pool.execute(
      'SELECT id, role FROM admin WHERE id = ? AND role = ?',
      [salesId, 'short_term_tutor']
    ) as [Array<{ id: number; role: string }>, unknown]
    if (!sales.length) {
      res.status(400).json(errorResponse(1000, '选择的辅导老师不存在'))
      return
    }

    const id = await userModel.create({
      name, phone, grade,
      subjects: JSON.stringify(subjects),
      sales_id: salesId,
    })

    // 自动为该学生分配匹配年级+科目的试卷
    const assignResult = await assignmentModel.autoAssignForStudent(id, grade, subjects)
    console.log(`📋 新学生 ${name}(${id}) 自动分配试卷：${assignResult.assigned} 条新增，${assignResult.skipped} 条跳过（已存在）`)

    // 自动登录
    const sessionId = uuidv4()
    await setStudentSession(sessionId, {
      studentId: id,
      name,
      grade,
      createdAt: new Date().toISOString(),
    })

    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    })

    res.json(apiResponse({ sessionId, studentId: id }, '注册成功'))
  } catch (e: unknown) {
    const err = e as Error & { code?: string }
    // MySQL 唯一键冲突兜底提示
    if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('Duplicate entry')) {
      res.status(400).json(errorResponse(1000, '手机号已注册'))
      return
    }
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/student/login
 * 学生登录 (v2.0: 按姓名+手机号，返回 subjects)
 */
router.post('/login', async (req, res) => {
  try {
    const { name, phone } = req.body

    if (!name || !phone) {
      res.status(400).json(errorResponse(1000, '请输入微信昵称和手机号'))
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      res.status(400).json(errorResponse(1000, '请输入正确的11位手机号'))
      return
    }

    const student = await userModel.findByNamePhone(name, phone)
    if (!student) {
      res.status(401).json(errorResponse(2001, '未找到您的信息，请先注册'))
      return
    }

    // 解析 subjects
    let subjects: string[] = []
    if (student.subjects) {
      try { subjects = JSON.parse(student.subjects) } catch { subjects = [] }
    }

    // 登录时自动补建缺失的试卷分配（老用户兼容）
    const assignResult = await assignmentModel.autoAssignForStudent(student.id, student.grade, subjects)
    if (assignResult.assigned > 0) {
      console.log(`📋 老用户 ${student.name}(${student.id}) 登录时自动补分配试卷：${assignResult.assigned} 条新增，${assignResult.skipped} 条跳过`)
    }

    const sessionId = uuidv4()
    await setStudentSession(sessionId, {
      studentId: student.id,
      name: student.name,
      grade: student.grade,
      createdAt: new Date().toISOString(),
    })

    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
router.get('/sales', async (req, res) => {
  try {
    const pool = getPool()
    const [rows] = await pool.execute(
      "SELECT id, name, email FROM admin WHERE role = 'short_term_tutor' ORDER BY id"
    ) as [Array<{ id: number; name: string; email: string }>, unknown]
    res.json(apiResponse({ list: rows }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/subjects
 * 我的报名科目
 */
router.get('/subjects', verifyStudentSession, async (req, res) => {
  try {
    const session = req.studentSession!
    const student = await userModel.findById(session.studentId)
    if (!student) {
      res.status(404).json(errorResponse(1003, '学生不存在'))
      return
    }

    let subjects: string[] = []
    if (student.subjects) {
      try { subjects = JSON.parse(student.subjects) } catch { subjects = [] }
    }

    // 每次访问科目列表时，自动补建缺失的试卷分配（防护性兼容）
    await assignmentModel.autoAssignForStudent(session.studentId, student.grade, subjects)

    // 获取每科的考试状态
    const exams = await studentExamModel.findByStudentId(session.studentId)
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
router.post('/exams/start', verifyStudentSession, async (req, res) => {
  try {
    const { subject } = req.body
    const session = req.studentSession!

    if (!subject) {
      res.status(400).json(errorResponse(1000, '请指定科目'))
      return
    }

    // 检查学生是否报名了该科目
    const student = await userModel.findById(session.studentId)
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
    const existing = await studentExamModel.findByStudentAndSubject(session.studentId, subject)
    if (existing && existing.status === 'submitted') {
      res.status(400).json(errorResponse(4002, '该科目已提交，不能重新考试'))
      return
    }

    // 查找学生被分配的试卷（按年级+科目匹配）
    const pool = getPool()

    // 先查单科目试卷
    const [assignRows] = await pool.execute<RowDataPacket[]>(
      `SELECT a.paper_id, p.title, p.total_score, p.subject as paper_subject
       FROM assignment a
       JOIN paper p ON p.id = a.paper_id
       WHERE a.student_id = ? AND p.grade = ? AND p.subject = ?
       ORDER BY a.assigned_at DESC LIMIT 1`,
      [session.studentId, student.grade, subject]
    )

    // 没匹配到单科，再查 multi 试卷
    let paperId: number
    let totalScore: number

    if (assignRows.length > 0) {
      const row = assignRows[0] as { paper_id: number; total_score: number }
      paperId = row.paper_id
      totalScore = row.total_score
    } else {
      const [multiRows] = await pool.execute<RowDataPacket[]>(
        `SELECT a.paper_id, p.title, p.total_score, p.subjects_included
         FROM assignment a
         JOIN paper p ON p.id = a.paper_id
         WHERE a.student_id = ? AND p.grade = ? AND p.subject = 'multi'
         ORDER BY a.assigned_at DESC LIMIT 1`,
        [session.studentId, student.grade]
      )

      if (!multiRows.length) {
        res.status(400).json(errorResponse(1000, '您还没有被分配试卷，请联系辅导老师'))
        return
      }

      const multiRow = multiRows[0] as { paper_id: number; total_score: number; subjects_included: string | null }
      let subjectsIncluded: string[] = []
      if (multiRow.subjects_included) {
        try { subjectsIncluded = JSON.parse(multiRow.subjects_included) } catch { subjectsIncluded = [] }
      }
      if (!subjectsIncluded.includes(subject)) {
        res.status(400).json(errorResponse(1000, '您还没有被分配该科目的试卷，请联系辅导老师'))
        return
      }
      paperId = multiRow.paper_id
      totalScore = multiRow.total_score
    }

    // 从试卷中获取该科目的题目
    const [questionRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, type, content, options, correct_answer, score, order_num, subject
       FROM question
       WHERE paper_id = ? AND (subject = ? OR subject IS NULL)
       ORDER BY order_num`,
      [paperId, subject]
    )

    if (!questionRows.length) {
      res.status(400).json(errorResponse(1000, '该试卷暂无题目，请联系管理员'))
      return
    }

    const questions = questionRows.map(row => ({
      id: row.id,
      type: row.type,
      content: row.content,
      options: normalizeOptions(row.options),
      correct_answer: row.correct_answer,
      score: row.score,
      order_num: row.order_num,
      subject: row.subject,
    }))

    // 对于 multi 试卷，totalScore 用实际题目分数之和
    const actualTotalScore = questions.reduce((sum, q) => sum + (q.score || 0), 0)
    const finalScore = actualTotalScore > 0 ? actualTotalScore : totalScore

    // 去掉正确答案后返回
    const questionsWithoutAnswer = questions.map(({ correct_answer: _, ...q }) => ({
      ...q,
      blankCount: (q.type === 'fill_blank' || q.type === 'fill') ? getBlankCount(_ as string) : undefined,
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
        options: normalizeOptions(options),
        blankCount: (q.type === 'fill_blank' || q.type === 'fill') ? getBlankCount(_ as string) : undefined,
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
    const exam = await studentExamModel.create(
      session.studentId,
      subject,
      JSON.stringify(questionsStored),
      finalScore
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
router.get('/exams/results', verifyStudentSession, async (req, res) => {
  try {
    const session = req.studentSession!
    const student = await userModel.findById(session.studentId)

    let subjects: string[] = []
    if (student?.subjects) {
      try { subjects = JSON.parse(student.subjects) } catch { subjects = [] }
    }

    const exams = await studentExamModel.findByStudentId(session.studentId)
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
 * POST /api/student/exams/:id/save
 * 保存答案草稿（考试中途自动保存）
 */
router.post('/exams/:id/save', verifyStudentSession, async (req, res) => {
  try {
    const examId = parseInt(req.params.id)
    if (isNaN(examId)) {
      res.status(400).json(errorResponse(1000, '无效的考试ID'))
      return
    }
    const { answers } = req.body
    const session = req.studentSession!

    const exam = await studentExamModel.findById(examId)
    if (!exam) {
      res.status(404).json(errorResponse(1003, '考试记录不存在'))
      return
    }
    if (exam.student_id !== session.studentId) {
      res.status(403).json(errorResponse(1002, '无权访问'))
      return
    }
    if (exam.status === 'submitted') {
      res.json(apiResponse(null, '已提交，无需保存草稿'))
      return
    }

    await studentExamModel.saveDraft(examId, JSON.stringify(answers || []))
    res.json(apiResponse({ saved: true }, '草稿已保存'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/exams/:id
 * 获取考试题目 (v2.0)
 */
router.get('/exams/:id', verifyStudentSession, async (req, res) => {
  try {
    const examId = parseInt(req.params.id)
    if (isNaN(examId)) {
      res.status(400).json(errorResponse(1000, '无效的考试ID'))
      return
    }
    const session = req.studentSession!

    const exam = await studentExamModel.findById(examId)
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
        options: normalizeOptions(q.options),
        blankCount: (q.type === 'fill_blank' || q.type === 'fill') ? getBlankCount(correct_answer as string) : undefined,
      }
    })

    // 解析已保存的草稿答案
    let savedAnswers: Array<{ questionId: number; answer: string }> = []
    if (exam.answers_json) {
      try { savedAnswers = JSON.parse(exam.answers_json) } catch { savedAnswers = [] }
    }

    res.json(apiResponse({
      examId: exam.id,
      subject: exam.subject,
      questions: questionsWithoutAnswer,
      status: exam.status,
      savedAnswers,
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
router.post('/exams/:id/submit', verifyStudentSession, async (req, res) => {
  try {
    const examId = parseInt(req.params.id)
    if (isNaN(examId)) {
      res.status(400).json(errorResponse(1000, '无效的考试ID'))
      return
    }
    const { answers } = req.body
    const session = req.studentSession!

    const exam = await studentExamModel.findById(examId)
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
    let questions: Array<{ id: number; correct_answer: string; score?: number; type?: string }> = []
    if (exam.questions_json) {
      try { questions = JSON.parse(exam.questions_json) } catch { questions = [] }
    }

    const answerArray: Array<{ questionId: number; answer: string }> = answers || []

    // 判分：按满分均分到每题，多空题按空独立给分
    const pointPerQuestion = questions.length > 0 ? Math.round(exam.full_score / questions.length) : 0
    let scoreFloat = 0
    for (const q of questions) {
      const studentAnswer = answerArray.find((a: { questionId: number }) => a.questionId === q.id)
      const rawAnswer = studentAnswer?.answer ?? ''

      // 多空题：answer 用 ||| 分隔，每空独立判分，部分正确按比例给分
      const blankCount = getBlankCount(q.correct_answer)
      if (blankCount > 1) {
        const parts = rawAnswer.split('|||')
        // 解析正确答案数组：JSON 数组 / /分隔 / 圆圈序号 三种格式
        let correctAnswers: string[] = []
        try {
          const parsed = JSON.parse(q.correct_answer ?? '[]')
          if (Array.isArray(parsed)) correctAnswers = parsed
          else if ((q.correct_answer ?? '').includes('/')) {
            correctAnswers = splitSlashAnswer(q.correct_answer ?? '')
          } else {
            correctAnswers = splitCircleAnswer(q.correct_answer ?? '')
          }
        } catch {
          if ((q.correct_answer ?? '').includes('/')) {
            correctAnswers = splitSlashAnswer(q.correct_answer ?? '')
          } else {
            correctAnswers = splitCircleAnswer(q.correct_answer ?? '')
          }
        }
        const correctCount = correctAnswers.filter((ans, idx) =>
          compareAnswers(parts[idx] ?? '', ans, q.id, q.type, true)
        ).length
        scoreFloat += (correctCount / blankCount) * pointPerQuestion
      } else if (compareAnswers(rawAnswer, q.correct_answer ?? '', q.id, q.type)) {
        scoreFloat += pointPerQuestion
      }
    }
    let score = Math.round(scoreFloat)
    // 修正舍入误差，确保不超满分
    if (questions.length > 0 && score > exam.full_score) {
      score = exam.full_score
    }

    const fullScore = exam.full_score
    const submitted = await studentExamModel.submit(examId, JSON.stringify(answerArray), score)

    if (!submitted) {
      res.status(400).json(errorResponse(4002, '该科目已提交，请勿重复提交'))
      return
    }

    // 异步记录到 EverOS 记忆层（fire-and-forget，不影响响应速度）
    everosBridge.recordExamResult(
      session.studentId,
      exam.subject,
      score,
      fullScore,
    ).catch(err => console.warn('[EverOS] 记录考试结果失败:', err.message))

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
 * GET /api/student/exams/:id/review
 * 学生查看已提交考试答卷（含正确答案对比）
 */
router.get('/exams/:id/review', verifyStudentSession, async (req, res) => {
  try {
    const examId = parseInt(req.params.id)
    if (isNaN(examId)) {
      res.status(400).json(errorResponse(1000, '无效的考试ID'))
      return
    }
    const session = req.studentSession!

    const exam = await studentExamModel.findById(examId)
    if (!exam) {
      res.status(404).json(errorResponse(1003, '考试记录不存在'))
      return
    }
    if (exam.student_id !== session.studentId) {
      res.status(403).json(errorResponse(1002, '无权访问'))
      return
    }
    if (exam.status !== 'submitted') {
      res.status(400).json(errorResponse(1000, '考试尚未提交'))
      return
    }

    let questions: Array<Record<string, unknown>> = []
    if (exam.questions_json) {
      try { questions = JSON.parse(exam.questions_json) } catch { questions = [] }
    }

    // 实时查询最新正确答案（覆盖 questions_json 里的旧快照）
    // 注意：questions_json 里的 id 可能是字符串，需要转成 number
    const qIds = questions
      .map((q: Record<string, unknown>) => Number(q.id))
      .filter((id: number) => !isNaN(id) && id > 0)
    if (qIds.length > 0) {
      const pool = getPool()
      const placeholders = qIds.map(() => '?').join(',')
      const [latestRows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, correct_answer FROM question WHERE id IN (${placeholders})`,
        qIds
      )
      const latestMap = new Map(
        (latestRows as Array<{ id: number; correct_answer: string }>).map(r => [r.id, r.correct_answer])
      )
      questions = questions.map((q: Record<string, unknown>) => ({
        ...q,
        correct_answer: latestMap.get(Number(q.id)) ?? q.correct_answer,
      }))
    }

    let studentAnswers: Array<{ questionId: number; answer: string }> = []
    if (exam.answers_json) {
      try { studentAnswers = JSON.parse(exam.answers_json) } catch { studentAnswers = [] }
    }

    // 构建逐题对比数据
    const pointPerQuestion = questions.length > 0 ? Math.round(exam.full_score / questions.length) : 0
    const review = questions.map((q: Record<string, unknown>) => {
      const qId = q.id as number
      const qType = q.type as string
      const correctAnswer = q.correct_answer as string ?? ''
      const studentAnswer = studentAnswers.find(a => a.questionId === qId)?.answer ?? ''

      // 判定对错：多空题按空独立判分
      let isCorrect = false
      let earnedScore = 0
      let blankResults: Array<{ blankIdx: number; studentVal: string; correctVal: string; isCorrect: boolean }> = []
      const blankCount = getBlankCount(correctAnswer)
      if (blankCount > 1) {
        const parts = studentAnswer.split('|||')
        // 解析正确答案数组：JSON 数组 / /分隔 / 圆圈序号 三种格式
        let correctAnswers: string[] = []
        try {
          const parsed = JSON.parse(correctAnswer)
          if (Array.isArray(parsed)) correctAnswers = parsed
          else if (correctAnswer.includes('/')) {
            correctAnswers = splitSlashAnswer(correctAnswer)
          } else {
            correctAnswers = splitCircleAnswer(correctAnswer)
          }
        } catch {
          if (correctAnswer.includes('/')) {
            correctAnswers = splitSlashAnswer(correctAnswer)
          } else {
            correctAnswers = splitCircleAnswer(correctAnswer)
          }
        }
        const perBlankResults = correctAnswers.map((ans, idx) => {
          const blankCorrect = compareAnswers(parts[idx] ?? '', ans, qId, qType, true)
          return {
            blankIdx: idx,
            studentVal: (parts[idx] ?? '').trim(),
            correctVal: ans,
            isCorrect: blankCorrect,
          }
        })
        blankResults = perBlankResults
        const correctCount = perBlankResults.filter(r => r.isCorrect).length
        earnedScore = Math.round((correctCount / blankCount) * pointPerQuestion)
        isCorrect = correctCount === blankCount
      } else {
        isCorrect = compareAnswers(studentAnswer, correctAnswer, qId, qType)
        earnedScore = isCorrect ? pointPerQuestion : 0
      }

      const { correct_answer: _, options, ...rest } = q
      return {
        ...rest,
        options: normalizeOptions(options),
        blankCount: (qType === 'fill_blank' || qType === 'fill') ? getBlankCount(correctAnswer) : undefined,
        correctAnswer,
        studentAnswer,
        isCorrect,
        earnedScore,
        blankResults,
        score: pointPerQuestion,
      }
    })

    res.json(apiResponse({
      examId: exam.id,
      subject: exam.subject,
      score: exam.score,
      fullScore: exam.full_score,
      scoreRate: calcScoreRate(exam.score ?? 0, exam.full_score),
      sClassQualified: (exam.score ?? 0) / exam.full_score >= 0.6,
      submittedAt: exam.submitted_at,
      questions: review,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/student/exams/:id/result
 * 获取单科成绩 (兼容旧版)
 */
router.get('/exams/:id/result', verifyStudentSession, async (req, res) => {
  try {
    const examId = parseInt(req.params.id)
    const exam = await studentExamModel.findById(examId)
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
