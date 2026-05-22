import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Box, Typography, Button, Radio, RadioGroup, FormControlLabel,
  FormControl, TextField, LinearProgress, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Card, Paper,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { studentExamApi } from '../../api/exam'
import { SUBJECT_MAP } from '../../types'

interface Question {
  id: number
  type: string
  content: string
  options: Array<{ label: string; text: string }> | null
}

export function ExamPage() {
  const { subject } = useParams<{ subject: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const stateExamId = (location.state as { examId?: number })?.examId

  const examId = stateExamId ?? null
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Array<{ questionId: number; answer: string }>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loadedExamId, setLoadedExamId] = useState<number | null>(null)

  const subjectName = SUBJECT_MAP[subject as keyof typeof SUBJECT_MAP] || subject || ''

  const loadExam = useCallback(async () => {
    if (!examId || examId === loadedExamId) return
    setLoading(true)
    setQuestions([])
    setAnswers([])
    try {
      const res = await studentExamApi.getExamContent(examId)
      if (res.data.code === 0 && res.data.data) {
        // 已提交的考试 → 直接跳转成绩页
        if (res.data.data.status === 'submitted') {
          navigate('/results', { replace: true })
          return
        }
        setQuestions(res.data.data.questions)
        setLoadedExamId(examId)
      } else {
        setError(res.data.message || '考试记录不存在')
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || '加载考试失败')
    } finally {
      setLoading(false)
    }
  }, [examId, loadedExamId])

  useEffect(() => {
    loadExam()
  }, [loadExam])

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => {
      const idx = prev.findIndex(a => a.questionId === questionId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { questionId, answer }
        return next
      }
      return [...prev, { questionId, answer }]
    })
  }

  const getAnswer = (questionId: number) => {
    return answers.find(a => a.questionId === questionId)?.answer ?? ''
  }

  const answeredCount = answers.filter(a => a.answer.trim()).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  const handleSubmit = async () => {
    if (!examId) return
    setConfirmOpen(false)
    setSubmitting(true)
    try {
      const res = await studentExamApi.submitExam(examId, answers)
      if (res.data.code === 0) {
        // 获取所有科目状态，找下一个未考科目
        const subjectsRes = await studentExamApi.getSubjects()
        if (subjectsRes.data.code === 0 && subjectsRes.data.data) {
          const list = subjectsRes.data.data.subjects
          const nextSubject = list.find(s => s.status !== 'submitted')
          if (nextSubject) {
            // 自动开始下一科
            try {
              const startRes = await studentExamApi.startExam(nextSubject.subject)
              if (startRes.data.code === 0 && startRes.data.data) {
                navigate(`/exam/${nextSubject.subject}`, {
                  state: { examId: startRes.data.data.examId },
                  replace: true,
                })
                return
              }
            } catch { /* 自动开始失败，回科目列表 */ }
            // 自动开始失败，回到科目列表让用户手动开始
            navigate('/subjects', { replace: true })
            return
          }
          // 全部考完 → 成绩汇总
          navigate('/results', { replace: true })
        } else {
          navigate('/subjects', { replace: true })
        }
      } else {
        setError(res.data.message)
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
  }

  return (
    <Box>
      {/* 科目标题 + 进度条 */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" fontWeight={700}>{subjectName} 考试</Typography>
          <Typography variant="body2" color="text.secondary">
            {answeredCount}/{questions.length} 已答
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* 题目列表 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {questions.map((q, idx) => (
          <Card key={q.id} sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e8edf2' }}>
            <Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>
              第 {idx + 1} 题 ({q.type === 'choice' ? '选择题' : '填空题'})
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>{q.content}</Typography>

            {q.type === 'choice' && q.options ? (
              <FormControl component="fieldset">
                <RadioGroup
                  value={getAnswer(q.id)}
                  onChange={e => handleAnswerChange(q.id, e.target.value)}
                >
                  {q.options.map(opt => (
                    <FormControlLabel
                      key={opt.label}
                      value={opt.label}
                      control={<Radio />}
                      label={`${opt.label}. ${opt.text}`}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            ) : (
              <TextField
                fullWidth
                size="small"
                value={getAnswer(q.id)}
                onChange={e => handleAnswerChange(q.id, e.target.value)}
                placeholder="请输入答案"
              />
            )}
          </Card>
        ))}
      </Box>

      {/* 提交按钮 */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        onClick={() => setConfirmOpen(true)}
        disabled={submitting}
        sx={{
          mt: 3, py: 1.5, borderRadius: 3, fontWeight: 600,
          background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
        }}
        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
      >
        {submitting ? '提交中...' : '提交考试'}
      </Button>

      {/* 确认弹窗 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>确认提交</DialogTitle>
        <DialogContent>
          <Typography>
            已答 {answeredCount}/{questions.length} 题，
            还有 {questions.length - answeredCount} 题未答。
            提交后不可修改，确认提交？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            确认提交
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
