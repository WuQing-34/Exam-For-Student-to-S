import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import path from 'path'
import fs from 'fs'
import { paperModel, QuestionOption } from '../models/paperModel'
import { getDb, saveDatabase } from '../models/db'

export interface ParsedQuestion {
  type: 'choice' | 'fill' | 'essay'
  content: string
  options: QuestionOption[] | null
  correct_answer: string
  score: number
  order_num: number
  subject?: string  // v1.1: 题目所属科目
}

// v1.1: 科目映射常量
const SUBJECT_NAME_MAP: Record<string, string> = {
  '语文': 'chinese',
  '数学': 'math',
  '英语': 'english',
  '物理': 'physics',
  '化学': 'chemistry',
}

const SUBJECT_DISPLAY_MAP: Record<string, string> = {
  chinese: '语文',
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
}

const SUBJECT_ORDER_MAP: Record<string, number> = {
  chinese: 1,
  math: 2,
  english: 3,
  physics: 4,
  chemistry: 5,
}

const GRADE_SUBJECTS: Record<string, string[]> = {
  junior1: ['chinese', 'math', 'english', 'physics'],
  junior2: ['chinese', 'math', 'english', 'physics'],
  junior3: ['chinese', 'math', 'english', 'physics', 'chemistry'],
}

// v1.1: 科目分段数据
export interface SubjectSectionData {
  subject: string
  subject_name: string
  subject_order: number
  total_score: number
  question_count: number
  questions: ParsedQuestion[]
}

export const paperService = {
  /**
   * 解析 Excel 文件（单科目兼容）
   * 格式：题号 | 题型 | 题目内容 | 选项A | 选项B | 选项C | 选项D | 正确答案 | 分值
   */
  parseExcel(buffer: Buffer): ParsedQuestion[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

    const questions: ParsedQuestion[] = []

    // 跳过标题行，从第2行开始
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const num = String(row[0] ?? '').trim()
      const typeRaw = String(row[1] ?? '').trim()
      const content = String(row[2] ?? '').trim()
      const optA = String(row[3] ?? '').trim()
      const optB = String(row[4] ?? '').trim()
      const optC = String(row[5] ?? '').trim()
      const optD = String(row[6] ?? '').trim()
      const correctAnswer = String(row[7] ?? '').trim()
      const scoreStr = String(row[8] ?? '5').trim()

      if (!content) continue

      const qType = this.detectQuestionType(typeRaw, optA, optB, optC, optD)
      const score = parseInt(scoreStr, 10) || 5

      const options: QuestionOption[] | null =
        qType === 'choice'
          ? [
              { label: 'A', text: optA },
              { label: 'B', text: optB },
              { label: 'C', text: optC },
              { label: 'D', text: optD },
            ]
          : null

      questions.push({
        type: qType,
        content,
        options,
        correct_answer: correctAnswer,
        score,
        order_num: i, // 从1开始
      })
    }

    return questions
  },

  /**
   * v1.1: 解析多 Sheet Excel 文件
   * 返回 Map<科目, 题目列表>
   */
  parseMultiSheetExcel(buffer: Buffer): Map<string, ParsedQuestion[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const subjectQuestions = new Map<string, ParsedQuestion[]>()

    // 识别科目 Sheet（名称匹配）
    const subjectSheetNames = workbook.SheetNames.filter(name => {
      const trimmed = name.trim()
      return Object.keys(SUBJECT_NAME_MAP).includes(trimmed) ||
             Object.values(SUBJECT_NAME_MAP).includes(trimmed)
    })

    if (subjectSheetNames.length > 0) {
      // 多科目格式
      for (      const sheetName of subjectSheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

        const questions: ParsedQuestion[] = []
        let globalOrder = 0

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length === 0) continue

          const typeRaw = String(row[1] ?? '').trim()
          const content = String(row[2] ?? '').trim()
          const optA = String(row[3] ?? '').trim()
          const optB = String(row[4] ?? '').trim()
          const optC = String(row[5] ?? '').trim()
          const optD = String(row[6] ?? '').trim()
          const correctAnswer = String(row[7] ?? '').trim()
          const scoreStr = String(row[8] ?? '5').trim()

          if (!content) continue

          const qType = this.detectQuestionType(typeRaw, optA, optB, optC, optD)
          const score = parseInt(scoreStr, 10) || 5

          const options: QuestionOption[] | null =
            qType === 'choice'
              ? [
                  { label: 'A', text: optA },
                  { label: 'B', text: optB },
                  { label: 'C', text: optC },
                  { label: 'D', text: optD },
                ]
              : null

          globalOrder++
          questions.push({
            type: qType,
            content,
            options,
            correct_answer: correctAnswer,
            score,
            order_num: globalOrder,
            subject: SUBJECT_NAME_MAP[sheetName] || sheetName,
          })
        }

        if (questions.length > 0) {
          const subjectKey = SUBJECT_NAME_MAP[sheetName] || sheetName
          subjectQuestions.set(subjectKey, questions)
        }
      }
    } else {
      // 单科目格式（兼容旧版）
      const questions = this.parseExcel(buffer)
      subjectQuestions.set('default', questions)
    }

    return subjectQuestions
  },

  /**
   * 解析 Word 文件（DOCX）
   */
  async parseWord(buffer: Buffer): Promise<ParsedQuestion[]> {
    const textResult = await mammoth.extractRawText({ buffer })
    const text = textResult.value

    const htmlResult = await mammoth.convertToHtml({ buffer })
    const html = htmlResult.value

    return this.parseWordFromHTML(html, text)
  },

  /**
   * v1.1: 解析多科目 Word 文件
   */
  async parseWordMultiSubject(buffer: Buffer): Promise<Map<string, ParsedQuestion[]>> {
    const textResult = await mammoth.extractRawText({ buffer })
    const text = textResult.value

    const htmlResult = await mammoth.convertToHtml({ buffer })
    const html = htmlResult.value

    const subjectQuestions = new Map<string, ParsedQuestion[]>()

    // 识别科目标题行
    const subjectPattern = /#\s*(语文|数学|英语|物理|化学)[（(]满分\d+分[))]/
    const lines = html.replace(/<[^>]+>/g, '\n').split(/\n+/)

    let currentSubject: string | null = null
    let currentQuestions: ParsedQuestion[] = []
    let globalOrder = 0

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // 检测科目标题行
      const match = trimmed.match(subjectPattern)
      if (match) {
        // 保存上一科的题目
        if (currentSubject && currentQuestions.length > 0) {
          subjectQuestions.set(currentSubject, currentQuestions)
        }
        currentSubject = SUBJECT_NAME_MAP[match[1]] || match[1]
        currentQuestions = []
        globalOrder = 0
        continue
      }

      // 解析题目
      if (/^第?\s*\d+\s*题/.test(trimmed) || /^(选择题|填空题|简答题)/.test(trimmed)) {
        globalOrder++
        const qType = this.detectQuestionTypeFromContent([trimmed])
        const scoreMatch = trimmed.match(/分值[：:]\s*(\d+)/)
        const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 5
        const answerMatch = trimmed.match(/答案[：:]\s*([A-Da-d\d]+)/)
        const answer = answerMatch ? answerMatch[1].toUpperCase() : ''

        // 提取选项
        const options: QuestionOption[] | null = /[A-D][.．、]/.test(trimmed)
          ? [
              { label: 'A', text: this.extractOption(trimmed, 'A') },
              { label: 'B', text: this.extractOption(trimmed, 'B') },
              { label: 'C', text: this.extractOption(trimmed, 'C') },
              { label: 'D', text: this.extractOption(trimmed, 'D') },
            ]
          : null

        // 清理内容
        const content = trimmed
          .replace(/答案[：:]\s*[A-Da-d\d]+/g, '')
          .replace(/分值[：:]\s*\d+/g, '')
          .trim()

        currentQuestions.push({
          type: qType,
          content,
          options,
          correct_answer: answer,
          score,
          order_num: globalOrder,
          subject: currentSubject || undefined,
        })
      }
    }

    // 保存最后一科
    if (currentSubject && currentQuestions.length > 0) {
      subjectQuestions.set(currentSubject, currentQuestions)
    }

    // 如果没有解析到多科目，返回单科目格式
    if (subjectQuestions.size === 0) {
      const singleQuestions = await this.parseWord(buffer)
      subjectQuestions.set('default', singleQuestions)
    }

    return subjectQuestions
  },

  /**
   * 从 HTML 内容解析 Word 试卷
   */
  parseWordFromHTML(html: string, text: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = []
    const paragraphs = html
      .replace(/<[^>]+>/g, '\n')
      .split(/\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0)

    let orderNum = 0
    let currentQuestion: Partial<ParsedQuestion> | null = null
    const lines: string[] = []

    for (const line of paragraphs) {
      if (/^第?\s*\d+\s*题/.test(line) || /^(选择题|填空题|简答题)/.test(line)) {
        if (currentQuestion && currentQuestion.content) {
          orderNum++
          questions.push({
            type: currentQuestion.type || this.detectQuestionTypeFromContent(lines),
            content: currentQuestion.content,
            options: currentQuestion.options || null,
            correct_answer: currentQuestion.correct_answer || '',
            score: currentQuestion.score || 5,
            order_num: orderNum,
          })
          currentQuestion = null
          lines.length = 0
        }

        currentQuestion = { content: '' }
      }

      if (currentQuestion) {
        lines.push(line)
        currentQuestion.content = (currentQuestion.content || '') + line + ' '
      }
    }

    if (currentQuestion && currentQuestion.content) {
      orderNum++
      questions.push({
        type: currentQuestion.type || this.detectQuestionTypeFromContent(lines),
        content: currentQuestion.content,
        options: currentQuestion.options || null,
        correct_answer: currentQuestion.correct_answer || '',
        score: currentQuestion.score || 5,
        order_num: orderNum,
      })
    }

    if (questions.length === 0) {
      return this.parseWordSimple(text)
    }

    return questions
  },

  /**
   * 简单的纯文本解析（fallback）
   */
  parseWordSimple(text: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = []
    const blocks = text.split(/\n\n+/)

    let orderNum = 0
    for (const block of blocks) {
      const trimmed = block.trim()
      if (trimmed.length < 5) continue

      const hasOptions =
        /[A-D][.．、]/.test(trimmed) || (trimmed.match(/[A-D][.．、]/g) || []).length >= 2

      const qType = hasOptions ? 'choice' : trimmed.length > 100 ? 'essay' : 'fill'

      const options: QuestionOption[] | null = hasOptions
        ? [
            { label: 'A', text: this.extractOption(trimmed, 'A') },
            { label: 'B', text: this.extractOption(trimmed, 'B') },
            { label: 'C', text: this.extractOption(trimmed, 'C') },
            { label: 'D', text: this.extractOption(trimmed, 'D') },
          ]
        : null

      const answerMatch = trimmed.match(/答案[：:]\s*([A-Da-d\d]+)/)
      const scoreMatch = trimmed.match(/分值[：:]\s*(\d+)/)
      const answer = answerMatch ? answerMatch[1].toUpperCase() : ''
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 5

      const content = trimmed
        .replace(/答案[：:]\s*[A-Da-d\d]+/g, '')
        .replace(/分值[：:]\s*\d+/g, '')
        .trim()

      orderNum++
      questions.push({
        type: qType,
        content,
        options,
        correct_answer: answer,
        score,
        order_num: orderNum,
      })
    }

    return questions
  },

  /**
   * 提取选项内容
   */
  extractOption(text: string, label: string): string {
    const regex = new RegExp(`${label}[.．、]\\s*([^A-D\\n]+)`, 'i')
    const match = text.match(regex)
    return match ? match[1].trim() : ''
  },

  /**
   * 自动识别题型
   */
  detectQuestionType(
    typeRaw: string,
    optA: string,
    optB: string,
    optC: string,
    optD: string
  ): 'choice' | 'fill' | 'essay' {
    const lower = typeRaw.toLowerCase()
    if (lower.includes('选择')) return 'choice'
    if (lower.includes('填空')) return 'fill'
    if (lower.includes('简答') || lower.includes('论述') || lower.includes('解答'))
      return 'essay'

    const hasOptions = optA && optB && (optC || optD)
    if (hasOptions) return 'choice'

    return 'fill'
  },

  /**
   * 根据内容判断题型
   */
  detectQuestionTypeFromContent(lines: string[]): 'choice' | 'fill' | 'essay' {
    const combined = lines.join(' ')
    const hasOptions = /[A-D][.．、]/.test(combined)
    if (hasOptions) return 'choice'
    if (combined.length > 100) return 'essay'
    return 'fill'
  },

  /**
   * v1.1: 解析并保存多科目试卷
   */
  async parseAndSaveMultiSubject(
    filePath: string,
    metadata: {
      title: string
      grade: string
      created_by: number
    }
  ): Promise<{ paperId: number; subjectsIncluded: string[]; sections: SubjectSectionData[] }> {
    const ext = path.extname(filePath).toLowerCase()
    let subjectQuestions: Map<string, ParsedQuestion[]>

    if (ext === '.xlsx' || ext === '.xls') {
      const buffer = fs.readFileSync(filePath)
      subjectQuestions = this.parseMultiSheetExcel(buffer)
    } else if (ext === '.docx') {
      const buffer = fs.readFileSync(filePath)
      subjectQuestions = await this.parseWordMultiSubject(buffer)
    } else {
      throw new Error('不支持的文件格式')
    }

    if (subjectQuestions.size === 0) {
      throw new Error('未能解析出任何题目，请检查文件格式')
    }

    // 获取年级对应的预期科目
    const expectedSubjects = GRADE_SUBJECTS[metadata.grade] || ['chinese', 'math', 'english', 'physics']
    const actualSubjects = Array.from(subjectQuestions.keys()).filter(s => s !== 'default')

    // 校验初三必须有化学
    if (metadata.grade === 'junior3' && !actualSubjects.includes('chemistry')) {
      throw new Error('初三试卷必须包含化学科目')
    }

    // 计算总分和验证每科满分
    let totalScore = 0
    const sections: SubjectSectionData[] = []

    for (const [subject, questions] of subjectQuestions) {
      if (subject === 'default') continue

      const subjectScore = questions.reduce((sum, q) => sum + q.score, 0)
      if (subjectScore !== 100) {
        throw new Error(`${SUBJECT_DISPLAY_MAP[subject] || subject} 科目的总分必须为100分，当前为${subjectScore}分`)
      }

      totalScore += subjectScore
      sections.push({
        subject,
        subject_name: SUBJECT_DISPLAY_MAP[subject] || subject,
        subject_order: SUBJECT_ORDER_MAP[subject] || 0,
        total_score: subjectScore,
        question_count: questions.length,
        questions,
      })
    }

    // 如果是单科目格式（没有识别到多科目），使用默认科目
    if (sections.length === 0) {
      const defaultQuestions = subjectQuestions.get('default') || []
      const defaultScore = defaultQuestions.reduce((sum, q) => sum + q.score, 0)
      totalScore = defaultScore
      sections.push({
        subject: 'chinese',
        subject_name: '语文',
        subject_order: 1,
        total_score: defaultScore,
        question_count: defaultQuestions.length,
        questions: defaultQuestions,
      })
    }

    // 按科目顺序排序
    sections.sort((a, b) => a.subject_order - b.subject_order)

    // 创建试卷
    const paperId = paperModel.create({
      title: metadata.title,
      grade: metadata.grade,
      subject: 'multi',  // 标记为多科目
      total_score: totalScore,
      subjects_included: JSON.stringify(sections.map(s => s.subject)),
      total_full_score: sections.length * 100,
      created_by: metadata.created_by,
    })

    // 保存科目分段和题目
    const db = getDb()
    for (const section of sections) {
      // 创建科目分段
      const sectionId = paperModel.createSubjectSection({
        paper_id: paperId,
        subject: section.subject,
        subject_name: section.subject_name,
        subject_order: section.subject_order,
        total_score: section.total_score,
        question_count: section.question_count,
      })

      // 保存题目
      const questionsToSave = section.questions.map(q => ({
        type: q.type,
        content: q.content,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer,
        score: q.score,
        order_num: q.order_num,
        subject: q.subject,
      }))

      paperModel.createQuestionsBatch(paperId, questionsToSave)
    }

    saveDatabase()

    return {
      paperId,
      subjectsIncluded: sections.map(s => s.subject),
      sections,
    }
  },

  /**
   * 解析并保存试卷（兼容单科目旧格式）
   */
  async parseAndSave(
    filePath: string,
    metadata: {
      title: string
      grade: string
      subject: string
      created_by: number
    }
  ): Promise<{ paperId: number; questionCount: number; totalScore: number }> {
    const ext = path.extname(filePath).toLowerCase()
    let questions: ParsedQuestion[]

    if (ext === '.xlsx' || ext === '.xls') {
      const buffer = fs.readFileSync(filePath)
      questions = this.parseExcel(buffer)
    } else if (ext === '.docx') {
      const buffer = fs.readFileSync(filePath)
      questions = await this.parseWord(buffer)
    } else {
      throw new Error('不支持的文件格式')
    }

    if (questions.length === 0) {
      throw new Error('未能解析出任何题目，请检查文件格式')
    }

    // 添加科目字段
    questions = questions.map(q => ({ ...q, subject: metadata.subject }))

    const totalScore = questions.reduce((sum, q) => sum + q.score, 0)

    const paperId = paperModel.create({
      title: metadata.title,
      grade: metadata.grade,
      subject: metadata.subject,
      total_score: totalScore,
      created_by: metadata.created_by,
    })

    paperModel.createQuestionsBatch(
      paperId,
      questions.map(q => ({
        type: q.type,
        content: q.content,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer,
        score: q.score,
        order_num: q.order_num,
        subject: q.subject,
      }))
    )

    return { paperId, questionCount: questions.length, totalScore }
  },
}
