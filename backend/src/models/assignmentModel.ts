import { getDb, saveDatabase } from './db'

export interface Assignment {
  id: number
  student_id: number
  paper_id: number
  status: string
  assigned_at: string
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

export const assignmentModel = {
  /**
   * 分配试卷给考生
   */
  create(data: { student_id: number; paper_id: number }): number | null {
    const db = getDb()
    try {
      db.run(
        'INSERT INTO assignment (student_id, paper_id) VALUES (?, ?)',
        [data.student_id, data.paper_id]
      )
      const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase()
      return lastId
    } catch {
      return null // UNIQUE 约束冲突
    }
  },

  /**
   * 批量分配试卷
   */
  assignPaperToStudents(paperId: number, studentIds: number[]): { assigned: number; skipped: number } {
    let assigned = 0
    let skipped = 0
    for (const studentId of studentIds) {
      const result = assignmentModel.create({ student_id: studentId, paper_id: paperId })
      if (result !== null) assigned++
      else skipped++
    }
    return { assigned, skipped }
  },

  /**
   * 获取分配列表（分页+筛选）
   */
  findAll(params: {
    studentId?: number
    paperId?: number
    page?: number
    pageSize?: number
  }): { list: Assignment[]; total: number } {
    const db = getDb()
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const values: (string | number)[] = []

    if (params.studentId) { where += ' AND student_id = ?'; values.push(params.studentId) }
    if (params.paperId) { where += ' AND paper_id = ?'; values.push(params.paperId) }

    const countResult = db.exec(`SELECT COUNT(*) as total FROM assignment ${where}`, values)
    const total = (countResult[0]?.values[0]?.[0] as number) ?? 0

    const listResult = db.exec(
      `SELECT * FROM assignment ${where} ORDER BY assigned_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    )
    const list = toObjects<Assignment>(listResult)

    return { list, total }
  },

  /**
   * 根据考生 ID 查找分配列表（含试卷信息）
   */
  findByStudentId(studentId: number): Array<Assignment & {
    paper_title: string
    paper_subject: string
    paper_grade: string
    paper_total_score: number
  }> {
    const db = getDb()
    const result = db.exec(`
      SELECT a.*, p.title as paper_title, p.subject as paper_subject,
             p.grade as paper_grade, p.total_score as paper_total_score
      FROM assignment a
      JOIN paper p ON a.paper_id = p.id
      WHERE a.student_id = ?
      ORDER BY a.assigned_at DESC
    `, [studentId])
    return toObjects<Assignment & { paper_title: string; paper_subject: string; paper_grade: string; paper_total_score: number }>(result)
  },

  /**
   * 根据 ID 查找分配
   */
  findById(id: number): Assignment | null {
    const db = getDb()
    const result = db.exec('SELECT * FROM assignment WHERE id = ?', [id])
    return toObject<Assignment>(result)
  },

  /**
   * 更新分配状态
   */
  updateStatus(id: number, status: string): boolean {
    const db = getDb()
    db.run('UPDATE assignment SET status = ? WHERE id = ?', [status, id])
    saveDatabase()
    return true
  },

  /**
   * v1.1: 根据考生ID删除分配
   */
  deleteByStudentId(studentId: number): boolean {
    const db = getDb()
    db.run('DELETE FROM assignment WHERE student_id = ?', [studentId])
    saveDatabase()
    return true
  },
}
