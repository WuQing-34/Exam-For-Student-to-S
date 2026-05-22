import { create } from 'zustand'
import { storage } from '../utils/storage'

interface StudentState {
  studentId: number | null
  name: string | null
  grade: string | null
  subjects: string[]
  login: (studentId: number, name: string, grade: string, subjects?: string[]) => void
  logout: () => void
  isLoggedIn: () => boolean
}

export const useStudentStore = create<StudentState>((set, get) => ({
  studentId: storage.get<number>('studentId'),
  name: storage.get<string>('studentName'),
  grade: storage.get<string>('studentGrade'),
  subjects: (() => {
    try {
      const s = storage.get<string>('studentSubjects')
      return s ? JSON.parse(s) : []
    } catch {
      return []
    }
  })(),

  login: (studentId: number, name: string, grade: string, subjects?: string[]) => {
    const subs = subjects || []
    set({ studentId, name, grade, subjects: subs })
    storage.set('studentId', studentId)
    storage.set('studentName', name)
    storage.set('studentGrade', grade)
    storage.set('studentSubjects', JSON.stringify(subs))
  },

  logout: () => {
    storage.remove('studentId')
    storage.remove('studentName')
    storage.remove('studentGrade')
    storage.remove('studentSubjects')
    set({ studentId: null, name: null, grade: null, subjects: [] })
  },

  isLoggedIn: () => !!get().name,
}))
