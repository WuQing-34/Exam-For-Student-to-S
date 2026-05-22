import { create } from 'zustand'

interface Answer {
  questionId: number
  answer: string
}

interface ExamState {
  currentIndex: number
  answers: Answer[]
  examRecordId: number | null
  startedAt: string | null
  questions: Array<{ id: number }>
  isSubmitting: boolean
  // v1.1: 分科成绩
  subjectScores: Array<{
    subject: string
    subject_name: string
    score: number
    full_score: number
    score_rate: number
  }>
  setQuestions: (questions: Array<{ id: number }>) => void
  setCurrentIndex: (index: number) => void
  setAnswer: (questionId: number, answer: string) => void
  getAnswer: (questionId: number) => string
  setExamRecord: (id: number, startedAt: string) => void
  setSubmitting: (v: boolean) => void
  // v1.1
  setSubjectScores: (scores: ExamState['subjectScores']) => void
  reset: () => void
  getUnansweredCount: () => number
}

export const useExamStore = create<ExamState>((set, get) => ({
  currentIndex: 0,
  answers: [],
  examRecordId: null,
  startedAt: null,
  questions: [],
  isSubmitting: false,
  subjectScores: [],

  setQuestions: (questions) => set({ questions }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  setAnswer: (questionId, answer) => {
    const { answers } = get()
    const existing = answers.find(a => a.questionId === questionId)
    if (existing) {
      set({ answers: answers.map(a => a.questionId === questionId ? { ...a, answer } : a) })
    } else {
      set({ answers: [...answers, { questionId, answer }] })
    }
  },

  getAnswer: (questionId) => {
    const answer = get().answers.find(a => a.questionId === questionId)
    return answer?.answer ?? ''
  },

  setExamRecord: (id, startedAt) => set({ examRecordId: id, startedAt }),

  setSubmitting: (v) => set({ isSubmitting: v }),

  // v1.1
  setSubjectScores: (scores) => set({ subjectScores: scores }),

  reset: () => set({
    currentIndex: 0,
    answers: [],
    examRecordId: null,
    startedAt: null,
    questions: [],
    isSubmitting: false,
    subjectScores: [],
  }),

  getUnansweredCount: () => {
    const { questions, answers } = get()
    return questions.filter(q => {
      const a = answers.find(ans => ans.questionId === q.id)
      return !a || a.answer.trim() === ''
    }).length
  },
}))
