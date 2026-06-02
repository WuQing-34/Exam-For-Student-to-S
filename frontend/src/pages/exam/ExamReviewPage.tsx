import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Card, Typography, Button, Chip, CircularProgress, Alert, Paper,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { studentExamApi } from '../../api/exam'
import { SUBJECT_MAP } from '../../types'
import { QuestionContent } from '../../components/ui/QuestionContent'

interface ReviewQuestion {
  id: number
  type: string
  content: string
  options: Array<{ label: string; text: string; image?: string }> | null
  blankCount?: number
  correctAnswer: string
  studentAnswer: string
  isCorrect: boolean
  score: number
}

interface ReviewData {
  examId: number
  subject: string
  score: number
  fullScore: number
  scoreRate: number
  sClassQualified: boolean
  submittedAt: string
  questions: ReviewQuestion[]
}

export function ExamReviewPage() {
  const { subject } = useParams<{ subject: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const subjectName = SUBJECT_MAP[subject as keyof typeof SUBJECT_MAP] || subject || ''

  useEffect(() => {
    const fetchReview = async () => {
      try {
        // 从科目列表获取 examId
        const subjectsRes = await studentExamApi.getSubjects()
        if (subjectsRes.data.code !== 0 || !subjectsRes.data.data) {
          setError('获取科目列表失败')
          return
        }
        const subj = subjectsRes.data.data.subjects.find(
          (s: { subject: string }) => s.subject === subject
        )
        if (!subj?.examId) {
          setError('未找到考试记录')
          return
        }

        const res = await studentExamApi.reviewExam(subj.examId)
        if (res.data.code === 0 && res.data.data) {
          setData(res.data.data)
        } else {
          setError(res.data.message || '获取答卷失败')
        }
      } catch (err: unknown) {
        const e = err as { message?: string }
        setError(e.message || '获取答卷失败')
      } finally {
        setLoading(false)
      }
    }
    fetchReview()
  }, [subject])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/subjects')}>
          返回科目列表
        </Button>
      </Box>
    )
  }

  if (!data) return null

  const correctCount = data.questions.filter(q => q.isCorrect).length
  const totalCount = data.questions.length

  return (
    <Box>
      {/* 顶部成绩卡片 */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{subjectName} 答卷回顾</Typography>
            <Typography variant="body2" color="text.secondary">
              提交时间：{data.submittedAt ? new Date(data.submittedAt).toLocaleString('zh-CN') : '未知'}
            </Typography>
          </Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/subjects')}
            sx={{ borderRadius: 2 }}
          >
            返回
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h4" fontWeight={800} color={data.sClassQualified ? 'success.main' : 'text.primary'}>
            {data.score}/{data.fullScore}
          </Typography>
          <Chip
            label={`${data.scoreRate}%`}
            color={data.sClassQualified ? 'success' : 'default'}
            variant="outlined"
          />
          {data.sClassQualified ? (
            <Chip
              icon={<EmojiEventsIcon />}
              label="S班达标"
              color="success"
            />
          ) : (
            <Chip
              icon={<CancelIcon />}
              label="未达标"
              variant="outlined"
            />
          )}
          <Chip
            label={`答对 ${correctCount}/${totalCount}`}
            variant="outlined"
            color="primary"
          />
        </Box>
      </Paper>

      {/* 逐题对比 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {data.questions.map((q, idx) => (
          <Card
            key={q.id}
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: q.isCorrect ? '#c8e6c9' : '#ffcdd2',
              borderLeft: `4px solid ${q.isCorrect ? '#4caf50' : '#f44336'}`,
            }}
          >
            {/* 题号 + 对错标记 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="primary">
                第 {idx + 1} 题（{q.type === 'choice' ? '选择题' : '填空题'}，{q.score}分）
              </Typography>
              <Chip
                icon={q.isCorrect ? <CheckCircleIcon /> : <CancelIcon />}
                label={q.isCorrect ? '正确' : '错误'}
                color={q.isCorrect ? 'success' : 'error'}
                size="small"
                variant={q.isCorrect ? 'filled' : 'outlined'}
              />
            </Box>

            {/* 题目内容 */}
            <QuestionContent content={q.content} sx={{ mb: 2, fontWeight: 500 }} />

            {/* 选择题：展示选项，高亮正确答案和学生答案 */}
            {q.type === 'choice' && q.options ? (
              <Box sx={{ ml: 1 }}>
                {q.options.map(opt => {
                  const isCorrectOpt = opt.label === q.correctAnswer
                  const isStudentOpt = opt.label === q.studentAnswer
                  return (
                    <Box
                      key={opt.label}
                      sx={{
                        py: 0.8, px: 1.5, mb: 0.5, borderRadius: 1,
                        bgcolor: isCorrectOpt ? '#e8f5e9' : isStudentOpt ? '#ffebee' : 'transparent',
                        border: '1px solid',
                        borderColor: isCorrectOpt ? '#a5d6a7' : isStudentOpt ? '#ef9a9a' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: 1,
                      }}
                    >
                      <Typography variant="body2" fontWeight={isCorrectOpt || isStudentOpt ? 600 : 400}>
                        {opt.label}. {opt.text}
                      </Typography>
                      {isCorrectOpt && (
                        <Chip label="正确答案" size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {isStudentOpt && !isCorrectOpt && (
                        <Chip label="你的答案" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                    </Box>
                  )
                })}
              </Box>
            ) : (
              /* 填空题：展示我的答案 vs 正确答案 */
              <Box sx={{ ml: 1 }}>
                {q.blankCount && q.blankCount > 1 ? (
                  // 多空题
                  (() => {
                    const studentParts = q.studentAnswer ? q.studentAnswer.split('|||') : []
                    let correctParts: string[] = []
                    // 1. 先尝试 JSON 数组格式
                    try {
                      const parsed = JSON.parse(q.correctAnswer)
                      if (Array.isArray(parsed)) correctParts = parsed
                    } catch { /* not JSON */ }

                    // 2. 不是 JSON 数组 → 先尝试 / 分隔格式（如 ⑧/④/①/⑨）
                    if (correctParts.length === 0) {
                      const slashParts = q.correctAnswer.split('/').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
                      if (slashParts.length > 1) correctParts = slashParts
                    }

                    // 3. 不是 / 分隔 → 尝试圆圈序号分隔格式
                    if (correctParts.length === 0) {
                      const matches = q.correctAnswer.match(/①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩/g)
                      if (matches) {
                        correctParts = q.correctAnswer
                          .split(/[①②③④⑤⑥⑦⑧⑨⑩]/)
                          .filter((s: string) => s.trim())
                      }
                    }

                    // 4. 兜底：整体作为单空答案
                    if (correctParts.length === 0) {
                      correctParts = [q.correctAnswer]
                    }

                    // 解析一个空中多个可接受答案（括号内多选）
                    const parseBlankOptions = (text: string): string[] => {
                      const t = text.trim()
                      let m = t.match(/^(.+?)（(.+?)）$/)
                      if (!m) m = t.match(/^(.+?)\((.+?)\)$/)
                      if (!m) return [t]
                      const prefix = m[1].trim()
                      const opts = m[2].split('/').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
                      return prefix ? [prefix, ...opts] : opts
                    }

                    return (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {Array.from({ length: q.blankCount }).map((_, i) => {
                          const label = String.fromCharCode(0x2460 + i) // ①②③...
                          const studentVal = (studentParts[i] ?? '').trim()
                          const correctVal = (correctParts[i] ?? '').trim()
                          const correctOptions = parseBlankOptions(correctVal)
                          const blankCorrect = correctOptions.some(
                            (opt: string) => studentVal.toLowerCase() === opt.toLowerCase()
                          )
                          const displayCorrect = correctOptions.length > 1
                            ? correctOptions.join(' / ')
                            : correctVal
                          return (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" fontWeight={600}>{label}</Typography>
                              <Chip
                                label={studentVal || '（未作答）'}
                                size="small"
                                color={blankCorrect ? 'success' : 'error'}
                                variant={studentVal ? 'outlined' : 'outlined'}
                                sx={{ height: 26 }}
                              />
                              <Typography variant="body2" color="text.secondary">→</Typography>
                              <Chip
                                label={displayCorrect}
                                size="small"
                                color="success"
                                sx={{ height: 26, fontWeight: 600 }}
                              />
                            </Box>
                          )
                        })}
                      </Box>
                    )
                  })()
                ) : (
                  // 单空题
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">我的答案：</Typography>
                    <Chip
                      label={q.studentAnswer || '（未作答）'}
                      size="small"
                      color={q.isCorrect ? 'success' : 'error'}
                      variant="outlined"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>正确答案：</Typography>
                    <Chip
                      label={q.correctAnswer}
                      size="small"
                      color="success"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </Card>
        ))}
      </Box>

      {/* 底部返回按钮 */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        onClick={() => navigate('/subjects')}
        startIcon={<ArrowBackIcon />}
        sx={{
          mt: 3, py: 1.5, borderRadius: 3, fontWeight: 600,
          background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
        }}
      >
        返回科目列表
      </Button>
    </Box>
  )
}
