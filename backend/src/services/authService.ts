import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { getPool } from '../models/db'
import { ResultSetHeader, RowDataPacket } from 'mysql2'

export interface AdminInfo {
  id: number
  email: string
  password_hash: string
  name: string
  role: 'admin' | 'short_term_tutor'
  center?: string | null
  team?: string | null
  created_at: string
}

export const authService = {
  async register(data: {
    email: string; password: string; name: string; role: 'admin' | 'short_term_tutor'
  }): Promise<AdminInfo> {
    const pool = getPool()

    const [exist] = await pool.execute<RowDataPacket[]>('SELECT id FROM admin WHERE email = ?', [data.email])
    if (exist.length) {
      throw new Error('该邮箱已被注册')
    }

    const passwordHash = await bcrypt.hash(data.password, 10)
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO admin (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [data.email, passwordHash, data.name, data.role]
    )

    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM admin WHERE id = ?', [result.insertId])
    return rows[0] as AdminInfo
  },

  async login(email: string, password: string): Promise<{ token: string; user: Omit<AdminInfo, 'password_hash'> }> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM admin WHERE email = ?', [email])
    const user = rows[0] as AdminInfo | undefined
    if (!user) {
      throw new Error('邮箱或密码错误')
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      throw new Error('邮箱或密码错误')
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    )

    const { password_hash: _, ...userInfo } = user
    return { token, user: userInfo }
  },

  async getById(id: number): Promise<Omit<AdminInfo, 'password_hash'> | null> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM admin WHERE id = ?', [id])
    const user = rows[0] as AdminInfo | undefined
    if (!user) return null
    const { password_hash: _, ...userInfo } = user
    return userInfo
  },

  async addAdmin(email: string, name: string): Promise<Omit<AdminInfo, 'password_hash'>> {
    const pool = getPool()
    const [exist] = await pool.execute<RowDataPacket[]>('SELECT id FROM admin WHERE email = ?', [email])
    if (exist.length) {
      throw new Error('该邮箱前缀已存在')
    }

    const defaultPassword = 'aa123456'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO admin (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [email, passwordHash, name, 'admin']
    )
    return (await this.getById(result.insertId))!
  },

  async changePassword(adminId: number, oldPassword: string, newPassword: string): Promise<void> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM admin WHERE id = ?', [adminId])
    const user = rows[0] as AdminInfo | undefined
    if (!user) {
      throw new Error('用户不存在')
    }

    const valid = await bcrypt.compare(oldPassword, user.password_hash)
    if (!valid) {
      throw new Error('原密码错误')
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await pool.execute('UPDATE admin SET password_hash = ? WHERE id = ?', [passwordHash, adminId])
  },

  async findAllAdmins(): Promise<Omit<AdminInfo, 'password_hash'>[]> {
    const pool = getPool()
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM admin ORDER BY created_at DESC')
    return (rows as AdminInfo[]).map(u => {
      const { password_hash: _, ...info } = u
      return info
    })
  },

  async batchImportTutors(records: Array<{
    center: string; team: string; name: string; email: string
  }>): Promise<{ success: number; failed: number; errors: string[] }> {
    const pool = getPool()
    const defaultPassword = 'aa123456'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)

    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const r of records) {
      try {
        const [exist] = await pool.execute<RowDataPacket[]>('SELECT id FROM admin WHERE email = ?', [r.email])
        if (exist.length) {
          failed++
          errors.push(`${r.name}（${r.email}）：邮箱前缀已存在`)
          continue
        }

        await pool.execute(
          'INSERT INTO admin (email, password_hash, name, role, center, team) VALUES (?, ?, ?, ?, ?, ?)',
          [r.email, passwordHash, r.name, 'short_term_tutor', r.center || null, r.team || null]
        )
        success++
      } catch (e: unknown) {
        failed++
        const err = e as Error
        errors.push(`${r.name}（${r.email}）：${err.message}`)
      }
    }

    return { success, failed, errors }
  },
}
