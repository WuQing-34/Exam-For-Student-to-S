import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SendIcon from '@mui/icons-material/Send'
import QuizIcon from '@mui/icons-material/Quiz'
import { studentExamApi } from '../../api/exam'
import { useExamStore } from '../../store/examStore'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { QuestionContent } from '../../components/ui/QuestionContent'
import { QuestionNav } from './QuestionNav'

// 科目中文映射
const SUBJECT_DISPLAY: Record<string, string> = {
  chinese: '语文',
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
}

const TYPE_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  choice: { label: '选择题', color: '#2b6cb0', bg: '#ebf8ff' },
  fill: { label: '填空题', color: '#2f855a', bg: '#f0fff4' },
  essay: { label: '简答题', color: '#9b2c2c', bg: '#fff5f5' },
}

/** 自动保存间隔：30秒 */
const AUTO_SAVE_INTERVAL_MS = 30_000

interface Question {
  id: number
  type: string
  content: string
  options: Array<{ label: string; text: string }> | null
  score: number
  order_num: number
  subject?: string
}

interface SubjectGroup {
  subject: string
  subjectName: string
  questions: Question[]
  startIndex: number
}

export function ExamPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const assignmentId = parseInt(id || '0')

  const {
    currentIndex,
    answers,
    examRecordId,
    setQuestions,
    setCurrentIndex,
    setAnswer,
    getAnswer,
    setExamRecord,
    getUnansweredCount,
  } = useExamStore()

  const [questions, setLocalQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
  const [grading, setGrading] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 按科目分组
  const subjectGroups = useMemo<SubjectGroup[]>(() => {
    const groups: SubjectGroup[] = []
    let currentSubject: string | null = null
    let currentGroup: SubjectGroup | null = null
    let flatIndex = 0

    for (const q of questions) {
      const subject = q.subject || ''
      if (subject !== currentSubject) {
        currentSubject = subject
        currentGroup = {
          subject,
          subjectName: SUBJECT_DISPLAY[subject] || subject,
          questions: [],
          startIndex: flatIndex,
        }
        groups.push(currentGroup)
      }
      currentGroup!.questions.push(q)
      flatIndex++
    }

    return groups
  }, [questions])

  const currentGroupIndex = useMemo(() => {
    for (let i = 0; i < subjectGroups.length; i++) {
      const g = subjectGroups[i]
      if (currentIndex >= g.startIndex && currentIndex < g.startIndex + g.questions.length) {
        return i
      }
    }
    return 0
  }, [currentIndex, subjectGroups])

  const currentGroup = subjectGroups[currentGroupIndex] ?? null
  const currentInGroupIndex = currentGroup
    ? currentIndex - currentGroup.startIndex
    : 0

  // ---------- 静默自动保存 ----------
  const silentSave = useCallback(async () => {
    if (!examRecordId || answers.length === 0) return
    try {
      await studentExamApi.submitAnswers(examRecordId, answers, 'save')
    } catch {
      // 静默保存失败不提示用户，避免干扰答题
    }
  }, [examRecordId, answers])

  useEffect(() => {
    autoSaveTimerRef.current = setInterval(silentSave, AUTO_SAVE_INTERVAL_MS)
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [silentSave])

  // ---------- 防刷新/关闭提示 ----------
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // 现代浏览器要求 returnValue 被设置
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // ---------- 加载考试 + 恢复已答选项 ----------
  useEffect(() => {
    const loadExam = async () => {
      try {
        const startRes = await studentExamApi.startExam(assignmentId)
        const startD = startRes.data
        if (startD.code !== 0) {
          setError(startD.message)
          return
        }

        setExamRecord(startD.data!.examRecordId, startD.data!.startedAt)

        const contentRes = await studentExamApi.getExamContent(assignmentId)
        const contentD = contentRes.data
        if (contentD.code === 0) {
          const qs = contentD.data!.questions as Question[]
          setLocalQuestions(qs)
          setQuestions(qs.map((q: Question) => ({ id: q.id })))

          // 恢复已保存的答案
          const examRecord = contentD.data!.examRecord
          if (examRecord && (examRecord as Record<string, unknown>).answers) {
            try {
              const savedAnswers = JSON.parse(
                String((examRecord as Record<string, unknown>).answers)
              ) as Array<{ questionId: number; answer: string }>
              for (const a of savedAnswers) {
                if (a.questionId && a.answer) {
                  setAnswer(a.questionId, a.answer)
                }
              }
            } catch {
              // 答案解析失败，忽略，从零开始作答
            }
          }
        }
      } catch (e: unknown) {
        const err = e as { message?: string }
        setError(err.message || '加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadExam()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- 构建答案 Map 供 QuestionNav 使用 ----------
  const answersMap = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    for (const a of answers) {
      map[a.questionId] = a.answer
    }
    return map
  }, [answers])

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={40} sx={{ color: '#7c4dff' }} />
        <Typography mt={2} color="#718096">正在加载试卷...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4, borderRadius: 2 }}>
        {error}
        <Button onClick={() => navigate('/exams')} sx={{ ml: 2 }}>返回列表</Button>
      </Alert>
    )
  }

  if (grading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={64} sx={{ color: '#7c4dff' }} />
        <Typography variant="h6" mt={3} fontWeight={600} color="#4a5568">
          系统正在自动判分中
        </Typography>
        <Typography variant="body2" color="#a0aec0" mt={1}>
          请稍候，即将跳转到成绩页面...
        </Typography>
      </Box>
    )
  }

  const q = questions[currentIndex]
  if (!q) return null

  const total = questions.length
  const unanswered = getUnansweredCount()
  const answered = total - unanswered
  const isMultiSubject = subjectGroups.length > 1
  const group = currentGroup
  const typeConfig = TYPE_DISPLAY[q.type] || TYPE_DISPLAY.choice

  const handleSubmit = async (confirmed: boolean) => {
    setSubmitConfirmOpen(false)
    if (!confirmed) return
    if (!examRecordId) {
      setError('考试记录不存在')
      return
    }

    // 提交前先清除自动保存定时器，避免竞态
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    setGrading(true)
    try {
      const res = await studentExamApi.submitAnswers(examRecordId, answers, 'submit')
      const d = res.data
      if (d.code === 0) {
        navigate(`/exams/${examRecordId}/result`)
      } else {
        setError(d.message)
        setGrading(false)
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err.message || '提交失败')
      setGrading(false)
    }
  }

  const prevQuestion = currentIndex > 0 ? questions[currentIndex - 1] : null
  const isSubjectBoundary = prevQuestion && prevQuestion.subject !== q.subject

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      {/* 答题主区域 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* 科目导航 */}
        {isMultiSubject && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              mb: 3,
              p: 1.5,
              bgcolor: '#fff',
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            {subjectGroups.map((g, gi) => {
              const isActive = gi === currentGroupIndex
              const isDone = currentIndex > g.startIndex + g.questions.length - 1
              return (
                <Chip
                  key={g.subject}
                  label={`${g.subjectName} (${g.questions.length}题)`}
                  onClick={() => setCurrentIndex(g.startIndex)}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.85rem',
                    px: 1,
                    borderRadius: 2,
                    border: isActive ? '2px solid' : '1px solid',
                    borderColor: isActive ? '#7c4dff' : '#e2e8f0',
                    bgcolor: isActive ? '#f5f3ff' : '#fff',
                    color: isActive ? '#7c4dff' : isDone ? '#38a169' : '#718096',
                    '&:hover': {
                      bgcolor: isActive ? '#ede9fe' : '#f7fafc',
                    },
                  }}
                />
              )
            })}
          </Box>
        )}

        {/* 进度区域 */}
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: '#fff',
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="body2" color="#4a5568" fontWeight={600}>
              {isMultiSubject && (
                <Box
                  component="span"
                  sx={{
                    color: '#7c4dff',
                    fontWeight: 700,
                    mr: 1,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: '#f5f3ff',
                    fontSize: '0.8rem',
                  }}
                >
                  {group?.subjectName}
                </Box>
              )}
              第 {currentInGroupIndex + 1} / {group?.questions.length} 题
              {isMultiSubject && (
                <Box component="span" sx={{ ml: 1, color: '#a0aec0', fontWeight: 400 }}>
                  （全卷第 {currentIndex + 1} / {total} 题）
                </Box>
              )}
            </Typography>
            <Typography variant="body2" sx={{ color: unanswered > 0 ? '#e53e3e' : '#38a169', fontWeight: 600 }}>
              {unanswered > 0 ? `未答 ${unanswered} 题` : '全部已答'}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={total > 0 ? (answered / total) * 100 : 0}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: '#edf2f7',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: unanswered === 0
                  ? 'linear-gradient(90deg, #38a169 0%, #68d391 100%)'
                  : 'linear-gradient(90deg, #7c4dff 0%, #b794f4 100%)',
              },
            }}
          />
          {isMultiSubject && group && (
            <LinearProgress
              variant="determinate"
              value={group.questions.length > 0 ? ((currentInGroupIndex + 1) / group.questions.length) * 100 : 0}
              sx={{
                height: 4,
                borderRadius: 2,
                mt: 1,
                bgcolor: '#f7fafc',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #1976d2 0%, #64b5f6 100%)',
                },
              }}
            />
          )}
        </Box>

        {/* 科目切换提示 */}
        {isSubjectBoundary && isMultiSubject && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              borderRadius: 2,
              bgcolor: '#ebf8ff',
              color: '#2b6cb0',
              '& .MuiAlert-icon': { color: '#4299e1' },
            }}
          >
            已进入 <strong>{SUBJECT_DISPLAY[q.subject || ''] || q.subject}</strong> 科目部分
          </Alert>
        )}

        {/* 题目卡片 — 带 id 供导航栏滚动定位 */}
        <Box id={`q-${currentIndex}`}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 3,
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e8edf2',
            }}
          >
            {/* 题目类型标签 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Chip
                label={typeConfig.label}
                size="small"
                sx={{
                  fontWeight: 600,
                  bgcolor: typeConfig.bg,
                  color: typeConfig.color,
                  border: `1px solid ${typeConfig.color}20`,
                }}
              />
              <Chip
                label={`${q.score} 分`}
                size="small"
                sx={{
                  fontWeight: 600,
                  bgcolor: '#fefcbf',
                  color: '#975a16',
                  border: '1px solid #fefcbf',
                }}
              />
            </Box>

            <QuestionContent content={q.content} sx={{ fontSize: '1.05em', lineHeight: 1.9, color: '#2d3748' }} />

            {/* 选择题 */}
            {q.type === 'choice' && q.options && (
              <RadioGroup
                value={getAnswer(q.id)}
                onChange={(_, v) => setAnswer(q.id, v)}
                sx={{ mt: 2 }}
              >
                {q.options.map(opt => {
                  const isSelected = getAnswer(q.id) === opt.label
                  return (
                    <FormControlLabel
                      key={opt.label}
                      value={opt.label}
                      control={
                        <Radio
                          sx={{
                            '&.Mui-checked': { color: '#7c4dff' },
                          }}
                        />
                      }
                      label={
                        <Typography sx={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? '#2d3748' : '#4a5568' }}>
                          <Box component="span" sx={{ fontWeight: 700, mr: 0.5, color: '#7c4dff' }}>
                            {opt.label}.
                          </Box>
                          {opt.text}
                        </Typography>
                      }
                      sx={{
                        m: { xs: 0, sm: 0.5 },
                        p: 1.5,
                        px: 2,
                        borderRadius: 2,
                        bgcolor: isSelected ? '#f5f3ff' : '#fafafa',
                        border: '1px solid',
                        borderColor: isSelected ? '#d6bcfa' : '#edf2f7',
                        width: { xs: '100%', sm: '100%' },
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          bgcolor: isSelected ? '#ede9fe' : '#f7fafc',
                          borderColor: isSelected ? '#c4b5fd' : '#e2e8f0',
                        },
                      }}
                    />
                  )
                })}
              </RadioGroup>
            )}

            {/* 填空题 */}
            {q.type === 'fill' && (
              <TextField
                fullWidth
                placeholder="请输入答案"
                value={getAnswer(q.id)}
                onChange={e => setAnswer(q.id, e.target.value)}
                sx={{
                  mt: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&.Mui-focused fieldset': { borderColor: '#7c4dff' },
                  },
                }}
              />
            )}

            {/* 简答题 */}
            {q.type === 'essay' && (
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="请输入答案"
                value={getAnswer(q.id)}
                onChange={e => setAnswer(q.id, e.target.value)}
                sx={{
                  mt: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&.Mui-focused fieldset': { borderColor: '#7c4dff' },
                  },
                }}
              />
            )}
          </Paper>
        </Box>

        {/* 导航按钮 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(currentIndex - 1)}
            sx={{
              px: 3,
              py: 1.2,
              borderRadius: 2.5,
              fontWeight: 600,
              color: '#4a5568',
              borderColor: '#e2e8f0',
              '&:hover': { borderColor: '#a0aec0', bgcolor: '#f7fafc' },
              '&.Mui-disabled': { color: '#cbd5e0', borderColor: '#edf2f7' },
            }}
          >
            上一题
          </Button>

          <Typography variant="body2" color="#a0aec0" sx={{ display: { xs: 'none', sm: 'block' } }}>
            <QuizIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            {answered}/{total}
          </Typography>

          {currentIndex === total - 1 ? (
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={() => setSubmitConfirmOpen(true)}
              sx={{
                px: 3,
                py: 1.2,
                borderRadius: 2.5,
                fontWeight: 600,
                background: unanswered > 0
                  ? 'linear-gradient(135deg, #e53e3e 0%, #fc8181 100%)'
                  : 'linear-gradient(135deg, #38a169 0%, #68d391 100%)',
                boxShadow: unanswered > 0
                  ? '0 4px 15px rgba(229, 62, 62, 0.3)'
                  : '0 4px 15px rgba(56, 161, 105, 0.3)',
                '&:hover': {
                  background: unanswered > 0
                    ? 'linear-gradient(135deg, #c53030 0%, #f56565 100%)'
                    : 'linear-gradient(135deg, #2f855a 0%, #48bb78 100%)',
                },
              }}
            >
              交卷
            </Button>
          ) : (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setCurrentIndex(currentIndex + 1)}
              sx={{
                px: 3,
                py: 1.2,
                borderRadius: 2.5,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #7c4dff 0%, #b794f4 100%)',
                boxShadow: '0 4px 15px rgba(124, 77, 255, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #6b46c1 0%, #9f7aea 100%)',
                },
              }}
            >
              下一题
            </Button>
          )}
        </Box>
      </Box>

      {/* 题目导航栏：桌面端右侧固定，移动端底部固定 */}
      <Box
        sx={{
          display: { xs: 'block', md: 'block' },
          position: { xs: 'fixed', md: 'sticky' },
          bottom: { xs: 0, md: 'auto' },
          left: { xs: 0, md: 'auto' },
          right: { xs: 0, md: 'auto' },
          top: { xs: 'auto', md: 80 },
          zIndex: { xs: 1100, md: 'auto' },
          width: { xs: '100%', md: 220 },
          flexShrink: 0,
          maxHeight: { md: 'calc(100vh - 120px)' },
          overflowY: 'auto',
          borderRadius: { md: 0 },
          // 移动端底部栏增加边框和阴影以区分内容
          borderTop: { xs: '1px solid #e8edf2', md: 'none' },
          boxShadow: { xs: '0 -2px 10px rgba(0,0,0,0.08)', md: 'none' },
          bgcolor: { xs: '#fff', md: 'transparent' },
        }}
      >
        <QuestionNav
          questions={questions.map(q => ({ id: q.id }))}
          answers={answersMap}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
        />
      </Box>

      {/* 移动端底部留白，避免导航栏遮挡内容 */}
      <Box sx={{ height: { xs: 200, md: 0 }, flexShrink: 0, display: { xs: 'block', md: 'none' } }} />

      {/* 提交确认弹窗 */}
      <ConfirmDialog
        open={submitConfirmOpen}
        title="确认交卷"
        message={
          unanswered > 0
            ? `您还有 ${unanswered} 道题未作答，是否确认交卷？`
            : '确认要提交试卷吗？提交后将无法修改。'
        }
        confirmText="确认交卷"
        cancelText="返回检查"
        onConfirm={() => handleSubmit(true)}
        onCancel={() => handleSubmit(false)}
      />
    </Box>
  )
}
