import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { getDb, saveDatabase } from '../models/db'

export interface AdminInfo {
  id: number
  email: string
  password_hash: string
  name: string
  role: 'admin' | 'tutor'
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

function toObject<T>(result: { columns: string[]; values: unknown[][] }[]): T | null {
  const list = toObjects<T>(result)
  return list[0] ?? null
}

export const authService = {
  /**
   * 注册管理端用户
   */
  async register(data: {
    email: string
    password: string
    name: string
    role: 'admin' | 'tutor'
  }): Promise<AdminInfo> {
    const db = getDb()

    // 检查邮箱是否已存在
    const exist = db.exec('SELECT id FROM admin WHERE email = ?', [data.email])
    if (exist[0]?.values?.length) {
      throw new Error('该邮箱已被注册')
    }

    const passwordHash = await bcrypt.hash(data.password, 10)
    db.run(
      'INSERT INTO admin (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [data.email, passwordHash, data.name, data.role]
    )
    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    saveDatabase()

    const user = toObject<AdminInfo>(db.exec('SELECT * FROM admin WHERE id = ?', [lastId]))
    return user!
  },

  /**
   * 管理端登录
   */
  async login(email: string, password: string): Promise<{
    token: string
    user: Omit<AdminInfo, 'password_hash'>
  }> {
    const db = getDb()
    const user = toObject<AdminInfo>(db.exec('SELECT * FROM admin WHERE email = ?', [email]))
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

  /**
   * 根据 ID 获取管理端用户
   */
  getById(id: number): Omit<AdminInfo, 'password_hash'> | null {
    const db = getDb()
    const user = toObject<AdminInfo>(db.exec('SELECT * FROM admin WHERE id = ?', [id]))
    if (!user) return null
    const { password_hash: _, ...userInfo } = user
    return userInfo
  },

  /**
   * 管理员添加新管理员
   */
  async addAdmin(email: string, name: string): Promise<Omit<AdminInfo, 'password_hash'>> {
    const db = getDb()

    const exist = db.exec('SELECT id FROM admin WHERE email = ?', [email])
    if (exist[0]?.values?.length) {
      throw new Error('该邮箱前缀已存在')
    }

    const defaultPassword = 'aa123456'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)
    db.run(
      'INSERT INTO admin (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [email, passwordHash, name, 'admin']
    )
    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
    saveDatabase()

    return this.getById(lastId)!
  },

  /**
   * 修改密码
   */
  async changePassword(adminId: number, oldPassword: string, newPassword: string): Promise<void> {
    const db = getDb()
    const user = toObject<AdminInfo>(db.exec('SELECT * FROM admin WHERE id = ?', [adminId]))
    if (!user) {
      throw new Error('用户不存在')
    }

    const valid = await bcrypt.compare(oldPassword, user.password_hash)
    if (!valid) {
      throw new Error('原密码错误')
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    db.run('UPDATE admin SET password_hash = ? WHERE id = ?', [passwordHash, adminId])
    saveDatabase()
  },

  /**
   * 获取所有管理员列表
   */
  findAllAdmins(): Omit<AdminInfo, 'password_hash'>[] {
    const db = getDb()
    const result = db.exec('SELECT * FROM admin ORDER BY created_at DESC')
    return toObjects<AdminInfo>(result).map(u => {
      const { password_hash: _, ...info } = u
      return info
    })
  },
}
