import { create } from 'zustand'
import { storage } from '../utils/storage'
import { authApi } from '../api/auth'
import type { AdminUser } from '../types/user'

interface AuthState {
  token: string | null
  user: Omit<AdminUser, 'phone'> | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; name: string; role: 'admin' | 'tutor' }) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: storage.get<string>('token'),
  user: storage.get<Omit<AdminUser, 'phone'>>('user'),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await authApi.login({ email, password })
      const d = res.data
      if (d.code === 0) {
        storage.set('token', d.data!.token)
        storage.set('user', d.data!.user)
        set({ token: d.data!.token, user: d.data!.user, isLoading: false })
      } else {
        throw new Error(d.message)
      }
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  register: async (data) => {
    set({ isLoading: true })
    try {
      const res = await authApi.register(data)
      const d = res.data
      if (d.code === 0) {
        set({ isLoading: false })
      } else {
        throw new Error(d.message)
      }
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: () => {
    storage.remove('token')
    storage.remove('user')
    set({ token: null, user: null })
  },

  fetchMe: async () => {
    try {
      const res = await authApi.me()
      const d = res.data
      if (d.code === 0) {
        storage.set('user', d.data!)
        set({ user: d.data! })
      }
    } catch {
      // ignore
    }
  },
}))
