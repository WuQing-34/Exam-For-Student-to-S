import axios from 'axios'
import api from './index'
import type { ApiResponse } from '../types'
import type { ExamDetailResponse, ExamResult } from '../types/exam'
import type { QuestionPreview } from '../types/paper'

// 用于 blob 响应的独立 axios 实例（绕过拦截器）
const blobApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  withCredentials: true,
})

// ========== 管理端 API ==========
export const adminExamApi = {
  /** 考试记录列表 */
  list(params?: {
    grade?: string
    minScore?: number
    maxScore?: number
    paperId?: number
    page?: number
    pageSize?: number
  }) {
    return api.get<ApiResponse<{
      list: Array<{
        id: number
        studentName: string
        studentGrade: string
        studentPhone: string
        paperTitle: string
        paperSubject?: string
        score: number | null
        totalScore: number
        scoreRate: number | null
        subjectScores?: Array<{
          subject: string
          subject_name: string
          score: number
          full_score: number
          score_rate: number
        }>
        sClassQualified?: boolean
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
    return api.get<ApiResponse<ExamDetailResponse>>(`/admin/exams/${id}`)
  },

  /** 导出 Word（使用 blob API 避免拦截器干扰） */
  async export(id: number): Promise<Blob> {
    const response = await blobApi.post(
      `/admin/exams/${id}/export`,
      {},
      { responseType: 'blob' }
    )
    return response.data as Blob
  },
}

// ========== 考生端 API ==========
export const studentExamApi = {
  /** 考生登录 */
  login(data: { name: string; grade: string; phone: string }) {
    return api.post<ApiResponse<{ sessionId: string }>>(
      '/student/login',
      data
    )
  },

  /** 我的试卷列表 */
  getPaperList() {
    return api.get<ApiResponse<{
      list: Array<{
        id: number
        paperId: number
        paperTitle: string
        paperSubject?: string
        paperGrade: string
        paperTotalScore: number
        status: string
        score: number | null
        examRecordId: number | null
      }>
    }>>('/student/papers')
  },

  /** 获取答题内容 */
  getExamContent(assignmentId: number) {
    return api.get<ApiResponse<{
      examRecord: { id: number; started_at: string | null }
      paper: { id: number; title: string; totalScore: number; totalTime: number; subjectsIncluded?: string[] }
      questions: QuestionPreview[]
      sections: Array<{
        subject: string
        subject_name: string
        subject_order: number
        total_score: number
        question_count: number
      }>
    }>>(`/student/papers/${assignmentId}/exam`)
  },

  /** 开始考试 */
  startExam(assignmentId: number) {
    return api.post<ApiResponse<{ examRecordId: number; startedAt: string }>>(
      '/student/exams/start',
      { assignmentId }
    )
  },

  /** 提交答案 */
  submitAnswers(
    examRecordId: number,
    answers: Array<{ questionId: number; answer: string }>,
    action: 'save' | 'submit'
  ) {
    return api.put<ApiResponse<{
      status: string
      score?: number
      totalScore?: number
      sClassQualified?: boolean
      subjectScores?: Array<{
        subject: string
        subject_name: string
        score: number
        full_score: number
        score_rate: number
      }>
    }>>(
      `/student/exams/${examRecordId}`,
      { answers, action }
    )
  },

  /** 获取成绩 */
  getResult(examRecordId: number) {
    return api.get<ApiResponse<ExamResult>>(
      `/student/exams/${examRecordId}/result`
    )
  },
}
