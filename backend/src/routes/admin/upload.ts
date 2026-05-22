import { Router } from 'express'
import { verifyJWT } from '../../middlewares/auth'
import { uploadImage } from '../../middlewares/upload'
import { apiResponse, errorResponse } from '../../utils/helpers'

const router = Router()

/**
 * POST /api/admin/upload-image
 * 上传题目图片（管理员）
 */
router.post('/upload-image', verifyJWT, (req, res) => {
  try {
    uploadImage.single('image')(req, res, (err) => {
      if (err) {
        res.status(400).json(errorResponse(5002, err.message))
        return
      }

      if (!req.file) {
        res.status(400).json(errorResponse(5002, '请上传图片'))
        return
      }

      // 返回可访问的图片 URL
      const imageUrl = `/uploads/${req.file.path.split('/uploads/')[1]}`

      res.json(apiResponse({
        url: imageUrl,
        filename: req.file.originalname,
        size: req.file.size,
      }, '上传成功'))
    })
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

export { router as adminUploadRoutes }
