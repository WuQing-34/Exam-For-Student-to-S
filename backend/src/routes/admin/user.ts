import { Router } from 'express'
import { verifyJWT } from '../../middlewares/auth'
import { upload } from '../../middlewares/upload'
import { userModel } from '../../models/userModel'
import { apiResponse, errorResponse } from '../../utils/helpers'
import * as XLSX from 'xlsx'

const router = Router()

/**
 * GET /api/admin/students
 * 考生列表（分页+筛选）v2.0: 支持 salesId 筛选
 */
router.get('/', verifyJWT, async (req, res) => {
  try {
    const admin = req.admin!
    const { grade, keyword, salesId, page, pageSize } = req.query

    // short_term_tutor 只能看到自己的学生，忽略前端传入的 salesId
    const effectiveSalesId = admin.role === 'short_term_tutor'
      ? admin.id
      : (salesId ? parseInt(salesId as string) : undefined)

    const result = await userModel.findAll({
      grade: grade as string,
      keyword: keyword as string,
      salesId: effectiveSalesId,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 50,
    })

    // 解析 subjects JSON
    const list = result.list.map(s => ({
      ...s,
      subjects: s.subjects ? (() => { try { return JSON.parse(s.subjects!) } catch { return s.subjects } })() : null,
    }))

    res.json(apiResponse({
      list,
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
 * GET /api/admin/students/my
 * 我的学生（short_term_tutor 专用）
 */
router.get('/my', verifyJWT, async (req, res) => {
  try {
    const admin = req.admin!
    if (admin.role !== 'admin' && admin.role !== 'short_term_tutor') {
      res.status(403).json(errorResponse(1002, '权限不足'))
      return
    }

    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 50

    const result = await userModel.findBySalesId(admin.id, { page, pageSize })

    const list = result.list.map(s => ({
      ...s,
      subjects: s.subjects ? (() => { try { return JSON.parse(s.subjects!) } catch { return s.subjects } })() : null,
    }))

    res.json(apiResponse({ list, total: result.total, page, pageSize }))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/admin/students
 * 单独新增考生 (v2.0: 支持 subjects/sales_id)
 */
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { name, phone, grade, subjects, salesId } = req.body
    if (!name || !phone || !grade) {
      res.status(400).json(errorResponse(1000, '缺少必填字段'))
      return
    }

    const existing = await userModel.findByNamePhone(name, phone)
    if (existing) {
      res.status(400).json(errorResponse(1000, '该考生手机号已存在'))
      return
    }

    const id = await userModel.create({
      name, phone, grade,
      subjects: subjects ? JSON.stringify(subjects) : undefined,
      sales_id: salesId ?? undefined,
    })
    const student = await userModel.findById(id)
    res.json(apiResponse(student, '创建成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/admin/students/import
 * 批量导入考生 (v2.0)
 */
router.post('/import', verifyJWT, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse(5002, '请上传文件'))
      return
    }

    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]) as unknown[]

    const GRADE_MAP: Record<string, string> = {
      '初一': 'junior1', '初二': 'junior2', '初三': 'junior3',
      'G1': 'junior1', 'G2': 'junior2', 'G3': 'junior3',
    }

    const records = (rows as Record<string, unknown>[])
      .map((row) => ({
        name: String(row['姓名'] ?? row['name'] ?? '').trim(),
        phone: String(row['手机号'] ?? row['phone'] ?? '').trim(),
        grade: String(row['年级'] ?? row['grade'] ?? '').trim(),
        subjects: String(row['科目'] ?? row['subjects'] ?? ''),
        sales_id: row['sales_id'] != null ? Number(row['sales_id']) : undefined,
      }))
      .filter(r => r.name && r.phone && r.grade)
      .map(r => ({
        ...r,
        grade: GRADE_MAP[r.grade] || r.grade,
      }))

    const result = await userModel.batchImport(records)

    res.json(apiResponse({
      success: result.success,
      failed: result.failed,
      errors: result.errors,
      ids: result.ids,
    }, `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(5001, err.message))
  }
})

/**
 * PUT /api/admin/students/:id
 * 编辑考生 (v2.0: 支持 subjects/sales_id)
 */
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { name, phone, grade, subjects, salesId } = req.body

    const existing = await userModel.findById(id)
    if (!existing) {
      res.status(404).json(errorResponse(1003, '考生不存在'))
      return
    }

    const GRADE_MAP: Record<string, string> = {
      '初一': 'junior1', '初二': 'junior2', '初三': 'junior3',
      'G1': 'junior1', 'G2': 'junior2', 'G3': 'junior3',
    }

    const normalizedGrade = GRADE_MAP[grade] || grade
    await userModel.update(id, {
      name, phone, grade: normalizedGrade,
      subjects: subjects !== undefined ? (subjects ? JSON.stringify(subjects) : '') : undefined,
      sales_id: salesId !== undefined ? salesId : undefined,
    })
    const updated = await userModel.findById(id)
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
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const existing = await userModel.findById(id)
    if (!existing) {
      res.status(404).json(errorResponse(1003, '考生不存在'))
      return
    }
    await userModel.delete(id)
    res.json(apiResponse(null, '删除成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

export { router as adminUserRoutes }
