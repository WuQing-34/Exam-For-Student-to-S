/**
 * JWT 验证中间件 + 考生 Redis Session 验证
 */
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import Redis from 'ioredis'
import { config } from '../config'

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: number
        email: string
        role: 'admin' | 'short_term_tutor'
      }
      studentSession?: {
        studentId: number
        name: string
        grade: string
      }
    }
  }
}

interface JWTPayload {
  sub: number
  email: string
  role: 'admin' | 'tutor'
  iat: number
  exp: number
}

// Redis 实例
let redis: Redis | null = null

export function initRedis(): Redis {
  if (redis) return redis
  redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    db: config.redis.db,
    keyPrefix: config.redis.keyPrefix,
  })
  redis.on('error', (err) => console.error('Redis 错误:', err))
  redis.on('connect', () => console.log('✅ Redis 已连接'))
  return redis
}

export function getRedis(): Redis {
  if (!redis) throw new Error('Redis 未初始化，请先调用 initRedis()')
  return redis
}

// Session 数据结构
interface StudentSession {
  studentId: number
  name: string
  grade: string
  createdAt: string
}

// Redis Session 操作
export async function getStudentSession(sessionId: string): Promise<StudentSession | null> {
  const r = getRedis()
  const data = await r.get(sessionId)
  if (!data) return null
  return JSON.parse(data)
}

export async function setStudentSession(sessionId: string, session: StudentSession): Promise<void> {
  const r = getRedis()
  await r.setex(sessionId, config.redis.sessionTTL, JSON.stringify(session))
}

export async function deleteStudentSession(sessionId: string): Promise<void> {
  const r = getRedis()
  await r.del(sessionId)
}

/**
 * JWT 验证中间件（管理端）
 */
export function verifyJWT(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ code: 1001, message: '未登录或 token 已过期', data: null })
      return
    }

    const token = authHeader.slice(7)
    const payload = jwt.verify(token, config.jwtSecret) as unknown as JWTPayload

    req.admin = {
      id: payload.sub,
      email: payload.email,
      role: payload.role === 'tutor' ? 'short_term_tutor' : (payload.role as 'admin' | 'short_term_tutor'),
    }

    next()
  } catch {
    res.status(401).json({ code: 1001, message: '未登录或 token 已过期', data: null })
  }
}

/**
 * 考生 Cookie Session 验证（Redis）
 */
export async function verifyStudentSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.cookies?.sessionId
  if (!sessionId) {
    res.status(401).json({ code: 1001, message: '未登录', data: null })
    return
  }

  try {
    const session = await getStudentSession(sessionId)
    if (!session) {
      res.status(401).json({ code: 1001, message: '会话已过期', data: null })
      return
    }

    req.studentSession = session
    next()
  } catch {
    res.status(401).json({ code: 1001, message: '会话无效', data: null })
  }
}
