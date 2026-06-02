import { getPool } from './db'
import { ResultSetHeader, RowDataPacket } from 'mysql2'

export interface Student {
  id: number
  name: string
  phone: string
  grade: string
  subjects?: string
  sales_id?: number
  created_at: string
}

export const userModel = {
  async create(data: { name: string; phone: string; grade: string; subjects?: string; sales_id?: number }): Promise<number> {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO student (name, phone, grade, subjects, sales_id) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.phone, data.grade, data.subjects ?? null, data.sales_id ?? null]
    )
    return result.insertId
  },

  async findByNamePhone(name: string, phone: string): Promise<Student | null> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM student WHERE name = ? AND phone = ?',
      [name, phone]
    )
    return (rows[0] as Student) ?? null
  },

  async findByPhone(phone: string): Promise<Student | null> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM student WHERE phone = ?',
      [phone]
    )
    return (rows[0] as Student) ?? null
  },

  async findAll(params: {
    grade?: string
    keyword?: string
    salesId?: number
    page?: number
    pageSize?: number
  }): Promise<{ list: Student[]; total: number }> {
    const pool = getPool()
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

    const [countRows] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) as total FROM student ${where}`, values)
    const total = (countRows[0] as { total: number }).total

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM student ${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      values
    )

    return { list: rows as Student[], total }
  },

  async findById(id: number): Promise<Student | null> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM student WHERE id = ?', [id]
    )
    return (rows[0] as Student) ?? null
  },

  async findBySalesId(salesId: number, params?: { page?: number; pageSize?: number }): Promise<{ list: Student[]; total: number }> {
    const pool = getPool()
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 50
    const offset = (page - 1) * pageSize

    const [countRows] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) as total FROM student WHERE sales_id = ?', [salesId])
    const total = (countRows[0] as { total: number }).total

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM student WHERE sales_id = ? ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      [salesId]
    )
    return { list: rows as Student[], total }
  },

  async update(id: number, data: { name?: string; phone?: string; grade?: string; subjects?: string; sales_id?: number }): Promise<boolean> {
    const pool = getPool()
    const fields: string[] = []
    const values: (string | number)[] = []

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone) }
    if (data.grade !== undefined) { fields.push('grade = ?'); values.push(data.grade) }
    if (data.subjects !== undefined) { fields.push('subjects = ?'); values.push(data.subjects) }
    if (data.sales_id !== undefined) { fields.push('sales_id = ?'); values.push(data.sales_id) }

    if (fields.length === 0) return false

    values.push(id)
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE student SET ${fields.join(', ')} WHERE id = ?`, values
    )
    return result.affectedRows > 0
  },

  async delete(id: number): Promise<boolean> {
    const pool = getPool()
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM student WHERE id = ?', [id]
    )
    return result.affectedRows > 0
  },

  async batchImport(
    records: Array<{ name: string; phone: string; grade: string; subjects?: string; sales_id?: number }>
  ): Promise<{ success: number; failed: number; errors: string[]; ids: number[] }> {
    const errors: string[] = []
    const ids: number[] = []
    let success = 0

    for (const record of records) {
      try {
        const exist = await userModel.findByPhone(record.phone)
        if (exist) {
          errors.push(`手机号已注册：${record.name} ${record.phone}`)
          continue
        }
        const id = await userModel.create(record)
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
