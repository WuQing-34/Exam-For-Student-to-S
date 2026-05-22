import { Grade } from './index'

/**
 * 用户相关类型
 */

// 管理端用户
export interface AdminUser {
  id: number
  email: string
  name: string
  role: 'admin' | 'tutor'
  created_at?: string
}

// 考生
export interface Student {
  id: number
  name: string
  phone: string
  grade: Grade
  created_at: string
}
