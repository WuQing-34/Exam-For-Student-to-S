import { QuestionType, Grade, Subject } from './index'

/**
 * 试卷相关类型
 */

// v1.1: subject 改为可选，新增多科目支持字段
export interface Paper {
  id: number
  title: string
  grade: Grade
  subject?: Subject  // 可选，新试卷可能不使用
  subjects_included?: string[]  // v1.1: 多科目
  total_full_score?: number  // v1.1: 总满分（如多科目为500）
  total_score: number  // 兼容旧数据
  total_time: number
  created_by: number
  created_at: string
}

export interface QuestionOption {
  label: string
  text: string
  image?: string  // 选项配图 URL
}

// v1.1: 新增可选 subject 字段
export interface Question {
  id: number
  paper_id: number
  type: QuestionType
  content: string
  options: QuestionOption[] | null
  correct_answer: string
  score: number
  order_num: number
  subject?: Subject  // v1.1: 题目所属科目
}

/** 预览时题目不含答案 */
export type QuestionPreview = Omit<Question, 'correct_answer'>

// v1.1: 科目分段
export interface SubjectSection {
  id: number
  paper_id: number
  subject: Subject
  subject_name: string
  subject_order: number
  total_score: number
  question_count: number
  questions?: Question[]
}
