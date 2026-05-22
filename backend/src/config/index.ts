import dotenv from 'dotenv'
import path from 'path'

// 加载 .env 文件（如果存在）
dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  dataDir: process.env.DATA_DIR || path.join(__dirname, '../../data'),
  nodeEnv: process.env.NODE_ENV || 'development',
}
