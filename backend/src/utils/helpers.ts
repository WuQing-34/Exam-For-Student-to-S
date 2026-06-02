/**
 * 通用工具函数
 */

/**
 * 构造统一 API 响应
 */
export function apiResponse<T>(
  data: T,
  message = '操作成功',
  code = 0
): { code: number; message: string; data: T | null } {
  return { code, message, data }
}

/**
 * 构造错误 API 响应
 */
export function errorResponse(
  code: number,
  message: string
): { code: number; message: string; data: null } {
  return { code, message, data: null }
}

/**
 * 生成固定位数字符串（前面补0）
 */
export function padNumber(num: number, length = 2): string {
  return String(num).padStart(length, '0')
}

/**
 * 计算得分率
 */
export function calcScoreRate(score: number, total: number): number {
  if (total === 0) return 0
  return Math.round((score / total) * 100 * 10) / 10
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = padNumber(d.getMonth() + 1)
  const day = padNumber(d.getDate())
  const hour = padNumber(d.getHours())
  const min = padNumber(d.getMinutes())
  const sec = padNumber(d.getSeconds())
  return `${year}-${month}-${day} ${hour}:${min}:${sec}`
}

/**
 * 计算考试时长（秒）
 */
export function calcDuration(startedAt: string | null, submittedAt: string | null): number {
  if (!startedAt || !submittedAt) return 0
  const start = new Date(startedAt).getTime()
  const end = new Date(submittedAt).getTime()
  return Math.round((end - start) / 1000)
}

/**
 * 格式化时长（秒 → mm:ss 或 hh:mm:ss）
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${padNumber(h)}:${padNumber(m)}:${padNumber(s)}`
  }
  return `${padNumber(m)}:${padNumber(s)}`
}

/**
 * 标准化选项格式：统一转为 [{ label, text, image? }]
 * 支持两种输入：
 *   - 字符串数组: ["A. xxx", "B. yyy"] → [{ label: "A", text: "xxx" }]
 *   - 对象数组:   [{ label: "A", text: "xxx" }] → 直接返回
 */
export interface NormalizedOption {
  label: string
  text: string
  image?: string
}

export function normalizeOptions(raw: unknown): NormalizedOption[] | null {
  if (!raw) return null

  let parsed: unknown = raw
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { return null }
  }

  if (!Array.isArray(parsed)) return null

  return parsed.map((item: unknown) => {
    // 对象格式：{ label, text, image? }
    if (typeof item === 'object' && item !== null && 'label' in (item as Record<string, unknown>)) {
      const obj = item as Record<string, unknown>
      return {
        label: String(obj.label || ''),
        text: String(obj.text || ''),
        image: obj.image ? String(obj.image) : undefined,
      }
    }
    // 字符串格式："A. xxx" 或 "A. xxx ![](image.png)"
    if (typeof item === 'string') {
      const match = item.match(/^([A-D])\s*[.．、]\s*(.+)/)
      if (match) {
        const textPart = match[2].trim()
        // 提取 markdown 图片: ![](url)
        const imgMatch = textPart.match(/!\[\]\(([^)]+)\)/)
        return {
          label: match[1],
          text: imgMatch ? textPart.replace(imgMatch[0], '').trim() : textPart,
          image: imgMatch ? imgMatch[1] : undefined,
        }
      }
      // 无前缀，整串当 text
      return { label: '', text: item }
    }
    return { label: '', text: String(item) }
  })
}

// ==================== 判分相关工具函数 ====================

/**
 * 序号前缀正则：匹配 1. ② (1) ① 等前缀
 * 覆盖：阿拉伯数字序号、带圈数字、括号序号、中文序号
 */
const ORDER_PREFIX_RE = /^\s*[(【]?\s*(?:\d+|[①-⑳]|[一二三四五六七八九十])\s*[.)、】\]]\s*/g

/**
 * 统一分隔符正则：空格、逗号（中英文）、顿号、分号、斜杠
 */
const SPLIT_RE = /\s*[,，、;；/\/]\s*|\s+/g

/**
 * 标准化多空题答案
 * 将各种格式的学生答案统一为排序后的答案数组
 *
 * 支持的输入格式：
 * - 空格分隔：`答案1 答案2 答案3`
 * - 中文顿号：`答案1、答案2、答案3`
 * - 写序号：`1.答案1 2.答案2` 或 `①答案1 ②答案2`
 * - 英文逗号：`answer1, answer2, answer3`
 * - 斜杠分隔：`答案1/答案2`
 *
 * @param answer 原始答案字符串
 * @returns 排序后的标准化答案数组（小写、去空白）
 */
export function normalizeAnswer(answer: string): string[] {
  if (!answer || !answer.trim()) return []

  // 去除所有序号前缀
  let cleaned = answer.replace(ORDER_PREFIX_RE, ' ')

  // 按统一分隔符拆分
  const parts = cleaned.split(SPLIT_RE)

  // 过滤空项，去首尾空白，转小写
  const normalized = parts
    .map(p => p.trim().toLowerCase())
    .filter(p => p.length > 0)

  // 排序后返回（消除顺序差异）
  return [...normalized].sort()
}

/**
 * 计算两个字符串的 Levenshtein 编辑距离
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // 删除
          dp[i][j - 1] + 1,     // 插入
          dp[i - 1][j - 1] + 1  // 替换
        )
      }
    }
  }
  return dp[m][n]
}

/**
 * 计算两个字符串的相似度（基于编辑距离）
 * 返回 0~1 的值，1 表示完全相同
 */
function similarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

/**
 * 从字符串中提取关键词（去除常见停用词和标点后，保留有意义的词/短语）
 */
function extractKeywords(text: string): string[] {
  // 去除标点符号和空白
  const cleaned = text.replace(/[，。！？、；：""''（）【】《》\s,.!?;:\(\)\[\]]/g, '')
  if (!cleaned) return []
  // 按常见词语边界拆分（简单方案：按2字以上连续字符作为候选词）
  // 对于简短答案，直接整体作为关键词
  if (cleaned.length <= 8) return [cleaned.toLowerCase()]
  // 较长文本按长度4-6的窗口提取
  const keywords: string[] = []
  const step = Math.max(Math.floor(cleaned.length / 5), 2)
  for (let i = 0; i < cleaned.length; i += step) {
    const chunk = cleaned.slice(i, Math.min(i + 6, cleaned.length)).toLowerCase()
    if (chunk.length >= 2) keywords.push(chunk)
  }
  return keywords
}

/**
 * 语义模糊匹配：用于主观题/阅读理解题
 * "意思相近就算对"
 *
 * 匹配策略（按优先级）：
 * 1. 关键词覆盖率 >= 70% → 通过
 * 2. 整体相似度 >= 65% → 通过
 * 3. 学生答案包含标准答案的核心关键词（>=80%）→ 通过
 *
 * @param studentAnswer 学生答案
 * @param correctAnswer 标准答案
 * @returns 是否匹配
 */
export function isSemanticMatch(studentAnswer: string, correctAnswer: string): boolean {
  const sa = studentAnswer.trim().toLowerCase()
  const ca = correctAnswer.trim().toLowerCase()

  if (!sa || !ca) return false

  // 完全相同
  if (sa === ca) return true

  // 去除标点和空白后比较
  const saClean = sa.replace(/[，。！？、；：""''（）【】《》\s,.!?;:\(\)\[\]\/]/g, '')
  const caClean = ca.replace(/[，。！？、；：""''（）【】《》\s,.!?;:\(\)\[\]\/]/g, '')

  if (saClean === caClean) return true
  if (!saClean || !caClean) return false

  // 整体相似度 >= 65%
  const sim = similarity(saClean, caClean)
  if (sim >= 0.65) return true

  // 关键词覆盖检查
  const studentKeywords = extractKeywords(sa)
  const correctKeywords = extractKeywords(ca)

  if (correctKeywords.length === 0) return sim >= 0.5

  // 检查标准答案的关键词有多少出现在学生答案中
  let matchedCount = 0
  for (const ck of correctKeywords) {
    if (studentKeywords.some(sk => sk.includes(ck) || ck.includes(sk))) {
      matchedCount++
    }
  }
  const coverage = matchedCount / correctKeywords.length
  if (coverage >= 0.7) return true

  // 反向检查：学生答案的核心内容是否被标准答案覆盖
  if (studentKeywords.length > 0) {
    let reverseMatched = 0
    for (const sk of studentKeywords) {
      if (correctKeywords.some(ck => sk.includes(ck) || ck.includes(sk))) {
        reverseMatched++
      }
    }
    if (reverseMatched / studentKeywords.length >= 0.8 && coverage >= 0.5) return true
  }

  return false
}

/**
 * 需要语义模糊匹配的题目 ID 集合（语文主观题/阅读理解）
 * 新初二语文第4题(id=36)、第8题(id=40)，以及 paper_id=6 的同类题目
 */
export const SEMANTIC_MATCH_QUESTION_IDS: Set<number> = new Set([
  36,   // 新初二语文(paper_id=5) 第4题 - 名著阅读批注填空
  40,   // 新初二语文(paper_id=5) 第8题 - 现代文阅读填表
])

/**
 * 比较学生答案与标准答案是否匹配
 *
 * @param studentAnswer 学生提交的原始答案
 * @param correctAnswer 标准答案
 * @param questionId 题目ID（用于判断是否需要特殊匹配策略）
 * @param questionType 题目类型（choice/fill_blank/fill 等）
 * @param isSingleBlank 是否是多空题中的单个空格比较（已从外部拆分好，不再走多空逻辑）
 * @returns 是否正确
 */
export function compareAnswers(
  studentAnswer: string,
  correctAnswer: string,
  questionId: number,
  questionType?: string,
  isSingleBlank = false
): boolean {
  const sa = (studentAnswer ?? '').trim()
  const ca = (correctAnswer ?? '').trim()

  // 两边都为空
  if (!sa && !ca) return true
  if (!sa || !ca) return false

  // ========== 选择题：精确匹配 ==========
  if (questionType === 'choice') {
    return sa.toLowerCase() === ca.toLowerCase()
  }

  // ========== 语文主观题：语义模糊匹配 ==========
  if (SEMANTIC_MATCH_QUESTION_IDS.has(questionId)) {
    return isSemanticMatch(sa, ca)
  }

  // ========== 单空比较（多空题已在外部拆分）：直接精确匹配，不走多项拆分 ==========
  if (isSingleBlank) {
    // 去除首尾空白、忽略大小写、忽略全角/半角空格
    const saClean = sa.toLowerCase().replace(/\s+/g, '')
    // 支持括号内多选答案："在水一方（在水之湄/在水之涘）" → 任一匹配即对
    const candidates = parseMultiChoiceBlank(ca)
    return candidates.some(c => saClean === c.toLowerCase().replace(/\s+/g, ''))
  }

  // ========== 单空题 / 整体答案比较：格式宽容化比较 ==========
  // 先尝试标准化后精确匹配
  const studentNormalized = normalizeAnswer(sa)
  const correctNormalized = normalizeAnswer(ca)

  // 如果两边都能拆分为多个部分（多空题），逐项比较
  if (studentNormalized.length > 0 && correctNormalized.length > 0) {
    // 如果拆分数量相同且每项都匹配（顺序一致）
    if (studentNormalized.length === correctNormalized.length) {
      const allMatch = studentNormalized.every((s, i) => s === correctNormalized[i])
      if (allMatch) return true
    }
    // 如果是集合关系（允许顺序不同）：精确匹配，不用 includes（避免 '4或12'.includes('1') = true）
    if (studentNormalized.length === correctNormalized.length) {
      const allCovered = studentNormalized.every(s =>
        correctNormalized.some(c => c === s)
      )
      if (allCovered) return true
    }
  }

  // 兜底：去除空白后做大小写不敏感比较
  const saSimple = sa.toLowerCase().replace(/\s+/g, '')
  const caSimple = ca.toLowerCase().replace(/\s+/g, '')
  if (saSimple === caSimple) return true

  // 最终兜底：完全一致
  return sa === ca
}

// 匹配圆圈序号 ①②③④⑤⑥⑦⑧⑨⑩⑪…⑳ 以及 ㉑㉒…
const CIRCLE_NUM_RE = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕]/g

/**
 * 将圆圈序号分隔的答案字符串拆分成数组
 * 例："①万里赴戎机 ②关山度若飞" → ["万里赴戎机", "关山度若飞"]
 */
export function splitCircleAnswer(answer: string): string[] {
  // 找到第一个圆圈位置，若没有则返回整体
  if (!CIRCLE_NUM_RE.test(answer)) return [answer.trim()]
  CIRCLE_NUM_RE.lastIndex = 0
  // 按圆圈序号切割
  const parts = answer.split(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕]/)
  // 第一段可能是空字符串（序号在最前），过滤掉
  return parts.map(s => s.trim()).filter(s => s.length > 0)
}

/**
 * 将 / 分隔的答案字符串拆分成数组
 * 例："雅/兴" → ["雅", "兴"]
 */
export function splitSlashAnswer(answer: string): string[] {
  const parts = answer.split('/').map(s => s.trim()).filter(s => s.length > 0)
  return parts.length > 0 ? parts : [answer.trim()]
}

/**
 * 解析一个空中多个可接受答案的格式（括号内为可选答案）
 * 例："在水一方（在水之湄/在水之涘）" → ["在水一方", "在水之湄", "在水之涘"]
 * 例："A（a/B）" → ["A", "a", "B"]
 * 无括号时返回原答案单元素数组
 */
export function parseMultiChoiceBlank(answer: string): string[] {
  const ca = (answer ?? '').trim()
  if (!ca) return []
  // 全角括号（...）优先，再尝试半角括号 (...)
  let match = ca.match(/^(.+?)（(.+?)）$/)
  if (!match) {
    match = ca.match(/^(.+?)\((.+?)\)$/)
  }
  if (!match) return [ca]
  const prefix = match[1].trim()
  const options = match[2].split('/').map(s => s.trim()).filter(s => s.length > 0)
  return prefix ? [prefix, ...options] : options
}

/**
 * 计算填空题的空格数量
 * 支持：
 *   1. correct_answer 是 JSON 数组 → 数组长度
 *   2. correct_answer 包含圆圈序号 ①②③… → 序号数量
 *   3. correct_answer 包含 / 分隔（无圆圈序号时）→ 分隔数量
 *   4. 其他 → 1
 */
export function getBlankCount(correctAnswer: string | null | undefined): number {
  if (!correctAnswer) return 1
  // 1. JSON 数组
  try {
    const parsed = JSON.parse(correctAnswer)
    if (Array.isArray(parsed) && parsed.length > 1) return parsed.length
  } catch { /* not JSON */ }
  // 2. / 分隔格式（如 雅/兴、⑧/④/①/⑨、平衡/2/4）
  if (correctAnswer.includes('/')) {
    const parts = splitSlashAnswer(correctAnswer)
    if (parts.length > 1) return parts.length
  }
  // 3. 圆圈序号
  CIRCLE_NUM_RE.lastIndex = 0
  const matches = correctAnswer.match(CIRCLE_NUM_RE)
  if (matches && matches.length > 1) return matches.length
  return 1
}
