import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import fs from 'fs'
import { config } from './config'
import { router } from './routes'
import { errorHandler } from './middlewares/errorHandler'
import { initDatabase, closePool } from './models/db'
import { initRedis } from './middlewares/auth'

// 确保上传目录存在
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true })
}

async function startServer() {
  // 初始化数据库（MySQL 连接池 + 建表）
  await initDatabase()

  // 初始化 Redis
  initRedis()

  const app = express()

  // 中间件
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }))
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  // 静态文件服务（上传目录）
  app.use('/uploads', express.static(config.uploadDir))

  // API 路由
  app.use('/api', router)

  // 全局错误处理
  app.use(errorHandler)

  // 启动服务器
  const server = app.listen(config.port, () => {
    const workerId = process.env.pm_id ?? 'standalone'
    console.log(`🚀 服务器运行在 http://localhost:${config.port} [Worker #${workerId}]`)
    console.log(`📁 上传目录: ${config.uploadDir}`)
  })

  // 优雅退出
  async function gracefulShutdown(signal: string) {
    console.log(`\n🛑 收到 ${signal} 信号，正在优雅退出...`)
    server.close()
    await closePool()
    process.exit(0)
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  // 捕获未处理的异常和 Promise rejection
  process.on('uncaughtException', (err) => {
    console.error('❌ 未捕获异常:', err)
    console.error(err.stack)
  })
  process.on('unhandledRejection', (reason) => {
    console.error('❌ 未处理的 Promise rejection:', reason)
  })
}

startServer().catch(err => {
  console.error('服务器启动失败:', err)
  process.exit(1)
})

export default express
