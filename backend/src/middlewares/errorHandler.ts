import { Request, Response, NextFunction } from 'express'

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('【错误】', err.message)
  console.error(err.stack)

  const isProduction = process.env.NODE_ENV === 'production'
  res.status(500).json({
    code: 1000,
    message: isProduction ? '服务器内部错误' : '服务器内部错误：' + err.message,
    data: null,
  })
}

/**
 * 全局 404 处理
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    code: 1003,
    message: '接口不存在',
    data: null,
  })
}
