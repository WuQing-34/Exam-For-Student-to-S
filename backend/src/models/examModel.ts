import { getPool } from './db'
import { ResultSetHeader, RowDataPacket } from 'mysql2'

export interface ExamRecord {
  id: number
  assignment_id: number
  answers: string | null
  score: number | null
  subject_scores?: string
  s_class_qualified?: number
  total_full_score?: number
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

export const examModel = {
  async create(data: { assignment_id: number; started_at?: string }): Promise<number> {
    const pool = getPool()
    const startedAt = data.started_at ?? null
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO exam_record (assignment_id, status, started_at) VALUES (?, 'in_progress', COALESCE(?, CURRENT_TIMESTAMP))`,
      [data.assignment_id, startedAt]
    )
    return result.insertId
  },

  async findByAssignmentId(assignmentId: number): Promise<ExamRecord | null> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM exam_record WHERE assignment_id = ?', [assignmentId]
    )
    return (rows[0] as ExamRecord) ?? null
  },

  async findById(id: number): Promise<ExamRecord | null> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM exam_record WHERE id = ?', [id]
    )
    return (rows[0] as ExamRecord) ?? null
  },

  async findAll(params: {
    grade?: string; minScore?: number; maxScore?: number
    paperId?: number; page?: number; pageSize?: number
  }): Promise<{ list: ExamRecordWithDetails[]; total: number }> {
    const pool = getPool()
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const values: (string | number)[] = []

    if (params.grade) { where += ' AND s.grade = ?'; values.push(params.grade) }
    if (params.minScore !== undefined) { where += ' AND er.score >= ?'; values.push(params.minScore) }
    if (params.maxScore !== undefined) { where += ' AND er.score <= ?'; values.push(params.maxScore) }
    if (params.paperId) { where += ' AND a.paper_id = ?'; values.push(params.paperId) }

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM exam_record er
       JOIN assignment a ON er.assignment_id = a.id
       JOIN student s ON a.student_id = s.id
       ${where}`, values
    )
    const total = (countRows[0] as { total: number }).total

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT er.*, s.name as student_name, s.grade as student_grade, s.phone as student_phone,
              p.title as paper_title, p.subject as paper_subject, p.grade as paper_grade,
              p.total_score as paper_total_score,
              er.subject_scores, er.s_class_qualified, er.total_full_score
       FROM exam_record er
       JOIN assignment a ON er.assignment_id = a.id
       JOIN student s ON a.student_id = s.id
       JOIN paper p ON a.paper_id = p.id
       ${where}
       ORDER BY CASE WHEN er.submitted_at IS NULL THEN 1 ELSE 0 END, er.submitted_at DESC, er.started_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      values
    )
    return { list: rows as ExamRecordWithDetails[], total }
  },

  async submit(
    id: number,
    data: {
      answers: string; score: number; submitted_at?: string
      subject_scores?: string; s_class_qualified?: number; total_full_score?: number
    }
  ): Promise<boolean> {
    const pool = getPool()
    const submittedAt = data.submitted_at ?? null
    await pool.execute(
      `UPDATE exam_record
       SET answers = ?, score = ?, status = 'submitted', submitted_at = COALESCE(?, CURRENT_TIMESTAMP),
           subject_scores = ?, s_class_qualified = ?, total_full_score = ?
       WHERE id = ?`,
      [data.answers, data.score, submittedAt, data.subject_scores ?? null, data.s_class_qualified ?? 0, data.total_full_score ?? null, id]
    )
    return true
  },

  async saveAnswers(id: number, answersJson: string): Promise<boolean> {
    const pool = getPool()
    await pool.execute(
      `UPDATE exam_record SET answers = ? WHERE id = ?`,
      [answersJson, id]
    )
    return true
  },

  async updateStatus(id: number, status: string): Promise<boolean> {
    const pool = getPool()
    await pool.execute('UPDATE exam_record SET status = ? WHERE id = ?', [status, id])
    return true
  },
}
