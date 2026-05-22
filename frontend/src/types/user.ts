import { Grade } from './index'

/**
 * 用户相关类型
 */

// 管理端用户
export interface AdminUser {
  id: number
  email: string
  name: string
  role: 'admin' | 'short_term_tutor'
  created_at?: string
}

// 考生
export interface Student {
  id: number
  name: string
  phone: string
  grade: Grade
  subjects?: string
  sales_id?: number
  created_at: string
}
