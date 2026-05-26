import api from './index'
import type { ApiResponse, PaginationResult } from '../types'
import type { Paper, Question, SubjectSection } from '../types/paper'

export interface PaperWithCount extends Paper {
  questionCount: number
}

export const paperApi = {
  /** 试卷列表 */
  list(params?: { grade?: string; page?: number; pageSize?: number }) {
    return api.get<ApiResponse<PaginationResult<PaperWithCount>>>(
      '/admin/papers',
      { params }
    )
  },

  /** 上传试卷 */
  upload(formData: FormData) {
    return api.post<ApiResponse<{
      id: number
      title: string
      subjectsIncluded: string[]
      sections: Array<{
        subject: string
        subject_name: string
        questionCount: number
        totalScore: number
      }>
      autoAssigned: number
    }>>(
      '/admin/papers',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

  /** 试卷详情（含答案） */
  getDetail(id: number) {
    return api.get<ApiResponse<{
      paper: Paper
      questions: Question[]
      sections: SubjectSection[]
    }>>(
      `/admin/papers/${id}`
    )
  },

  /** 预览试卷（不含答案） */
  preview(id: number) {
    return api.get<ApiResponse<{
      paper: Paper
      questions: Omit<Question, 'correct_answer'>[]
      sections: SubjectSection[]
    }>>(
      `/admin/papers/${id}/preview`
    )
  },

  /** 删除试卷 */
  delete(id: number) {
    return api.delete<ApiResponse<null>>(`/admin/papers/${id}`)
  },

  /** 批量删除试卷 */
  batchDelete(ids: number[]) {
    return api.delete<ApiResponse<{ count: number }>>('/admin/papers/batch', { data: { ids } })
  },

  /** 更新题目内容（含图片标记） */
  updateQuestionContent(questionId: number, content: string) {
    return api.put<ApiResponse<null>>(`/admin/papers/questions/${questionId}/content`, { content })
  },
}
