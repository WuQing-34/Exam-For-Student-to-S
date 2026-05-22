import { getDb, saveDatabase } from './db'

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
  subject?: string  // v1.1
}

export interface QuestionOption {
  label: string
  text: string
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

export const paperModel = {
  /**
   * 创建试卷（v1.1: 支持多科目）
   */
  create(data: {
    title: string
    grade: string
    subject: string
    total_score: number
    total_time?: number
    created_by: number
    subjects_included?: string
    total_full_score?: number
  }): number {
    const db = getDb()
    db.run(
      `INSERT INTO paper (title, grade, subject, total_score, total_time, created_by, subjects_included, total_full_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.grade,
        data.subject,
        data.total_score,
        data.total_time ?? 60,
        data.created_by,
        data.subjects_included ?? null,
        data.total_full_score ?? null,
      ]
    )
    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    saveDatabase()
    return lastId
  },

  /**
   * 创建科目分段（v1.1）
   */
  createSubjectSection(data: {
    paper_id: number
    subject: string
    subject_name: string
    subject_order: number
    total_score: number
    question_count: number
  }): number {
    const db = getDb()
    db.run(
      `INSERT INTO subject_section (paper_id, subject, subject_name, subject_order, total_score, question_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.paper_id, data.subject, data.subject_name, data.subject_order, data.total_score, data.question_count]
    )
    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    return lastId
  },

  /**
   * 获取试卷的科目分段（v1.1）
   */
  findSectionsByPaperId(paperId: number): Array<{
    id: number
    paper_id: number
    subject: string
    subject_name: string
    subject_order: number
    total_score: number
    question_count: number
  }> {
    const db = getDb()
    const result = db.exec(
      'SELECT * FROM subject_section WHERE paper_id = ? ORDER BY subject_order ASC',
      [paperId]
    )
    return toObjects(result)
  },

  /**
   * 创建题目
   */
  createQuestion(data: {
    paper_id: number
    type: string
    content: string
    options: string | null
    correct_answer: string
    score: number
    order_num: number
    subject?: string  // v1.1
  }): number {
    const db = getDb()
    db.run(
      `INSERT INTO question (paper_id, type, content, options, correct_answer, score, order_num, subject)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.paper_id, data.type, data.content, data.options, data.correct_answer, data.score, data.order_num, data.subject ?? null]
    )
    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    return lastId
  },

  /**
   * 批量创建题目（事务）
   */
  createQuestionsBatch(
    paperId: number,
    questions: Array<{
      type: string
      content: string
      options: string | null
      correct_answer: string
      score: number
      order_num: number
      subject?: string  // v1.1
    }>
  ): void {
    const db = getDb()
    for (const q of questions) {
      db.run(
        `INSERT INTO question (paper_id, type, content, options, correct_answer, score, order_num, subject)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [paperId, q.type, q.content, q.options, q.correct_answer, q.score, q.order_num, q.subject ?? null]
      )
    }
    saveDatabase()
  },

  /**
   * 获取试卷列表（分页+筛选）
   */
  findAll(params: {
    grade?: string
    subject?: string
    page?: number
    pageSize?: number
  }): { list: Paper[]; total: number } {
    const db = getDb()
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const values: unknown[] = []

    if (params.grade) { where += ' AND grade = ?'; values.push(params.grade) }
    if (params.subject) { where += ' AND subject = ?'; values.push(params.subject) }

    const countResult = db.exec(`SELECT COUNT(*) as total FROM paper ${where}`, values as (string | number)[])
    const total = (countResult[0]?.values[0]?.[0] as number) ?? 0

    const listResult = db.exec(
      `SELECT * FROM paper ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...(values as (string | number)[]), pageSize, offset]
    )
    const list = toObjects<Paper>(listResult)

    return { list, total }
  },

  /**
   * 根据 ID 获取试卷
   */
  findById(id: number): Paper | null {
    const db = getDb()
    const result = db.exec('SELECT * FROM paper WHERE id = ?', [id])
    return toObject<Paper>(result)
  },

  /**
   * 获取试卷的题目列表
   */
  findQuestionsByPaperId(paperId: number): Question[] {
    const db = getDb()
    const result = db.exec(
      `SELECT * FROM question WHERE paper_id = ? ORDER BY subject ASC, order_num ASC`,
      [paperId]
    )
    return toObjects<Question>(result)
  },

  /**
   * 删除试卷（CASCADE 需手动删除）
   */
  delete(id: number): boolean {
    const db = getDb()
    // 先删除题目
    db.run('DELETE FROM question WHERE paper_id = ?', [id])
    // 删除科目分段
    db.run('DELETE FROM subject_section WHERE paper_id = ?', [id])
    // 再删除试卷
    db.run('DELETE FROM paper WHERE id = ?', [id])
    saveDatabase()
    return true
  },
}
