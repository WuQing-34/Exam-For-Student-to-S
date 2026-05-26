import { getDb, saveDatabase } from './db'

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

function toObjects<T>(result: { columns: string[]; values: unknown[][] }[]): T[] {
  if (!result || result.length === 0) return []
  const { columns, values } = result[0]
  return values.map(row => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => { obj[col] = row[i] })
    return obj as T
  })
}

export const questionBankModel = {
  /**
   * 添加题目
   */
  create(data: {
    subject: string
    type: 'choice' | 'fill'
    content: string
    options?: string | null
    correct_answer: string
    created_by?: number
  }): QuestionBankItem {
    const db = getDb()
    db.run(
      'INSERT INTO question_bank (subject, type, content, options, correct_answer, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [data.subject, data.type, data.content, data.options ?? null, data.correct_answer, data.created_by ?? null]
    )
    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    saveDatabase()
    const result = db.exec('SELECT * FROM question_bank WHERE id = ?', [lastId])
    return toObjects<QuestionBankItem>(result)[0]
  },

  /**
   * 批量添加题目
   */
  batchCreate(questions: Array<{
    subject: string
    type: 'choice' | 'fill'
    content: string
    options?: string | null
    correct_answer: string
    created_by?: number
  }>): number {
    const db = getDb()
    let count = 0
    for (const q of questions) {
      db.run(
        'INSERT INTO question_bank (subject, type, content, options, correct_answer, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [q.subject, q.type, q.content, q.options ?? null, q.correct_answer, q.created_by ?? null]
      )
      count++
    }
    saveDatabase()
    return count
  },

  /**
   * 删除题目
   */
  delete(id: number): boolean {
    const db = getDb()
    db.run('DELETE FROM question_bank WHERE id = ?', [id])
    saveDatabase()
    return true
  },

  /**
   * 批量删除题目
   */
  batchDelete(ids: number[]): number {
    if (ids.length === 0) return 0
    const db = getDb()
    const placeholders = ids.map(() => '?').join(',')
    db.run(`DELETE FROM question_bank WHERE id IN (${placeholders})`, ids)
    saveDatabase()
    return ids.length
  },

  /**
   * 按科目查询题目
   */
  findBySubject(subject: string, type?: string): QuestionBankItem[] {
    const db = getDb()
    let sql = 'SELECT * FROM question_bank WHERE subject = ?'
    const params: string[] = [subject]
    if (type) { sql += ' AND type = ?'; params.push(type) }
    sql += ' ORDER BY id DESC'
    const result = db.exec(sql, params)
    return toObjects<QuestionBankItem>(result)
  },

  /**
   * 统计数量
   */
  countBySubject(subject: string, type?: string): number {
    const db = getDb()
    let sql = 'SELECT COUNT(*) as cnt FROM question_bank WHERE subject = ?'
    const params: string[] = [subject]
    if (type) { sql += ' AND type = ?'; params.push(type) }
    const result = db.exec(sql, params)
    return (result[0]?.values[0]?.[0] as number) ?? 0
  },

  /**
   * 随机抽取 N 题
   */
  randomPick(subject: string, type: string, count: number): QuestionBankItem[] {
    const db = getDb()
    const result = db.exec(
      'SELECT * FROM question_bank WHERE subject = ? AND type = ? ORDER BY RANDOM() LIMIT ?',
      [subject, type, count]
    )
    return toObjects<QuestionBankItem>(result)
  },

  /**
   * 分页查询
   */
  findAll(params: {
    subject?: string
    type?: string
    page?: number
    pageSize?: number
  }): { list: QuestionBankItem[]; total: number } {
    const db = getDb()
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 50
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const values: string[] = []
    if (params.subject) { where += ' AND subject = ?'; values.push(params.subject) }
    if (params.type) { where += ' AND type = ?'; values.push(params.type) }

    const countResult = db.exec(`SELECT COUNT(*) as total FROM question_bank ${where}`, values)
    const total = (countResult[0]?.values[0]?.[0] as number) ?? 0

    const listResult = db.exec(
      `SELECT * FROM question_bank ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    )
    return { list: toObjects<QuestionBankItem>(listResult), total }
  },

  /**
   * 统计各科题目数量
   */
  statsBySubject(): { subject: string; choice: number; fill: number }[] {
    const db = getDb()
    const result = db.exec(
      `SELECT subject, type, COUNT(*) as cnt FROM question_bank GROUP BY subject, type ORDER BY subject`
    )
    if (!result.length) return []
    const map = new Map<string, { choice: number; fill: number }>()
    const { columns, values } = result[0]
    for (const row of values) {
      const rowObj: Record<string, unknown> = {}
      columns.forEach((c, i) => { rowObj[c] = row[i] })
      const subject = rowObj.subject as string
      const type = rowObj.type as string
      const cnt = rowObj.cnt as number
      if (!map.has(subject)) map.set(subject, { choice: 0, fill: 0 })
      const entry = map.get(subject)!
      if (type === 'choice') entry.choice = cnt
      else entry.fill = cnt
    }
    return Array.from(map.entries()).map(([subject, val]) => ({ subject, ...val }))
  },
}
