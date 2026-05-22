import { Request, Response, NextFunction } from 'express'

/**
 * 角色权限校验中间件
 * @param roles 允许的角色列表
 */
export function roleGuard(...roles: Array<'admin' | 'short_term_tutor'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = req.admin
    if (!admin) {
      res.status(401).json({ code: 1001, message: '未登录', data: null })
      return
    }

    if (!roles.includes(admin.role)) {
      res.status(403).json({ code: 1002, message: '权限不足', data: null })
      return
    }

    next()
  }
}
