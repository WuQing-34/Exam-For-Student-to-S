/**
 * 公共类型定义 — API响应、枚举、通用接口
 */

// ========== 枚举值 ==========
export type AdminRole = 'admin' | 'tutor'

// v1.1: 年级枚举迁移 G1/G2/G3 → junior1/junior2/junior3
export type Grade = 'junior1' | 'junior2' | 'junior3'
// 向后兼容旧数据
export type LegacyGrade = 'G1' | 'G2' | 'G3'

export type Subject = 'math' | 'chinese' | 'english' | 'physics' | 'chemistry'
export type QuestionType = 'choice' | 'fill' | 'essay'
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed'
export type ExamStatus = 'in_progress' | 'submitted' | 'graded'

// ========== 枚举中文映射 ==========
// v1.1: 更新年级映射
export const GRADE_MAP: Record<Grade, string> = {
  junior1: '初一',
  junior2: '初二',
  junior3: '初三',
}

// 向后兼容旧年级映射
export const LEGACY_GRADE_MAP: Record<LegacyGrade, string> = {
  G1: '初一',
  G2: '初二',
  G3: '初三',
}

// 合并映射（支持新旧两种格式）
export const ALL_GRADE_MAP: Record<string, string> = {
  junior1: '初一',
  junior2: '初二',
  junior3: '初三',
  G1: '初一',
  G2: '初二',
  G3: '初三',
}

export const SUBJECT_MAP: Record<Subject, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
}

export const QUESTION_TYPE_MAP: Record<QuestionType, string> = {
  choice: '选择题',
  fill: '填空题',
  essay: '简答题',
}

// v1.1: 科目顺序常量
export const SUBJECT_ORDER: Record<Subject, number> = {
  chinese: 1,
  math: 2,
  english: 3,
  physics: 4,
  chemistry: 5,
}

// v1.1: 各年级对应科目（初三额外有化学）
export const GRADE_SUBJECTS: Record<Grade, Subject[]> = {
  junior1: ['chinese', 'math', 'english', 'physics'],
  junior2: ['chinese', 'math', 'english', 'physics'],
  junior3: ['chinese', 'math', 'english', 'physics', 'chemistry'],
}

// ========== API 响应格式 ==========
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T | null
}

// ========== 分页参数 ==========
export interface PageParams {
  page?: number
  pageSize?: number
}

// ========== 分页结果 ==========
export interface PaginationResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// ========== 错误码 ==========
export const ERROR_CODES = {
  SUCCESS: 0,
  BAD_REQUEST: 1000,
  UNAUTHORIZED: 1001,
  FORBIDDEN: 1002,
  NOT_FOUND: 1003,
  STUDENT_AUTH_FAIL: 2001,
  PAPER_NOT_FOUND: 3001,
  ASSIGNMENT_EXISTS: 3002,
  EXAM_NOT_STARTED: 4001,
  EXAM_ALREADY_DONE: 4002,
  FILE_PARSE_ERROR: 5001,
  FILE_TOO_LARGE: 5002,
  // v1.1 新增错误码
  PAPER_SUBJECT_SCORE_INVALID: 5003,
  PAPER_MISSING_CHEMISTRY: 5004,
} as const

// ========== 年级转换工具 ==========
/**
 * 将旧格式年级（G1/G2/G3）转换为新格式（junior1/junior2/junior3）
 */
export function normalizeGrade(grade: string): Grade {
  const map: Record<string, Grade> = {
    G1: 'junior1',
    G2: 'junior2',
    G3: 'junior3',
  }
  return map[grade] || (grade as Grade)
}

/**
 * 获取年级显示名称（兼容新旧格式）
 */
export function getGradeDisplay(grade: string): string {
  return ALL_GRADE_MAP[grade] || grade
}

/**
 * 获取科目显示名称
 */
export function getSubjectDisplay(subject: string): string {
  return SUBJECT_MAP[subject as Subject] || subject
}
