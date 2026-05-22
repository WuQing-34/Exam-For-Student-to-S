/**
 * localStorage 封装工具
 */
const PREFIX = 'exam_system_'

export const storage = {
  get<T = string>(key: string): T | null {
    try {
      const item = localStorage.getItem(PREFIX + key)
      if (item === null) return null
      return JSON.parse(item) as T
    } catch {
      return null
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // ignore
    }
  },

  remove(key: string): void {
    localStorage.removeItem(PREFIX + key)
  },

  clear(): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k))
  },
}
