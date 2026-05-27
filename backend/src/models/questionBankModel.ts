import { getPool } from './db'
import { ResultSetHeader, RowDataPacket } from 'mysql2'

export interface QuestionBankItem {
  id: number
  subject: string
  type: 'choice' | 'fill'
  content: string
  options: string | null
  correct_answer: string
  created_by: number
  created_at: string
}

export const questionBankModel = {
  async create(data: {
    subject: string; type: 'choice' | 'fill'; content: string
    options?: string | null; correct_answer: string; created_by?: number
  }): Promise<QuestionBankItem> {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO question_bank (subject, type, content, options, correct_answer, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [data.subject, data.type, data.content, data.options ?? null, data.correct_answer, data.created_by ?? null]
    )
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM question_bank WHERE id = ?', [result.insertId]
    )
    return rows[0] as QuestionBankItem
  },

  async batchCreate(questions: Array<{
    subject: string; type: 'choice' | 'fill'; content: string
    options?: string | null; correct_answer: string; created_by?: number
  }>): Promise<number> {
    const pool = getPool()
    let count = 0
    for (const q of questions) {
      await pool.execute(
        'INSERT INTO question_bank (subject, type, content, options, correct_answer, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [q.subject, q.type, q.content, q.options ?? null, q.correct_answer, q.created_by ?? null]
      )
      count++
    }
    return count
  },

  async delete(id: number): Promise<boolean> {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM question_bank WHERE id = ?', [id]
    )
    return result.affectedRows > 0
  },

  async batchDelete(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0
    const pool = getPool()
    const placeholders = ids.map(() => '?').join(',')
    await pool.execute(`DELETE FROM question_bank WHERE id IN (${placeholders})`, ids)
    return ids.length
  },

  async findBySubject(subject: string, type?: string): Promise<QuestionBankItem[]> {
    const pool = getPool()
    let sql = 'SELECT * FROM question_bank WHERE subject = ?'
    const params: string[] = [subject]
    if (type) { sql += ' AND type = ?'; params.push(type) }
    sql += ' ORDER BY id DESC'
    const [rows] = await pool.execute<RowDataPacket[]>(sql, params)
    return rows as QuestionBankItem[]
  },

  async countBySubject(subject: string, type?: string): Promise<number> {
    const pool = getPool()
    let sql = 'SELECT COUNT(*) as cnt FROM question_bank WHERE subject = ?'
    const params: string[] = [subject]
    if (type) { sql += ' AND type = ?'; params.push(type) }
    const [rows] = await pool.execute<RowDataPacket[]>(sql, params)
    return (rows[0] as { cnt: number }).cnt
  },

  async randomPick(subject: string, type: string, count: number): Promise<QuestionBankItem[]> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM question_bank WHERE subject = ? AND type = ? ORDER BY RAND() LIMIT ${count}`,
      [subject, type]
    )
    return rows as QuestionBankItem[]
  },

  async findAll(params: {
    subject?: string; type?: string; page?: number; pageSize?: number
  }): Promise<{ list: QuestionBankItem[]; total: number }> {
    const pool = getPool()
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 50
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const values: string[] = []
    if (params.subject) { where += ' AND subject = ?'; values.push(params.subject) }
    if (params.type) { where += ' AND type = ?'; values.push(params.type) }

    const [countRows] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) as total FROM question_bank ${where}`, values)
    const total = (countRows[0] as { total: number }).total

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM question_bank ${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      values
    )
    return { list: rows as QuestionBankItem[], total }
  },

  async statsBySubject(): Promise<{ subject: string; choice: number; fill: number }[]> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT subject, type, COUNT(*) as cnt FROM question_bank GROUP BY subject, type ORDER BY subject`
    )
    const map = new Map<string, { choice: number; fill: number }>()
    for (const row of rows) {
      const { subject, type, cnt } = row as { subject: string; type: string; cnt: number }
      if (!map.has(subject)) map.set(subject, { choice: 0, fill: 0 })
      const entry = map.get(subject)!
      if (type === 'choice') entry.choice = cnt
      else entry.fill = cnt
    }
    return Array.from(map.entries()).map(([subject, val]) => ({ subject, ...val }))
  },
}
