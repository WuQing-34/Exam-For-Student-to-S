import { Router } from 'express'
import { verifyJWT } from '../../middlewares/auth'
import { roleGuard } from '../../middlewares/roleGuard'
import { upload } from '../../middlewares/upload'
import { questionBankModel } from '../../models/questionBankModel'
import { apiResponse, errorResponse } from '../../utils/helpers'
import * as XLSX from 'xlsx'

const router = Router()

// 所有题库操作仅 admin 可用
router.use(verifyJWT)
router.use(roleGuard('admin'))

const VALID_SUBJECTS = ['chinese', 'math', 'english', 'physics', 'chemistry']
const VALID_TYPES = ['choice', 'fill']

// 中英文映射
const SUBJECT_MAP: Record<string, string> = {
  '语文': 'chinese', '数学': 'math', '英语': 'english', '物理': 'physics', '化学': 'chemistry',
}
const TYPE_MAP: Record<string, string> = {
  '选择题': 'choice', '填空题': 'fill',
}

/** 从 Excel 行中灵活取值（兼容含换行符的列名） */
function getField(row: Record<string, unknown>, ...keys: string[]): string {
  // 先直接匹配
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  // 再模糊匹配：去掉 key 中的换行符后比较
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.replace(/[\n\r]/g, '') === k) {
        const v = row[rk]
        if (v != null && String(v).trim()) return String(v).trim()
      }
    }
  }
  return ''
}

/**
 * GET /api/admin/question-bank
 * 题库列表（分页+筛选）
 */
router.get('/', (req, res) => {
  try {
    const { subject, type, page, pageSize } = req.query
    const result = questionBankModel.findAll({
      subject: subject as string,
      type: type as string,
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
 * GET /api/admin/question-bank/stats
 * 各科题目统计
 */
router.get('/stats', (req, res) => {
  try {
    const stats = questionBankModel.statsBySubject()
    res.json(apiResponse(stats))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/admin/question-bank
 * 添加单题
 */
router.post('/', (req, res) => {
  try {
    const { subject, type, content, options, correct_answer } = req.body

    if (!subject || !VALID_SUBJECTS.includes(subject)) {
      res.status(400).json(errorResponse(1000, '无效的科目'))
      return
    }
    if (!type || !VALID_TYPES.includes(type)) {
      res.status(400).json(errorResponse(1000, '无效的题型，仅支持 choice/fill'))
      return
    }
    if (!content || !correct_answer) {
      res.status(400).json(errorResponse(1000, '题目和答案不能为空'))
      return
    }
    if (type === 'choice' && !options) {
      res.status(400).json(errorResponse(1000, '选择题需要填写选项'))
      return
    }

    const admin = req.admin!
    const item = questionBankModel.create({
      subject, type, content,
      options: options ? JSON.stringify(options) : null,
      correct_answer,
      created_by: admin.id,
    })

    res.json(apiResponse(item, '添加成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/admin/question-bank/batch
 * 批量导入（Excel）
 */
router.post('/batch', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json(errorResponse(5002, '请上传文件'))
      return
    }

    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName])

    const admin = req.admin!
    const questions = (rows as Record<string, unknown>[])
      .map(row => {
        const subjectRaw = getField(row, '科目', 'subject')
        const typeRaw = getField(row, '题型', 'type')
        const content = getField(row, '题目', 'content')
        const optA = getField(row, '选项A', 'optionA')
        const optB = getField(row, '选项B', 'optionB')
        const optC = getField(row, '选项C', 'optionC')
        const optD = getField(row, '选项D', 'optionD')
        const correct_answer = getField(row, '答案', 'correct_answer')

        if (!subjectRaw || !typeRaw || !content || !correct_answer) return null

        const subject = SUBJECT_MAP[subjectRaw] || subjectRaw
        const type = TYPE_MAP[typeRaw] || typeRaw

        if (!VALID_SUBJECTS.includes(subject)) return null
        if (!VALID_TYPES.includes(type)) return null

        // 选择题：从四列构建 JSON 选项数组
        let options: string | null = null
        if (type === 'choice') {
          const arr: Array<{ label: string; text: string }> = []
          if (optA) arr.push({ label: 'A', text: optA })
          if (optB) arr.push({ label: 'B', text: optB })
          if (optC) arr.push({ label: 'C', text: optC })
          if (optD) arr.push({ label: 'D', text: optD })
          if (arr.length === 0) return null // 选择题至少需要选项A
          options = JSON.stringify(arr)
        }

        return {
          subject,
          type: type as 'choice' | 'fill',
          content,
          options,
          correct_answer,
          created_by: admin.id,
        }
      })
      .filter((q): q is NonNullable<typeof q> => q !== null)

    if (questions.length === 0) {
      res.status(400).json(errorResponse(1000, '没有有效的题目数据'))
      return
    }

    const count = questionBankModel.batchCreate(questions)
    res.json(apiResponse({ count }, `成功导入 ${count} 道题目`))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(5001, err.message))
  }
})

/**
 * DELETE /api/admin/question-bank/:id
 * 删除题目
 */
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id)
    questionBankModel.delete(id)
    res.json(apiResponse(null, '删除成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

export { router as adminQuestionBankRoutes }
