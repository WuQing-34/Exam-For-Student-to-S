import { Router } from 'express'
import { verifyJWT } from '../../middlewares/auth'
import { assignmentModel } from '../../models/assignmentModel'
import { paperModel } from '../../models/paperModel'
import { userModel } from '../../models/userModel'
import { apiResponse, errorResponse } from '../../utils/helpers'

const router = Router()

/**
 * POST /api/admin/assignments
 * 分配试卷（单个/批量）
 */
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { paperId, studentIds, grade } = req.body

    if (!paperId) {
      res.status(400).json(errorResponse(1000, '缺少试卷ID'))
      return
    }

    // 校验试卷是否存在
    const paper = await paperModel.findById(paperId)
    if (!paper) {
      res.status(404).json(errorResponse(3001, '试卷不存在'))
      return
    }

    let targetStudentIds: number[] = []

    if (studentIds && Array.isArray(studentIds)) {
      // 指定学生 ID
      targetStudentIds = studentIds
    } else if (grade) {
      // 按年级筛选
      const { list } = await userModel.findAll({ grade, pageSize: 10000 })
      targetStudentIds = list.map(s => s.id)
    }

    if (targetStudentIds.length === 0) {
      res.status(400).json(errorResponse(1000, '未找到可分配的考生'))
      return
    }

    const result = await assignmentModel.assignPaperToStudents(paperId, targetStudentIds)
    res.json(apiResponse(result, `分配完成：成功 ${result.assigned} 条，跳过 ${result.skipped} 条（已分配）`))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/admin/assignments
 * 分配记录列表
 */
router.get('/', verifyJWT, async (req, res) => {
  try {
    const { studentId, paperId, page, pageSize } = req.query
    const result = await assignmentModel.findAll({
      studentId: parseInt(studentId as string) || undefined,
      paperId: parseInt(paperId as string) || undefined,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
    })

    res.json(apiResponse(result))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/admin/assignments/preview
 * 分配预览（不实际创建）
 */
router.get('/preview', verifyJWT, async (req, res) => {
  try {
    const { paperId, studentIds, grade } = req.query

    if (!paperId) {
      res.status(400).json(errorResponse(1000, '缺少试卷ID'))
      return
    }

    const paper = await paperModel.findById(parseInt(paperId as string))
    if (!paper) {
      res.status(404).json(errorResponse(3001, '试卷不存在'))
      return
    }

    let students: Awaited<ReturnType<typeof userModel.findAll>>['list'] = []

    if (studentIds) {
      const ids = (studentIds as string).split(',').map(Number)
      const results = await Promise.all(ids.map(id => userModel.findById(id)))
      students = results.filter(Boolean) as NonNullable<typeof results[number]>[]
    } else if (grade) {
      const result = await userModel.findAll({ grade: grade as string, pageSize: 10000 })
      students = result.list
    }

    // 检查已分配数量
    let conflictCount = 0
    for (const s of students) {
      const existing = await assignmentModel.findAll({ studentId: s.id, paperId: parseInt(paperId as string) })
      if (existing.total > 0) conflictCount++
    }

    res.json(apiResponse({ students, paper, conflictCount }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

export { router as adminAssignmentRoutes }
