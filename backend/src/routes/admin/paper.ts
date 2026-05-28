import { Router } from 'express'
import { verifyJWT } from '../../middlewares/auth'
import { roleGuard } from '../../middlewares/roleGuard'
import { upload } from '../../middlewares/upload'
import { getPool } from '../../models/db'
import { paperService } from '../../services/paperService'
import { assignmentService } from '../../services/assignmentService'
import { paperModel } from '../../models/paperModel'
import { apiResponse, errorResponse, normalizeOptions } from '../../utils/helpers'

const router = Router()

/**
 * PUT /api/admin/questions/:id
 * 更新题目内容及选项（含图片标记）
 */
router.put('/questions/:id', verifyJWT, roleGuard('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { content, options } = req.body

    if (!content) {
      res.status(400).json(errorResponse(1000, '题目内容不能为空'))
      return
    }

    const pool = getPool()
    const optionsJson = options != null ? JSON.stringify(options) : null
    await pool.execute(
      'UPDATE question SET content = ?, options = ? WHERE id = ?',
      [content, optionsJson, id]
    )

    res.json(apiResponse(null, '更新成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

// 保留旧路由兼容
router.put('/questions/:id/content', verifyJWT, roleGuard('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { content } = req.body

    if (!content) {
      res.status(400).json(errorResponse(1000, '题目内容不能为空'))
      return
    }

    const pool = getPool()
    await pool.execute('UPDATE question SET content = ? WHERE id = ?', [content, id])

    res.json(apiResponse(null, '更新成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/admin/papers
 * 试卷列表（分页+筛选）
 * v1.1: 移除 subject 查询参数（多科目）
 */
router.get('/', verifyJWT, async (req, res) => {
  try {
    const { grade, page, pageSize } = req.query
    const result = await paperModel.findAll({
      grade: grade as string,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    // 补充每份试卷的题目数量
    const list = await Promise.all(result.list.map(async paper => {
      const questions = await paperModel.findQuestionsByPaperId(paper.id)
      return {
        ...paper,
        questionCount: questions.length,
        subjects_included: paper.subjects_included ? JSON.parse(paper.subjects_included) : undefined,
      }
    }))

    res.json(apiResponse({
      list,
      total: result.total,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/admin/papers
 * 上传并解析试卷（仅 admin）
 * v1.1: 支持多科目，去掉 subject 参数
 */
router.post(
  '/',
  verifyJWT,
  roleGuard('admin'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json(errorResponse(5002, '请上传文件'))
        return
      }

      const { grade, title } = req.body
      if (!grade || !title) {
        res.status(400).json(errorResponse(1000, '缺少必填字段'))
        return
      }

      const admin = req.admin!

      // v1.1: 使用多科目解析
      const result = await paperService.parseAndSaveMultiSubject(req.file.path, {
        title,
        grade,
        created_by: admin.id,
      })

      // 自动分配给同年级学生
      const assignResult = await assignmentService.autoAssignNewPaper(result.paperId)

      res.json(apiResponse({
        id: result.paperId,
        title,
        subjectsIncluded: result.subjectsIncluded,
        sections: result.sections.map(s => ({
          subject: s.subject,
          subject_name: s.subject_name,
          questionCount: s.question_count,
          totalScore: s.total_score,
        })),
        autoAssigned: assignResult.count,
        autoAssignWarning: assignResult.warning,
      }, '上传成功'))
    } catch (e: unknown) {
      const err = e as Error
      res.status(400).json(errorResponse(5001, err.message))
    }
  }
)

/**
 * GET /api/admin/papers/:id
 * 试卷详情（含答案）
 * v1.1: 返回 sections
 */
router.get('/:id', verifyJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const paper = await paperModel.findById(id)
    if (!paper) {
      res.status(404).json(errorResponse(3001, '试卷不存在'))
      return
    }

    const questions = await paperModel.findQuestionsByPaperId(id)
    const sections = await paperModel.findSectionsByPaperId(id)

    // 标准化 options 格式
    const normalizedQuestions = questions.map(q => ({
      ...q,
      options: normalizeOptions(q.options),
    }))

    res.json(apiResponse({
      paper: {
        ...paper,
        subjects_included: paper.subjects_included ? JSON.parse(paper.subjects_included) : undefined,
      },
      questions: normalizedQuestions,
      sections,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/admin/papers/:id/preview
 * 预览试卷（不含答案）
 */
router.get('/:id/preview', verifyJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const paper = await paperModel.findById(id)
    if (!paper) {
      res.status(404).json(errorResponse(3001, '试卷不存在'))
      return
    }

    const questions = await paperModel.findQuestionsByPaperId(id)
    const sections = await paperModel.findSectionsByPaperId(id)

    // 移除 correct_answer 字段，并标准化 options
    const questionsWithoutAnswer = questions.map(({ correct_answer: _, options, ...q }) => ({
      ...q,
      options: normalizeOptions(options),
    }))

    res.json(apiResponse({
      paper: {
        ...paper,
        subjects_included: paper.subjects_included ? JSON.parse(paper.subjects_included) : undefined,
      },
      questions: questionsWithoutAnswer,
      sections,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * DELETE /api/admin/papers/batch
 * 批量删除试卷（仅 admin）
 */
router.delete('/batch', verifyJWT, roleGuard('admin'), async (req, res) => {
  try {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json(errorResponse(1000, '请提供要删除的试卷ID列表'))
      return
    }
    const count = await paperModel.batchDelete(ids)
    res.json(apiResponse({ count }, `成功删除 ${count} 份试卷`))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * DELETE /api/admin/papers/:id
 * 删除试卷（仅 admin）
 */
router.delete('/:id', verifyJWT, roleGuard('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const deleted = await paperModel.delete(id)
    if (!deleted) {
      res.status(404).json(errorResponse(3001, '试卷不存在'))
      return
    }
    res.json(apiResponse(null, '删除成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

export { router as adminPaperRoutes }
