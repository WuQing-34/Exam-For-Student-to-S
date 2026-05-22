/**
 * JWT 验证中间件 + 考生 Cookie Session 验证
 */
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
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
 * 考生 Cookie Session 验证
 */
export function verifyStudentSession(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.sessionId
  if (!sessionId) {
    res.status(401).json({ code: 1001, message: '未登录', data: null })
    return
  }

  try {
    // 从内存 session store 中获取（简单实现：存储在全局变量中）
    const session = studentSessionStore.get(sessionId)
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

/**
 * 简单的内存 Session Store（生产环境应使用 Redis）
 */
export const studentSessionStore = new Map<string, {
  studentId: number
  name: string
  grade: string
  createdAt: string
}>()
