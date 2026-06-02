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

  /**
   * 新学生注册时，自动分配匹配的试卷
   * @returns { assigned: 新增分配数, skipped: 已存在跳过数 }
   */
  async autoAssignForStudent(
    studentId: number,
    grade: string,
    subjects: string[],
  ): Promise<{ assigned: number; skipped: number }> {
    const pool = getPool()
    let assigned = 0
    let skipped = 0

    if (subjects.length === 0) return { assigned, skipped }

    // 查询同年级所有试卷
    const [paperRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, subject, subjects_included FROM paper WHERE grade = ?`,
      [grade],
    ) as [Array<{ id: number; subject: string; subjects_included: string | null }>, unknown]

    const subjectSet = new Set(subjects)

    for (const paper of paperRows) {
      let shouldAssign = false

      if (paper.subject === 'multi') {
        // 综合试卷：subjects_included 中包含学生任一科目则分配
        if (paper.subjects_included) {
          try {
            const included: string[] = JSON.parse(paper.subjects_included)
            shouldAssign = subjects.some(s => included.includes(s))
          } catch { /* JSON 解析失败则跳过 */ }
        }
      } else {
        // 单科试卷：subject 在学生科目列表中则分配
        shouldAssign = subjectSet.has(paper.subject)
      }

      if (shouldAssign) {
        const result = await assignmentModel.create({
          student_id: studentId,
          paper_id: paper.id,
        })
        if (result !== null) assigned++
        else skipped++
      }
    }

    return { assigned, skipped }
  },
}
