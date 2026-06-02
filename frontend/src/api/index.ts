import axios, { AxiosResponse } from 'axios'
import { storage } from '../utils/storage'
import type { ApiResponse } from '../types'

const instance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true, // 允许携带 cookie
})

// 请求拦截器：添加 token
instance.interceptors.request.use(config => {
  const token = storage.get<string>('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理错误码
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => response,
  error => {
    if (error.response) {
      const { status, data } = error.response as AxiosResponse<ApiResponse>
      if (status === 401) {
        // 只对管理端接口的 401 做跳转，学生端登录失败不应跳走
        const url = error.config?.url || ''
        const isAdminApi = url.startsWith('/admin/')
        if (isAdminApi) {
          storage.remove('token')
          window.location.href = '/admin/login'
        }
      }
      // 统一错误处理：reject with the ApiResponse data
      return Promise.reject(data)
    }
    return Promise.reject(error)
  }
)

export default instance
