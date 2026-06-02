import { paperModel } from '../models/paperModel'
import { examModel } from '../models/examModel'
import { assignmentModel } from '../models/assignmentModel'
import { Question } from '../models/paperModel'
import { compareAnswers } from '../utils/helpers'

export interface GradingResult {
  score: number
  totalScore: number
  details: Array<{
    questionId: number
    awardedScore: number
    maxScore: number
    isCorrect: boolean
  }>
}

// v1.1: 按科目判分结果
export interface SubjectGradingResult {
  total_score: number
  total_full_score: number
  score_rate: number
  s_class_qualified: boolean
  subject_scores: Array<{
    subject: string
    subject_name: string
    score: number
    full_score: number
    score_rate: number
    questions_answered: number
    questions_correct: number
  }>
}

// 科目显示名称映射
const SUBJECT_DISPLAY_MAP: Record<string, string> = {
  chinese: '语文',
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
}

export const examService = {
  gradeQuestion(answer: string, question: Question): number {
    if (compareAnswers(answer, question.correct_answer, question.id, question.type)) {
      return question.score
    }
    return 0
  },

  async gradeAnswers(
    answers: Array<{ questionId: number; answer: string }>,
    paperId: number
  ): Promise<GradingResult> {
    const questions = await paperModel.findQuestionsByPaperId(paperId)
    const questionMap = new Map(questions.map(q => [q.id, q]))

    let score = 0
    let totalScore = 0
    const details: GradingResult['details'] = []

    for (const q of questions) {
      totalScore += q.score
      const studentAnswer = answers.find(a => a.questionId === q.id)
      const answerText = studentAnswer?.answer ?? ''

      const awardedScore = this.gradeQuestion(answerText, q)
      score += awardedScore

      details.push({
        questionId: q.id,
        awardedScore,
        maxScore: q.score,
        isCorrect: awardedScore === q.score,
      })
    }

    return { score, totalScore, details }
  },

  async gradeAnswersBySubject(
    answers: Array<{ questionId: number; answer: string }>,
    paperId: number
  ): Promise<SubjectGradingResult> {
    const questions = await paperModel.findQuestionsByPaperId(paperId)
    const answerMap = new Map(answers.map(a => [a.questionId, a]))

    const subjectQuestions = new Map<string, Question[]>()
    for (const q of questions) {
      const subject = (q as any).subject || 'default'
      if (!subjectQuestions.has(subject)) {
        subjectQuestions.set(subject, [])
      }
      subjectQuestions.get(subject)!.push(q)
    }

    let totalScore = 0
    let totalFullScore = 0
    const subjectScores: SubjectGradingResult['subject_scores'] = []

    for (const [subject, qs] of subjectQuestions) {
      let subjectScore = 0
      let subjectFullScore = 0
      let questionsAnswered = 0
      let questionsCorrect = 0

      for (const q of qs) {
        subjectFullScore += q.score
        totalFullScore += q.score

        const studentAnswer = answerMap.get(q.id)
        const answerText = studentAnswer?.answer ?? ''

        if (answerText.trim()) {
          questionsAnswered++
        }

        const awardedScore = this.gradeQuestion(answerText, q)
        subjectScore += awardedScore
        totalScore += awardedScore

        if (awardedScore === q.score) {
          questionsCorrect++
        }
      }

      const scoreRate = subjectFullScore > 0 ? (subjectScore / subjectFullScore) * 100 : 0

      subjectScores.push({
        subject,
        subject_name: SUBJECT_DISPLAY_MAP[subject] || subject,
        score: subjectScore,
        full_score: subjectFullScore,
        score_rate: Math.round(scoreRate * 10) / 10,
        questions_answered: questionsAnswered,
        questions_correct: questionsCorrect,
      })
    }

    const sClassQualified = subjectScores.every(ss => ss.score_rate >= 60)
    const overallScoreRate = totalFullScore > 0 ? (totalScore / totalFullScore) * 100 : 0

    return {
      total_score: totalScore,
      total_full_score: totalFullScore,
      score_rate: Math.round(overallScoreRate * 10) / 10,
      s_class_qualified: sClassQualified,
      subject_scores: subjectScores,
    }
  },

  async startExam(assignmentId: number): Promise<number> {
    const assignment = await assignmentModel.findById(assignmentId)
    if (!assignment) {
      throw new Error('分配记录不存在')
    }

    const existing = await examModel.findByAssignmentId(assignmentId)
    if (existing) {
      if (existing.status === 'submitted') {
        throw new Error('该试卷已提交，无法重新开始')
      }
      return existing.id
    }

    await assignmentModel.updateStatus(assignmentId, 'in_progress')
    return await examModel.create({ assignment_id: assignmentId })
  },

  async submitAnswers(
    examRecordId: number,
    answers: Array<{ questionId: number; answer: string }>,
    action: 'save' | 'submit'
  ): Promise<{ status: string; score?: number; totalScore?: number; sClassQualified?: boolean; subjectScores?: SubjectGradingResult['subject_scores'] }> {
    const record = await examModel.findById(examRecordId)
    if (!record) {
      throw new Error('考试记录不存在')
    }

    const assignment = await assignmentModel.findById(record.assignment_id)
    if (!assignment) {
      throw new Error('分配记录不存在')
    }

    const answersJson = JSON.stringify(answers)

    if (action === 'save') {
      await examModel.saveAnswers(examRecordId, answersJson)
      return { status: 'in_progress' }
    }

    const result = await this.gradeAnswersBySubject(answers, assignment.paper_id)

    await examModel.submit(examRecordId, {
      answers: answersJson,
      score: result.total_score,
      subject_scores: JSON.stringify(result.subject_scores),
      s_class_qualified: result.s_class_qualified ? 1 : 0,
      total_full_score: result.total_full_score,
    })

    await assignmentModel.updateStatus(assignment.id, 'completed')

    return {
      status: 'submitted',
      score: result.total_score,
      totalScore: result.total_full_score,
      sClassQualified: result.s_class_qualified,
      subjectScores: result.subject_scores,
    }
  },

  async getResult(examRecordId: number): Promise<{
    total_score: number; total_full_score: number; score_rate: number
    s_class_qualified: boolean; subject_scores: SubjectGradingResult['subject_scores']
    status: string; submittedAt: string | null
  }> {
    const record = await examModel.findById(examRecordId)
    if (!record) {
      throw new Error('考试记录不存在')
    }

    const assignment = await assignmentModel.findById(record.assignment_id)
    if (!assignment) {
      throw new Error('分配记录不存在')
    }

    const paper = await paperModel.findById(assignment.paper_id)

    let subjectScores: SubjectGradingResult['subject_scores'] = []
    let totalFullScore = paper?.total_full_score || paper?.total_score || 0
    let sClassQualified = false

    if (record.subject_scores) {
      try {
        subjectScores = JSON.parse(record.subject_scores)
        sClassQualified = record.s_class_qualified === 1
      } catch {
        // 兼容旧数据
      }
    }

    if (subjectScores.length === 0 && paper) {
      const totalScore = record.score ?? 0
      subjectScores = [{
        subject: (paper as any).subject || 'chinese',
        subject_name: SUBJECT_DISPLAY_MAP[(paper as any).subject] || '总成绩',
        score: totalScore,
        full_score: paper.total_score,
        score_rate: paper.total_score > 0 ? Math.round((totalScore / paper.total_score) * 100 * 10) / 10 : 0,
        questions_answered: 0,
        questions_correct: 0,
      }]
    }

    const scoreRate = totalFullScore > 0 ? ((record.score ?? 0) / totalFullScore) * 100 : 0

    return {
      total_score: record.score ?? 0,
      total_full_score: totalFullScore,
      score_rate: Math.round(scoreRate * 10) / 10,
      s_class_qualified: sClassQualified,
      subject_scores: subjectScores,
      status: record.status,
      submittedAt: record.submitted_at,
    }
  },
}
