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
