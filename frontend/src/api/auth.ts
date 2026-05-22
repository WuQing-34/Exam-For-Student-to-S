import api from './index'
import type { ApiResponse } from '../types'
import type { AdminUser } from '../types/user'

export interface LoginResult {
  token: string
  user: Omit<AdminUser, 'phone'>
}

export const authApi = {
  /** 注册 */
  register(data: { email: string; password: string; name: string; role: 'admin' | 'tutor' }) {
    return api.post<ApiResponse<Omit<AdminUser, 'phone'>>>('/admin/auth/register', data)
  },

  /** 登录 */
  login(data: { email: string; password: string }) {
    return api.post<ApiResponse<LoginResult>>('/admin/auth/login', data)
  },

  /** 获取当前用户 */
  me() {
    return api.get<ApiResponse<Omit<AdminUser, 'phone'>>>('/admin/auth/me')
  },

  /** 管理员添加新管理员 */
  addAdmin(data: { email: string; name: string }) {
    return api.post<ApiResponse<Omit<AdminUser, 'phone'>>>('/admin/auth/add-admin', data)
  },

  /** 修改密码 */
  changePassword(data: { oldPassword: string; newPassword: string }) {
    return api.put<ApiResponse<null>>('/admin/auth/change-password', data)
  },

  /** 获取管理员列表 */
  listAdmins() {
    return api.get<ApiResponse<Omit<AdminUser, 'phone'>[]>>('/admin/auth/admins')
  },
}
