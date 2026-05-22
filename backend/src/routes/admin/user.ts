import { Router } from 'express'
import { verifyJWT } from '../../middlewares/auth'
import { upload } from '../../middlewares/upload'
import { userModel } from '../../models/userModel'
import { assignmentService } from '../../services/assignmentService'
import { apiResponse, errorResponse } from '../../utils/helpers'
import * as XLSX from 'xlsx'

const router = Router()

/**
 * GET /api/admin/students
 * 考生列表（分页+筛选）
 */
router.get('/', verifyJWT, (req, res) => {
  try {
    const { grade, keyword, page, pageSize } = req.query
    const result = userModel.findAll({
      grade: grade as string,
      keyword: keyword as string,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 50,
    })

    res.json(apiResponse({
      list: result.list,
      total: result.total,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 50,
    }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/admin/students
 * 单独新增考生
 */
router.post('/', verifyJWT, (req, res) => {
  try {
    const { name, phone, grade } = req.body
    if (!name || !phone || !grade) {
      res.status(400).json(errorResponse(1000, '缺少必填字段'))
      return
    }

    const existing = userModel.findByNameGradePhone(name, grade, phone)
    if (existing) {
      res.status(400).json(errorResponse(1000, '该考生已存在'))
      return
    }

    const id = userModel.create({ name, phone, grade })
    const student = userModel.findById(id)
    res.json(apiResponse(student, '创建成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/admin/students/import
 * 批量导入考生
 * v1.1: 导入成功后自动分配试卷
 */
router.post('/import', verifyJWT, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse(5002, '请上传文件'))
      return
    }

    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]) as unknown[]

    const records = (rows as Record<string, unknown>[])
      .map((row) => {
        return {
          name: String(row['姓名'] ?? row['name'] ?? '').trim(),
          phone: String(row['手机号'] ?? row['phone'] ?? '').trim(),
          grade: String(row['年级'] ?? row['grade'] ?? '').trim(),
        }
      })
      .filter(r => r.name && r.phone && r.grade)

    // v1.1: 映射中文年级到新格式，同时兼容旧格式
    const GRADE_MAP: Record<string, string> = {
      '初一': 'junior1',
      '初二': 'junior2',
      '初三': 'junior3',
      'G1': 'junior1',
      'G2': 'junior2',
      'G3': 'junior3',
    }

    const normalizedRecords = records.map(r => ({
      ...r,
      grade: GRADE_MAP[r.grade] || r.grade,
    }))

    const result = userModel.batchImport(normalizedRecords)

    // v1.1: 自动分配试卷
    const assignedResult = assignmentService.autoAssignAfterImport(result.ids)

    res.json(apiResponse({
      success: result.success,
      failed: result.failed,
      errors: result.errors,
      ids: result.ids,
      autoAssigned: assignedResult.assigned,
      autoSkipped: assignedResult.skipped,
      autoAssignWarnings: assignedResult.warnings,
    }, `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条，自动分配 ${assignedResult.assigned} 条`))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(5001, err.message))
  }
})

/**
 * PUT /api/admin/students/:id
 * 编辑考生
 */
router.put('/:id', verifyJWT, (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { name, phone, grade } = req.body

    const existing = userModel.findById(id)
    if (!existing) {
      res.status(404).json(errorResponse(1003, '考生不存在'))
      return
    }

    // v1.1: 映射中文年级到新格式
    const GRADE_MAP: Record<string, string> = {
      '初一': 'junior1',
      '初二': 'junior2',
      '初三': 'junior3',
      'G1': 'junior1',
      'G2': 'junior2',
      'G3': 'junior3',
    }

    const normalizedGrade = GRADE_MAP[grade] || grade
    userModel.update(id, { name, phone, grade: normalizedGrade })
    const updated = userModel.findById(id)
    res.json(apiResponse(updated, '更新成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * DELETE /api/admin/students/:id
 * 删除考生
 */
router.delete('/:id', verifyJWT, (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const deleted = userModel.delete(id)
    if (!deleted) {
      res.status(404).json(errorResponse(1003, '考生不存在'))
      return
    }
    res.json(apiResponse(null, '删除成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

export { router as adminUserRoutes }
