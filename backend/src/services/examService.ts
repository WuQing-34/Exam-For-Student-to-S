import { paperModel } from '../models/paperModel'
import { examModel } from '../models/examModel'
import { assignmentModel } from '../models/assignmentModel'
import { Question } from '../models/paperModel'

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
  /**
   * 标准化答案（trim + toLowerCase）
   */
  normalizeAnswer(answer: string): string {
    return answer.trim().toLowerCase()
  },

  /**
   * 单题判分
   */
  gradeQuestion(answer: string, question: Question): number {
    const normalized = this.normalizeAnswer(answer)
    const correct = this.normalizeAnswer(question.correct_answer)

    if (question.type === 'essay') {
      // 简答题同样对比答案（与选择、填空一致）
      return normalized === correct ? question.score : 0
    }

    return normalized === correct ? question.score : 0
  },

  /**
   * 批量判分
   */
  gradeAnswers(
    answers: Array<{ questionId: number; answer: string }>,
    paperId: number
  ): GradingResult {
    const questions = paperModel.findQuestionsByPaperId(paperId)
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

  /**
   * v1.1: 按科目分组判分
   */
  gradeAnswersBySubject(
    answers: Array<{ questionId: number; answer: string }>,
    paperId: number
  ): SubjectGradingResult {
    const questions = paperModel.findQuestionsByPaperId(paperId)
    const answerMap = new Map(answers.map(a => [a.questionId, a]))

    // 按科目分组
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

    // 每科分别判分
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

    // 计算S班资格：所有科目得分率均 >= 60%
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

  /**
   * 开始考试
   */
  startExam(assignmentId: number): number {
    const assignment = assignmentModel.findById(assignmentId)
    if (!assignment) {
      throw new Error('分配记录不存在')
    }

    const existing = examModel.findByAssignmentId(assignmentId)
    if (existing) {
      if (existing.status === 'submitted') {
        throw new Error('该试卷已提交，无法重新开始')
      }
      return existing.id
    }

    assignmentModel.updateStatus(assignmentId, 'in_progress')
    return examModel.create({ assignment_id: assignmentId })
  },

  /**
   * 提交答案（v1.1: 支持分科判分）
   */
  submitAnswers(
    examRecordId: number,
    answers: Array<{ questionId: number; answer: string }>,
    action: 'save' | 'submit'
  ): { status: string; score?: number; totalScore?: number; sClassQualified?: boolean; subjectScores?: SubjectGradingResult['subject_scores'] } {
    const record = examModel.findById(examRecordId)
    if (!record) {
      throw new Error('考试记录不存在')
    }

    const assignment = assignmentModel.findById(record.assignment_id)
    if (!assignment) {
      throw new Error('分配记录不存在')
    }

    const answersJson = JSON.stringify(answers)

    if (action === 'save') {
      // 静默保存答案到数据库，便于恢复和自动保存
      examModel.saveAnswers(examRecordId, answersJson)
      return { status: 'in_progress' }
    }

    // v1.1: 使用分科判分
    const result = this.gradeAnswersBySubject(answers, assignment.paper_id)

    // 更新考试记录
    examModel.submit(examRecordId, {
      answers: answersJson,
      score: result.total_score,
      subject_scores: JSON.stringify(result.subject_scores),
      s_class_qualified: result.s_class_qualified ? 1 : 0,
      total_full_score: result.total_full_score,
    })

    // 更新分配状态
    assignmentModel.updateStatus(assignment.id, 'completed')

    return {
      status: 'submitted',
      score: result.total_score,
      totalScore: result.total_full_score,
      sClassQualified: result.s_class_qualified,
      subjectScores: result.subject_scores,
    }
  },

  /**
   * 获取成绩（v1.1: 支持分科成绩）
   */
  getResult(examRecordId: number): {
    total_score: number
    total_full_score: number
    score_rate: number
    s_class_qualified: boolean
    subject_scores: SubjectGradingResult['subject_scores']
    status: string
    submittedAt: string | null
  } {
    const record = examModel.findById(examRecordId)
    if (!record) {
      throw new Error('考试记录不存在')
    }

    const assignment = assignmentModel.findById(record.assignment_id)
    if (!assignment) {
      throw new Error('分配记录不存在')
    }

    const paper = paperModel.findById(assignment.paper_id)

    // v1.1: 尝试解析分科成绩
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

    // 兼容旧记录（没有分科成绩时返回空数组）
    if (subjectScores.length === 0 && paper) {
      // 单科目试卷，生成默认结构
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
