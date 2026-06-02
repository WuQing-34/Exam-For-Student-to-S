import dotenv from 'dotenv'
import path from 'path'

// 加载 .env 文件（如果存在）
dotenv.config()

const nodeEnv = process.env.NODE_ENV || 'development'

// 生产环境强制检查 JWT_SECRET
if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set in production')
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  nodeEnv,
  // MySQL 配置
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'exam_system',
    connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10', 10),
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4',
  },
  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_PREFIX || 'exam_session:',
    sessionTTL: 24 * 60 * 60, // 24 小时
  },
}
