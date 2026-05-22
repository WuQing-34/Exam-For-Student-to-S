import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'
import fs from 'fs'

// 确保目录存在
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true })
}

// 磁盘存储配置
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date()
    const subDir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const dir = path.join(config.uploadDir, subDir)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  },
})

// 试卷文件过滤器（xlsx/xls/docx）
function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  const allowedExts = ['.xlsx', '.xls', '.docx']
  const ext = path.extname(file.originalname).toLowerCase()

  if (allowedExts.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件格式，仅支持 .xlsx .xls .docx'))
  }
}

// 图片文件过滤器
function imageFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
  const ext = path.extname(file.originalname).toLowerCase()
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']

  if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的图片格式，仅支持 jpg/png/gif/webp/bmp'))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
})

export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
})
