import api from './index'
import type { ApiResponse } from '../types'

// ========== v2.0 考生端 API ==========
export const studentExamApi = {
  /** 学生注册 */
  register(data: {
    name: string
    phone: string
    grade: string
    subjects: string[]
    salesId?: number
  }) {
    return api.post<ApiResponse<{
      sessionId: string
      studentId: number
    }>>('/student/register', data)
  },

  /** 学生登录 (v2.0: 姓名+手机号) */
  login(data: { name: string; phone: string }) {
    return api.post<ApiResponse<{
      sessionId: string
      studentId: number
      name: string
      grade: string
      subjects: string[]
    }>>('/student/login', data)
  },

  /** 获取销售列表 */
  getSales() {
    return api.get<ApiResponse<{
      list: Array<{ id: number; name: string; email: string }>
    }>>('/student/sales')
  },

  /** 我的报名科目 */
  getSubjects() {
    return api.get<ApiResponse<{
      subjects: Array<{
        subject: string
        subjectName: string
        status: string
        score: number | null
        fullScore: number
        scoreRate: number | null
        sClassQualified: boolean
        examId: number | null
      }>
    }>>('/student/subjects')
  },

  /** 开始某科考试 (v2.0) */
  startExam(subject: string) {
    return api.post<ApiResponse<{
      examId: number
      subject: string
      questions: Array<{
        id: number
        type: string
        content: string
        options: Array<{ label: string; text: string }> | null
      }>
      startedAt: string
    }>>('/student/exams/start', { subject })
  },

  /** 获取考试题目 */
  getExamContent(examId: number) {
    return api.get<ApiResponse<{
      examId: number
      subject: string
      questions: Array<{
        id: number
        type: string
        content: string
        options: Array<{ label: string; text: string }> | null
      }>
      status: string
    }>>(`/student/exams/${examId}`)
  },

  /** 提交考试 */
  submitExam(examId: number, answers: Array<{ questionId: number; answer: string }>) {
    return api.post<ApiResponse<{
      examId: number
      subject: string
      score: number
      fullScore: number
      scoreRate: number
      sClassQualified: boolean
    }>>(`/student/exams/${examId}/submit`, { answers })
  },

  /** 获取所有科目成绩汇总 */
  getResults() {
    return api.get<ApiResponse<{
      results: Array<{
        subject: string
        subjectName: string
        status: string
        score: number | null
        fullScore: number
        scoreRate: number | null
        sClassQualified: boolean
        submittedAt: string | null
      }>
    }>>('/student/exams/results')
  },

  /** 获取单科成绩 */
  getResult(examId: number) {
    return api.get<ApiResponse<{
      examId: number
      subject: string
      score: number
      fullScore: number
      scoreRate: number
      sClassQualified: boolean
      status: string
      submittedAt: string
    }>>(`/student/exams/${examId}/result`)
  },
}

// ========== v2.0 管理端 API ==========
export const adminExamApi = {
  /** 考试记录列表 */
  list(params?: {
    subject?: string
    studentId?: number
    page?: number
    pageSize?: number
  }) {
    return api.get<ApiResponse<{
      list: Array<{
        id: number
        studentId: number
        studentName: string
        studentGrade: string
        studentPhone: string
        subject: string
        subjectName: string
        score: number | null
        fullScore: number
        scoreRate: number | null
        sClassQualified: boolean
        duration: number
        durationFormatted: string
        status: string
        startedAt: string | null
        submittedAt: string | null
      }>
      total: number
      page: number
      pageSize: number
    }>>('/admin/exams', { params })
  },

  /** 考试详情 */
  getDetail(id: number) {
    return api.get<ApiResponse<{
      record: {
        id: number
        subject: string
        subjectName: string
        score: number
        fullScore: number
        scoreRate: number
        sClassQualified: boolean
        status: string
        startedAt: string
        submittedAt: string
      }
      student: {
        id: number
        name: string
        grade: string
        phone: string
      }
      questions: unknown[]
      studentAnswers: unknown[]
    }>>(`/admin/exams/${id}`)
  },
}

// ========== 题库管理 API ==========
export const questionBankApi = {
  list(params?: { subject?: string; type?: string; page?: number; pageSize?: number }) {
    return api.get<ApiResponse<{
      list: Array<{
        id: number
        subject: string
        type: string
        content: string
        options: string | null
        correct_answer: string
        created_by: number
        created_at: string
      }>
      total: number
      page: number
      pageSize: number
    }>>('/admin/question-bank', { params })
  },

  stats() {
    return api.get<ApiResponse<Array<{ subject: string; choice: number; fill: number }>>>(
      '/admin/question-bank/stats'
    )
  },

  create(data: {
    subject: string
    type: string
    content: string
    options?: string | null
    correct_answer: string
  }) {
    return api.post<ApiResponse<{
      id: number
      subject: string
      type: string
      content: string
      options: string | null
      correct_answer: string
    }>>('/admin/question-bank', data)
  },

  batchImport(formData: FormData) {
    return api.post<ApiResponse<{ count: number }>>(
      '/admin/question-bank/batch',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

  delete(id: number) {
    return api.delete<ApiResponse<null>>(`/admin/question-bank/${id}`)
  },
}
