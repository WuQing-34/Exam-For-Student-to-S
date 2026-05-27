import { getPool } from './db'
import { ResultSetHeader, RowDataPacket } from 'mysql2'

export interface Assignment {
  id: number
  student_id: number
  paper_id: number
  status: string
  assigned_at: string
}

export const assignmentModel = {
  async create(data: { student_id: number; paper_id: number }): Promise<number | null> {
    const pool = getPool()
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO assignment (student_id, paper_id) VALUES (?, ?)',
        [data.student_id, data.paper_id]
      )
      return result.insertId
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') return null
      throw e
    }
  },

  async assignPaperToStudents(paperId: number, studentIds: number[]): Promise<{ assigned: number; skipped: number }> {
    let assigned = 0
    let skipped = 0
    for (const studentId of studentIds) {
      const result = await assignmentModel.create({ student_id: studentId, paper_id: paperId })
      if (result !== null) assigned++
      else skipped++
    }
    return { assigned, skipped }
  },

  async findAll(params: {
    studentId?: number; paperId?: number; page?: number; pageSize?: number
  }): Promise<{ list: Assignment[]; total: number }> {
    const pool = getPool()
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const values: (string | number)[] = []

    if (params.studentId) { where += ' AND student_id = ?'; values.push(params.studentId) }
    if (params.paperId) { where += ' AND paper_id = ?'; values.push(params.paperId) }

    const [countRows] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) as total FROM assignment ${where}`, values)
    const total = (countRows[0] as { total: number }).total

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM assignment ${where} ORDER BY assigned_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      values
    )
    return { list: rows as Assignment[], total }
  },

  async findByStudentId(studentId: number): Promise<Array<Assignment & {
    paper_title: string; paper_subject: string; paper_grade: string; paper_total_score: number
  }>> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT a.*, p.title as paper_title, p.subject as paper_subject,
             p.grade as paper_grade, p.total_score as paper_total_score
      FROM assignment a
      JOIN paper p ON a.paper_id = p.id
      WHERE a.student_id = ?
      ORDER BY a.assigned_at DESC
    `, [studentId])
    return rows as any[]
  },

  async findById(id: number): Promise<Assignment | null> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM assignment WHERE id = ?', [id]
    )
    return (rows[0] as Assignment) ?? null
  },

  async updateStatus(id: number, status: string): Promise<boolean> {
    const pool = getPool()
    await pool.execute('UPDATE assignment SET status = ? WHERE id = ?', [status, id])
    return true
  },

  async deleteByStudentId(studentId: number): Promise<boolean> {
    const pool = getPool()
    await pool.execute('DELETE FROM assignment WHERE student_id = ?', [studentId])
    return true
  },
}
