import { getDb, saveDatabase } from './db'

export interface ExamRecord {
  id: number
  assignment_id: number
  answers: string | null
  score: number | null
  subject_scores?: string  // v1.1: 分科成绩 JSON
  s_class_qualified?: number  // v1.1: S班资格 0/1
  total_full_score?: number  // v1.1: 总满分
  status: string
  started_at: string | null
  submitted_at: string | null
}

export interface ExamRecordWithDetails extends ExamRecord {
  student_name: string
  student_grade: string
  student_phone: string
  paper_title: string
  paper_subject: string
  paper_grade: string
  paper_total_score: number
}

function toObjects<T>(result: { columns: string[]; values: unknown[][] }[]): T[] {
  if (!result || result.length === 0) return []
  const { columns, values } = result[0]
  return values.map(row => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => { obj[col] = row[i] })
    return obj as T
  })
}

function toObject<T>(result: { columns: string[]; values: unknown[][] }[]): T | null {
  const list = toObjects<T>(result)
  return list[0] ?? null
}

export const examModel = {
  /**
   * 创建考试记录
   */
  create(data: { assignment_id: number; started_at?: string }): number {
    const db = getDb()
    const now = data.started_at ?? new Date().toISOString()
    db.run(
      `INSERT INTO exam_record (assignment_id, status, started_at) VALUES (?, 'in_progress', ?)`,
      [data.assignment_id, now]
    )
    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    saveDatabase()
    return lastId
  },

  /**
   * 根据分配 ID 查找考试记录
   */
  findByAssignmentId(assignmentId: number): ExamRecord | null {
    const db = getDb()
    const result = db.exec('SELECT * FROM exam_record WHERE assignment_id = ?', [assignmentId])
    return toObject<ExamRecord>(result)
  },

  /**
   * 根据 ID 获取考试记录
   */
  findById(id: number): ExamRecord | null {
    const db = getDb()
    const result = db.exec('SELECT * FROM exam_record WHERE id = ?', [id])
    return toObject<ExamRecord>(result)
  },

  /**
   * 获取考试记录列表（分页+筛选）
   * v1.1: 增加 subject_scores, s_class_qualified, total_full_score
   */
  findAll(params: {
    grade?: string
    minScore?: number
    maxScore?: number
    paperId?: number
    page?: number
    pageSize?: number
  }): { list: ExamRecordWithDetails[]; total: number } {
    const db = getDb()
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const values: (string | number)[] = []

    if (params.grade) { where += ' AND s.grade = ?'; values.push(params.grade) }
    if (params.minScore !== undefined) { where += ' AND er.score >= ?'; values.push(params.minScore) }
    if (params.maxScore !== undefined) { where += ' AND er.score <= ?'; values.push(params.maxScore) }
    if (params.paperId) { where += ' AND a.paper_id = ?'; values.push(params.paperId) }

    const countResult = db.exec(`
      SELECT COUNT(*) as total
      FROM exam_record er
      JOIN assignment a ON er.assignment_id = a.id
      JOIN student s ON a.student_id = s.id
      ${where}
    `, values)
    const total = (countResult[0]?.values[0]?.[0] as number) ?? 0

    const listResult = db.exec(`
      SELECT er.*, s.name as student_name, s.grade as student_grade, s.phone as student_phone,
             p.title as paper_title, p.subject as paper_subject, p.grade as paper_grade,
             p.total_score as paper_total_score,
             er.subject_scores, er.s_class_qualified, er.total_full_score
      FROM exam_record er
      JOIN assignment a ON er.assignment_id = a.id
      JOIN student s ON a.student_id = s.id
      JOIN paper p ON a.paper_id = p.id
      ${where}
      ORDER BY CASE WHEN er.submitted_at IS NULL THEN 1 ELSE 0 END, er.submitted_at DESC, er.started_at DESC
      LIMIT ? OFFSET ?
    `, [...values, pageSize, offset])
    const list = toObjects<ExamRecordWithDetails>(listResult)

    return { list, total }
  },

  /**
   * 提交答案并判分（v1.1: 支持分科成绩）
   */
  submit(
    id: number,
    data: {
      answers: string
      score: number
      submitted_at?: string
      subject_scores?: string  // v1.1
      s_class_qualified?: number  // v1.1
      total_full_score?: number  // v1.1
    }
  ): boolean {
    const db = getDb()
    const now = data.submitted_at ?? new Date().toISOString()
    db.run(
      `UPDATE exam_record
       SET answers = ?, score = ?, status = 'submitted', submitted_at = ?,
           subject_scores = ?, s_class_qualified = ?, total_full_score = ?
       WHERE id = ?`,
      [data.answers, data.score, now, data.subject_scores ?? null, data.s_class_qualified ?? 0, data.total_full_score ?? null, id]
    )
    saveDatabase()
    return true
  },

  /**
   * 仅保存答案（不判分，用于自动保存草稿）
   */
  saveAnswers(id: number, answersJson: string): boolean {
    const db = getDb()
    db.run(
      `UPDATE exam_record SET answers = ? WHERE id = ?`,
      [answersJson, id]
    )
    saveDatabase()
    return true
  },

  /**
   * 更新考试记录状态
   */
  updateStatus(id: number, status: string): boolean {
    const db = getDb()
    db.run('UPDATE exam_record SET status = ? WHERE id = ?', [status, id])
    saveDatabase()
    return true
  },
}
