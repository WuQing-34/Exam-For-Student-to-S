import { getPool } from './db'
import { ResultSetHeader, RowDataPacket } from 'mysql2'

export interface Paper {
  id: number
  title: string
  grade: string
  subject: string
  subjects_included?: string
  total_full_score?: number
  total_score: number
  total_time: number
  created_by: number
  created_at: string
}

export interface Question {
  id: number
  paper_id: number
  type: string
  content: string
  options: string | null
  correct_answer: string
  score: number
  order_num: number
  subject?: string
}

export interface QuestionOption {
  label: string
  text: string
}

export const paperModel = {
  async create(data: {
    title: string
    grade: string
    subject: string
    total_score: number
    total_time?: number
    created_by: number
    subjects_included?: string
    total_full_score?: number
  }): Promise<number> {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO paper (title, grade, subject, total_score, total_time, created_by, subjects_included, total_full_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title, data.grade, data.subject, data.total_score,
        data.total_time ?? 60, data.created_by,
        data.subjects_included ?? null, data.total_full_score ?? null,
      ]
    )
    return result.insertId
  },

  async createSubjectSection(data: {
    paper_id: number
    subject: string
    subject_name: string
    subject_order: number
    total_score: number
    question_count: number
  }): Promise<number> {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO subject_section (paper_id, subject, subject_name, subject_order, total_score, question_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.paper_id, data.subject, data.subject_name, data.subject_order, data.total_score, data.question_count]
    )
    return result.insertId
  },

  async findSectionsByPaperId(paperId: number): Promise<Array<{
    id: number; paper_id: number; subject: string; subject_name: string
    subject_order: number; total_score: number; question_count: number
  }>> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM subject_section WHERE paper_id = ? ORDER BY subject_order ASC',
      [paperId]
    )
    return rows as any[]
  },

  async createQuestion(data: {
    paper_id: number; type: string; content: string; options: string | null
    correct_answer: string; score: number; order_num: number; subject?: string
  }): Promise<number> {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO question (paper_id, type, content, options, correct_answer, score, order_num, subject)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.paper_id, data.type, data.content, data.options, data.correct_answer, data.score, data.order_num, data.subject ?? null]
    )
    return result.insertId
  },

  async createQuestionsBatch(
    paperId: number,
    questions: Array<{
      type: string; content: string; options: string | null
      correct_answer: string; score: number; order_num: number; subject?: string
    }>
  ): Promise<void> {
    const pool = getPool()
    for (const q of questions) {
      await pool.execute(
        `INSERT INTO question (paper_id, type, content, options, correct_answer, score, order_num, subject)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [paperId, q.type, q.content, q.options, q.correct_answer, q.score, q.order_num, q.subject ?? null]
      )
    }
  },

  async findAll(params: {
    grade?: string; subject?: string; page?: number; pageSize?: number
  }): Promise<{ list: Paper[]; total: number }> {
    const pool = getPool()
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const values: unknown[] = []

    if (params.grade) { where += ' AND grade = ?'; values.push(params.grade) }
    if (params.subject) { where += ' AND subject = ?'; values.push(params.subject) }

    const [countRows] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) as total FROM paper ${where}`, values as any)
    const total = (countRows[0] as { total: number }).total

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM paper ${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      values as any
    )
    return { list: rows as Paper[], total }
  },

  async findById(id: number): Promise<Paper | null> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM paper WHERE id = ?', [id]
    )
    return (rows[0] as Paper) ?? null
  },

  async findQuestionsByPaperId(paperId: number): Promise<Question[]> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM question WHERE paper_id = ? ORDER BY subject ASC, order_num ASC`,
      [paperId]
    )
    return rows as Question[]
  },

  async updateQuestionContent(id: number, content: string): Promise<boolean> {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE question SET content = ? WHERE id = ?', [content, id]
    )
    return result.affectedRows > 0
  },

  async delete(id: number): Promise<boolean> {
    const pool = getPool()
    await pool.execute('DELETE FROM question WHERE paper_id = ?', [id])
    await pool.execute('DELETE FROM subject_section WHERE paper_id = ?', [id])
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM paper WHERE id = ?', [id]
    )
    return result.affectedRows > 0
  },

  async batchDelete(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0
    const pool = getPool()
    const placeholders = ids.map(() => '?').join(',')
    await pool.execute(`DELETE FROM question WHERE paper_id IN (${placeholders})`, ids)
    await pool.execute(`DELETE FROM subject_section WHERE paper_id IN (${placeholders})`, ids)
    await pool.execute(`DELETE FROM paper WHERE id IN (${placeholders})`, ids)
    return ids.length
  },
}
