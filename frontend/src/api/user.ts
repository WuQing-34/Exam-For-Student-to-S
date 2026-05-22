import api from './index'
import type { ApiResponse, PaginationResult } from '../types'
import type { Student } from '../types/user'

export const userApi = {
  /** 考生列表 */
  list(params?: { grade?: string; keyword?: string; page?: number; pageSize?: number }) {
    return api.get<ApiResponse<PaginationResult<Student>>>(
      '/admin/students',
      { params }
    )
  },

  /** 新增考生 */
  create(data: { name: string; phone: string; grade: string }) {
    return api.post<ApiResponse<Student>>(
      '/admin/students',
      data
    )
  },

  /** 批量导入 */
  import(formData: FormData) {
    return api.post<ApiResponse<{ success: number; failed: number; errors: string[]; ids?: number[]; autoAssigned?: number; autoSkipped?: number }>>(
      '/admin/students/import',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

  /** 编辑考生 */
  update(id: number, data: { name?: string; phone?: string; grade?: string }) {
    return api.put<ApiResponse<Student>>(
      `/admin/students/${id}`,
      data
    )
  },

  /** 删除考生 */
  delete(id: number) {
    return api.delete<ApiResponse<null>>(
      `/admin/students/${id}`
    )
  },
}
