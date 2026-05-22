import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
} from 'docx'

function padNumber(num: number, length = 2): string {
  return String(num).padStart(length, '0')
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = padNumber(d.getMonth() + 1)
  const day = padNumber(d.getDate())
  const hour = padNumber(d.getHours())
  const min = padNumber(d.getMinutes())
  const sec = padNumber(d.getSeconds())
  return `${year}-${month}-${day} ${hour}:${min}:${sec}`
}

import { examModel } from '../models/examModel'
import { assignmentModel } from '../models/assignmentModel'
import { paperModel, Question } from '../models/paperModel'
import { userModel } from '../models/userModel'

// v1.1: 年级映射（支持新旧格式）
const GRADE_MAP: Record<string, string> = {
  junior1: '初一',
  junior2: '初二',
  junior3: '初三',
  G1: '初一',
  G2: '初二',
  G3: '初三',
}

const SUBJECT_MAP: Record<string, string> = {
  chinese: '语文',
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
}

export const exportService = {
  /**
   * 生成 Word 考试报告（v1.1: 支持分科成绩）
   */
  async generateExamReport(examRecordId: number): Promise<Buffer> {
    const record = examModel.findById(examRecordId)
    if (!record) {
      throw new Error('考试记录不存在')
    }

    const assignment = assignmentModel.findById(record.assignment_id)
    if (!assignment) {
      throw new Error('分配记录不存在')
    }

    const student = userModel.findById(assignment.student_id)
    if (!student) {
      throw new Error('考生不存在')
    }

    const paper = paperModel.findById(assignment.paper_id)
    if (!paper) {
      throw new Error('试卷不存在')
    }

    const questions = paperModel.findQuestionsByPaperId(paper.id)
    const studentAnswers: Array<{ questionId: number; answer: string }> = record.answers
      ? JSON.parse(record.answers)
      : []

    const gradeName = GRADE_MAP[paper.grade] || paper.grade

    // 计算每题得分
    const answerMap = new Map(studentAnswers.map(a => [a.questionId, a.answer]))

    const totalScore = record.total_full_score || paper.total_score
    const scoreRate = totalScore > 0
      ? ((record.score ?? 0) / totalScore * 100).toFixed(1)
      : '0.0'

    const startedAt = record.started_at
      ? formatDateTime(record.started_at)
      : '-'
    const submittedAt = record.submitted_at
      ? formatDateTime(record.submitted_at)
      : '-'

    // v1.1: 解析分科成绩
    let subjectScores: any[] = []
    let sClassQualified = false
    if (record.subject_scores) {
      try {
        subjectScores = JSON.parse(record.subject_scores)
        sClassQualified = record.s_class_qualified === 1
      } catch {
        // 忽略
      }
    }

    const children: (Paragraph | Table)[] = []

    // 标题
    children.push(
      new Paragraph({
        text: '考试报告',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    )

    // 基本信息表
    const infoRows: [string, string][] = [
      ['考生姓名', student.name],
      ['考生年级', gradeName],
      ['试卷名称', paper.title],
      ['考试时间', `${startedAt} 至 ${submittedAt}`],
      ['得分', `${record.score ?? 0} / ${totalScore}`],
      ['得分率', `${scoreRate}%`],
    ]

    // v1.1: 添加S班资格
    if (record.s_class_qualified !== undefined) {
      infoRows.push(['S班资格', sClassQualified ? '合格' : '不合格'])
    }

    infoRows.push(['考试状态', record.status === 'submitted' ? '已完成' : '答题中'])

    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: infoRows.map(([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
              width: { size: 30, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ text: String(value) })],
              width: { size: 70, type: WidthType.PERCENTAGE },
            }),
          ],
        })
      ),
    })

    children.push(infoTable)
    children.push(new Paragraph({ text: '' }))

    // v1.1: 分科成绩
    if (subjectScores.length > 0) {
      children.push(
        new Paragraph({
          text: '分科成绩',
          heading: HeadingLevel.HEADING_1,
        })
      )

      const subjectTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '科目', bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '得分', bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '满分', bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '得分率', bold: true })] })] }),
            ],
          }),
          ...subjectScores.map((ss: any) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: ss.subject_name || ss.subject })] }),
                new TableCell({ children: [new Paragraph({ text: String(ss.score) })] }),
                new TableCell({ children: [new Paragraph({ text: String(ss.full_score) })] }),
                new TableCell({ children: [new Paragraph({ text: `${ss.score_rate}%` })] }),
              ],
            })
          ),
        ],
      })

      children.push(subjectTable)
      children.push(new Paragraph({ text: '' }))
    }

    // 题目详情
    children.push(
      new Paragraph({
        text: '题目详情',
        heading: HeadingLevel.HEADING_1,
      })
    )

    for (const q of questions) {
      const studentAnswer = answerMap.get(q.id) || '(未作答)'
      const correctAnswer = q.correct_answer
      const awardedScore = this.calcScore(q, studentAnswer, record.score ?? 0)

      const TYPE_MAP: Record<string, string> = {
        choice: '选择题',
        fill: '填空题',
        essay: '简答题',
      }

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `第${q.order_num}题 `, bold: true }),
            new TextRun({ text: `[${TYPE_MAP[q.type] || q.type}]${(q as any).subject ? ` [${SUBJECT_MAP[(q as any).subject] || (q as any).subject}]` : ''} ${q.content}` }),
          ],
        })
      )

      if (q.options) {
        const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        for (const opt of opts) {
          children.push(
            new Paragraph({
              text: `  ${opt.label}. ${opt.text}`,
            })
          )
        }
      }

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `考生答案：`, bold: true }),
            new TextRun({ text: studentAnswer }),
          ],
        })
      )

      if (q.type !== 'essay') {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `参考答案：`, bold: true }),
              new TextRun({ text: correctAnswer }),
            ],
          })
        )
      }

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `得分：`, bold: true }),
            new TextRun({ text: `${awardedScore} / ${q.score}` }),
          ],
        })
      )

      children.push(new Paragraph({ text: '' }))
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    })

    return await Packer.toBuffer(doc)
  },

  /**
   * 计算单题得分
   */
  calcScore(question: Question, studentAnswer: string, _totalAwarded: number): number {
    if (question.type === 'essay') {
      return question.score
    }
    const normalized = studentAnswer.trim().toLowerCase()
    const correct = question.correct_answer.trim().toLowerCase()
    return normalized === correct ? question.score : 0
  },
}
