/**
 * 格式化工具函数
 */
import { ALL_GRADE_MAP, SUBJECT_MAP } from '../types'

/**
 * 手机号脱敏：只显示后四位
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone || ''
  return '****' + phone.slice(-4)
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const sec = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${min}:${sec}`
}

/**
 * 格式化日期（不含时间）
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化分数为百分比
 */
export function formatScoreRate(score: number, total: number): string {
  if (total === 0) return '0%'
  return `${((score / total) * 100).toFixed(1)}%`
}

/**
 * 格式化时长（秒 → mm:ss）
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * 年级代码转中文（兼容新旧格式）
 */
export function gradeName(code: string): string {
  return ALL_GRADE_MAP[code] ?? code
}

/**
 * 科目代码转中文
 */
export function subjectName(code: string): string {
  return SUBJECT_MAP[code as keyof typeof SUBJECT_MAP] ?? code
}
