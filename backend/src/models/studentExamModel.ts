import { getPool } from './db'
import { ResultSetHeader, RowDataPacket } from 'mysql2'

export interface StudentExam {
  id: number
  student_id: number
  subject: string
  questions_json: string | null
  answers_json: string | null
  score: number | null
  full_score: number
  status: 'pending' | 'in_progress' | 'submitted'
  started_at: string | null
  submitted_at: string | null
}

export const studentExamModel = {
  async create(
    studentId: number, subject: string, questionsJson: string, fullScore: number = 100
  ): Promise<StudentExam> {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO student_exam (student_id, subject, questions_json, full_score, status, started_at)
       VALUES (?, ?, ?, ?, 'in_progress', CURRENT_TIMESTAMP)`,
      [studentId, subject, questionsJson, fullScore]
    )
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM student_exam WHERE id = ?', [result.insertId]
    )
    return rows[0] as StudentExam
  },

  async findByStudentAndSubject(studentId: number, subject: string): Promise<StudentExam | null> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM student_exam WHERE student_id = ? AND subject = ?',
      [studentId, subject]
    )
    return (rows[0] as StudentExam) ?? null
  },

  async findById(id: number): Promise<StudentExam | null> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM student_exam WHERE id = ?', [id]
    )
    return (rows[0] as StudentExam) ?? null
  },

  async findByStudentId(studentId: number): Promise<StudentExam[]> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM student_exam WHERE student_id = ? ORDER BY submitted_at DESC',
      [studentId]
    )
    return rows as StudentExam[]
  },

  async saveDraft(id: number, answersJson: string): Promise<boolean> {
    const pool = getPool()
    await pool.execute(
      `UPDATE student_exam SET answers_json = ? WHERE id = ? AND status = 'in_progress'`,
      [answersJson, id]
    )
    return true
  },

  async submit(id: number, answersJson: string, score: number): Promise<boolean> {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE student_exam
       SET answers_json = ?, score = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'in_progress'`,
      [answersJson, score, id]
    )
    return result.affectedRows > 0
  },

  async findResults(params: {
    subject?: string; studentId?: number; salesId?: number; page?: number; pageSize?: number
  }): Promise<{ list: StudentExam[]; total: number }> {
    const pool = getPool()
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 50
    const offset = (page - 1) * pageSize

    let where = "WHERE se.status = 'submitted'"
    const values: (string | number)[] = []
    if (params.subject) { where += ' AND se.subject = ?'; values.push(params.subject) }
    if (params.studentId !== undefined) { where += ' AND se.student_id = ?'; values.push(params.studentId) }
    if (params.salesId !== undefined) { where += ' AND s.sales_id = ?'; values.push(params.salesId) }

    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM student_exam se JOIN student s ON se.student_id = s.id ${where}`,
      values
    )
    const total = (countRows[0] as { total: number }).total

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT se.* FROM student_exam se JOIN student s ON se.student_id = s.id ${where} ORDER BY se.submitted_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      values
    )
    return { list: rows as StudentExam[], total }
  },
}
