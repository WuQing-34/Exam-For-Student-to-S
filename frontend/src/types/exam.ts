import { AssignmentStatus, ExamStatus, Grade, Subject } from './index'
import type { Question } from './paper'

/**
 * 考试相关类型
 */

// 分配记录
export interface Assignment {
  id: number
  student_id: number
  paper_id: number
  status: AssignmentStatus
  assigned_at: string
}

// 考生视角的分配（含试卷信息）
// v1.1: paper_subject 改为可选
export interface AssignmentWithPaper extends Assignment {
  paper_title: string
  paper_subject?: Subject
  paper_grade: Grade
  paper_total_score: number
}

// 考试记录
export interface ExamRecord {
  id: number
  assignment_id: number
  answers: Answer[] | null
  score: number | null
  status: ExamStatus
  started_at: string | null
  submitted_at: string | null
}

// 单个答案
export interface Answer {
  questionId: number
  answer: string
}

// 考试数据（管理端用）
// v1.1: paper_subject 改为可选，新增分数字段
export interface ExamRecordDetail {
  id: number
  student_name: string
  student_grade: Grade
  student_phone: string
  paper_title: string
  paper_subject?: Subject
  paper_grade: Grade
  paper_total_score: number
  score: number | null
  // v1.1: 新增字段
  subject_scores?: SubjectScore[]
  s_class_qualified?: boolean
  total_full_score?: number
  score_rate?: number | null
  status: ExamStatus
  started_at: string | null
  submitted_at: string | null
}

// v1.1: 科目得分
export interface SubjectScore {
  subject: Subject
  subject_name: string
  score: number
  full_score: number
  score_rate: number
  questions_answered: number
  questions_correct: number
}

// v1.1: 考试成绩
export interface ExamResult {
  total_score: number
  total_full_score: number
  score_rate: number
  s_class_qualified: boolean
  subject_scores: SubjectScore[]
  status: string
  submittedAt: string | null
}

// 考试详情（含判分详情）
export interface ExamDetailResponse {
  record: ExamRecord
  student: {
    id: number
    name: string
    grade: Grade
  }
  paper: {
    id: number
    title: string
    total_score: number
  }
  questions: Question[]
  studentAnswers: Answer[]
}
