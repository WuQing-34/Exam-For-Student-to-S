import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import fs from 'fs'
import path from 'path'
import { config } from './config'
import { router } from './routes'
import { errorHandler } from './middlewares/errorHandler'
import { initDatabase } from './models/db'

// 确保上传和数据目录存在
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true })
}

async function startServer() {
  // 初始化数据库
  await initDatabase()

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
  app.listen(config.port, () => {
    console.log(`🚀 服务器运行在 http://localhost:${config.port}`)
    console.log(`📁 上传目录: ${config.uploadDir}`)
    console.log(`🗄️  数据目录: ${config.dataDir}`)
  })
}

startServer().catch(err => {
  console.error('服务器启动失败:', err)
  process.exit(1)
})

export default express
