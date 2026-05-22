import { getDb, saveDatabase } from './db'

export interface Student {
  id: number
  name: string
  phone: string
  grade: string
  subjects?: string
  sales_id?: number
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

export const userModel = {
  /**
   * 创建考生（v2.0: 支持 subjects + sales_id）
   */
  create(data: { name: string; phone: string; grade: string; subjects?: string; sales_id?: number }): number {
    const db = getDb()
    db.run(
      'INSERT INTO student (name, phone, grade, subjects, sales_id) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.phone, data.grade, data.subjects ?? null, data.sales_id ?? null]
    )
    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    saveDatabase()
    return lastId
  },

  /**
   * 根据姓名+手机号查找考生（v2.0: 去掉 grade 唯一约束）
   */
  findByNamePhone(name: string, phone: string): Student | null {
    const db = getDb()
    const result = db.exec(
      'SELECT * FROM student WHERE name = ? AND phone = ?',
      [name, phone]
    )
    const list = toObjects<Student>(result)
    return list[0] ?? null
  },

  /**
   * 获取考生列表（分页+筛选）
   */
  findAll(params: {
    grade?: string
    keyword?: string
    salesId?: number
    page?: number
    pageSize?: number
  }): { list: Student[]; total: number } {
    const db = getDb()
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 50
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const values: (string | number)[] = []

    if (params.grade) { where += ' AND grade = ?'; values.push(params.grade) }
    if (params.salesId !== undefined) { where += ' AND sales_id = ?'; values.push(params.salesId) }
    if (params.keyword) {
      where += ' AND (name LIKE ? OR phone LIKE ?)'
      values.push(`%${params.keyword}%`, `%${params.keyword}%`)
    }

    const countResult = db.exec(`SELECT COUNT(*) as total FROM student ${where}`, values)
    const total = (countResult[0]?.values[0]?.[0] as number) ?? 0

    const listResult = db.exec(
      `SELECT * FROM student ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    )
    const list = toObjects<Student>(listResult)

    return { list, total }
  },

  /**
   * 根据 ID 查找考生
   */
  findById(id: number): Student | null {
    const db = getDb()
    const result = db.exec('SELECT * FROM student WHERE id = ?', [id])
    const list = toObjects<Student>(result)
    return list[0] ?? null
  },

  /**
   * 根据销售ID查找学生
   */
  findBySalesId(salesId: number, params?: { page?: number; pageSize?: number }): { list: Student[]; total: number } {
    const db = getDb()
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 50
    const offset = (page - 1) * pageSize

    const countResult = db.exec('SELECT COUNT(*) as total FROM student WHERE sales_id = ?', [salesId])
    const total = (countResult[0]?.values[0]?.[0] as number) ?? 0

    const listResult = db.exec(
      'SELECT * FROM student WHERE sales_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [salesId, pageSize, offset]
    )
    return { list: toObjects<Student>(listResult), total }
  },

  /**
   * 更新考生信息（v2.0: 支持 subjects + sales_id）
   */
  update(id: number, data: { name?: string; phone?: string; grade?: string; subjects?: string; sales_id?: number }): boolean {
    const db = getDb()
    const fields: string[] = []
    const values: (string | number)[] = []

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone) }
    if (data.grade !== undefined) { fields.push('grade = ?'); values.push(data.grade) }
    if (data.subjects !== undefined) { fields.push('subjects = ?'); values.push(data.subjects) }
    if (data.sales_id !== undefined) { fields.push('sales_id = ?'); values.push(data.sales_id) }

    if (fields.length === 0) return false

    values.push(id)
    db.run(`UPDATE student SET ${fields.join(', ')} WHERE id = ?`, values)
    saveDatabase()
    return true
  },

  /**
   * 删除考生
   */
  delete(id: number): boolean {
    const db = getDb()
    db.run('DELETE FROM student WHERE id = ?', [id])
    saveDatabase()
    return true
  },

  /**
   * 批量导入考生（返回成功导入的ID列表）
   */
  batchImport(
    records: Array<{ name: string; phone: string; grade: string; subjects?: string; sales_id?: number }>
  ): { success: number; failed: number; errors: string[]; ids: number[] } {
    const errors: string[] = []
    const ids: number[] = []
    let success = 0

    for (const record of records) {
      try {
        const exist = userModel.findByNamePhone(record.name, record.phone)
        if (exist) {
          errors.push(`重复：${record.name} ${record.phone}`)
          continue
        }
        const id = userModel.create(record)
        ids.push(id)
        success++
      } catch (e: unknown) {
        const err = e as Error
        errors.push(`失败：${record.name} - ${err.message}`)
      }
    }

    return { success, failed: records.length - success, errors, ids }
  },
}
