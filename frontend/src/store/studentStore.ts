import { create } from 'zustand'
import { storage } from '../utils/storage'

interface StudentState {
  studentId: number | null
  name: string | null
  grade: string | null
  login: (name: string, grade: string) => Promise<void>
  logout: () => void
  isLoggedIn: () => boolean
}

export const useStudentStore = create<StudentState>((set, get) => ({
  studentId: storage.get<number>('studentId'),
  name: storage.get<string>('studentName'),
  grade: storage.get<string>('studentGrade'),

  login: async (name: string, grade: string) => {
    // 登录成功后由调用方设置
    set({ name, grade })
    storage.set('studentName', name)
    storage.set('studentGrade', grade)
  },

  logout: () => {
    storage.remove('studentId')
    storage.remove('studentName')
    storage.remove('studentGrade')
    set({ studentId: null, name: null, grade: null })
  },

  isLoggedIn: () => !!get().name && !!get().grade,
}))
