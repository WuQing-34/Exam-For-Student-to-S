import api from './index'
import type { ApiResponse } from '../types'
import type { Student } from '../types/user'
import type { Paper } from '../types/paper'

export const assignmentApi = {
  /** 分配试卷 */
  assign(data: { paperId: number; studentIds?: number[]; grade?: string }) {
    return api.post<ApiResponse<{ assigned: number; skipped: number }>>(
      '/admin/assignments',
      data
    )
  },

  /** 分配预览 */
  preview(params: { paperId: number; studentIds?: string; grade?: string }) {
    return api.get<ApiResponse<{ students: Student[]; paper: Paper; conflictCount: number }>>(
      '/admin/assignments/preview',
      { params }
    )
  },

  /** 分配记录列表 */
  list(params?: { studentId?: number; paperId?: number; page?: number; pageSize?: number }) {
    return api.get<ApiResponse<unknown>>('/admin/assignments', { params })
  },
}
