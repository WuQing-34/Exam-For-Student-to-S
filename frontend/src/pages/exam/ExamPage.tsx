import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation, useBlocker } from 'react-router-dom'
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  // 用 ref 持有最新答案，避免定时器闭包问题
  const answersRef = useRef(answers)
  useEffect(() => { answersRef.current = answers }, [answers])

  const subjectName = SUBJECT_MAP[subject as keyof typeof SUBJECT_MAP] || subject || ''

  // ─── 加载考试（含已保存草稿答案恢复）───
  const loadExam = useCallback(async () => {
    if (!examId || examId === loadedExamId) return
    setLoading(true)
    setQuestions([])
    setAnswers([])
    try {
      const res = await studentExamApi.getExamContent(examId)
      if (res.data.code === 0 && res.data.data) {
        if (res.data.data.status === 'submitted') {
          navigate('/results', { replace: true })
          return
        }
        setQuestions(res.data.data.questions)
        // 恢复草稿答案
        const saved = res.data.data.savedAnswers
        if (saved && saved.length > 0) {
          setAnswers(saved)
        }
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
  }, [examId, loadedExamId, navigate])

  useEffect(() => {
    loadExam()
  }, [loadExam])

  // ─── 保存草稿（带重试）───
  const doSaveDraft = useCallback(async () => {
    if (!examId || submitting) return
    // 最多重试 2 次
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await studentExamApi.saveDraft(examId, answersRef.current)
        setLastSaved(new Date())
        return
      } catch {
        if (attempt === 0) {
          // 第一次失败等 1 秒重试
          await new Promise(r => setTimeout(r, 1000))
        }
      }
    }
  }, [examId, submitting])

  // ─── 自动保存草稿（每 30 秒）───
  useEffect(() => {
    if (!examId || loading) return
    const timer = setInterval(() => { doSaveDraft() }, 30000)
    return () => clearInterval(timer)
  }, [examId, loading, doSaveDraft])

  // ─── 标签页切换时即时保存 ───
  useEffect(() => {
    if (!examId || loading) return
    const handleVisibility = () => {
      if (document.hidden) {
        doSaveDraft()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [examId, loading, doSaveDraft])

  // ─── 退出登录前保存草稿（响应 StudentLayout 事件）───
  useEffect(() => {
    if (!examId) return
    const handler = () => { doSaveDraft() }
    window.addEventListener('exam:save-draft', handler)
    return () => window.removeEventListener('exam:save-draft', handler)
  }, [examId, doSaveDraft])

  // ─── beforeunload：拦截浏览器关闭/刷新（提交中时解除） ───
  useEffect(() => {
    if (submitting) return // 提交中不拦截，避免干扰 XHR
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '考试进行中，离开将丢失未保存的答案，确定要离开吗？'
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [submitting])

  // ─── useBlocker：拦截 SPA 路由跳转 ───
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname && !submitting
  )

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

  // ─── 离开前保存草稿并确认离开 ───
  const handleBlockerConfirm = async () => {
    await doSaveDraft()
    blocker.proceed?.()
  }

  const handleBlockerCancel = () => {
    blocker.reset?.()
  }

  const handleSubmit = async () => {
    if (!examId) return
    setConfirmOpen(false)
    setSubmitting(true)
    try {
      const res = await studentExamApi.submitExam(examId, answers)
      if (res.data.code === 0) {
        const subjectsRes = await studentExamApi.getSubjects()
        if (subjectsRes.data.code === 0 && subjectsRes.data.data) {
          const list = subjectsRes.data.data.subjects
          const nextSubject = list.find(s => s.status !== 'submitted')
          if (nextSubject) {
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
            navigate('/subjects', { replace: true })
            return
          }
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
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              {answeredCount}/{questions.length} 已答
            </Typography>
            {lastSaved && (
              <Typography variant="caption" color="success.main">
                已自动保存 {lastSaved.toLocaleTimeString()}
              </Typography>
            )}
          </Box>
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

      {/* 提交确认弹窗 */}
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

      {/* 路由离开确认弹窗（useBlocker） */}
      <Dialog open={blocker.state === 'blocked'} onClose={handleBlockerCancel}>
        <DialogTitle>⚠️ 确认离开考试？</DialogTitle>
        <DialogContent>
          <Typography>
            您正在考试中，离开前将自动保存答案草稿。
            下次回来可从第三方继续作答。确定要离开吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBlockerCancel} variant="contained" color="primary">
            继续答题
          </Button>
          <Button onClick={handleBlockerConfirm} color="warning">
            保存并离开
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
