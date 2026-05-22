import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, Typography, Button, Chip, CircularProgress, Alert, Fade,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { studentExamApi } from '../../api/exam'
import { useStudentStore } from '../../store/studentStore'

interface SubjectInfo {
  subject: string
  subjectName: string
  status: string
  score: number | null
  fullScore: number
  scoreRate: number | null
  sClassQualified: boolean
  examId: number | null
}

export function SubjectListPage() {
  const navigate = useNavigate()
  const { subjects: mySubjects } = useStudentStore()
  const [subjectList, setSubjectList] = useState<SubjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startingSubject, setStartingSubject] = useState<string | null>(null)

  const fetchSubjects = async () => {
    try {
      const res = await studentExamApi.getSubjects()
      if (res.data.code === 0 && res.data.data) {
        setSubjectList(res.data.data.subjects)
      } else {
        setError(res.data.message)
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || '获取科目失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  const allSubmitted = subjectList.every(s => s.status === 'submitted')

  const handleStartExam = async (subject: string) => {
    setStartingSubject(subject)
    try {
      const res = await studentExamApi.startExam(subject)
      if (res.data.code === 0 && res.data.data) {
        navigate(`/exam/${subject}`, { state: { examId: res.data.data.examId } })
      } else {
        setError(res.data.message)
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || '开始考试失败')
    } finally {
      setStartingSubject(null)
    }
  }

  const handleViewResults = () => {
    navigate('/results')
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: '#1a2b3c' }}>
        我的考试科目
      </Typography>
      <Typography variant="body2" color="#718096" sx={{ mb: 3 }}>
        {mySubjects.length > 0
          ? `已报名 ${mySubjects.length} 个科目，点击科目卡片开始考试`
          : '暂无报名科目'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* 全考完提示 */}
      {allSubmitted && subjectList.length > 0 && (
        <Alert
          severity="success"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={handleViewResults}>
              查看成绩
            </Button>
          }
        >
          所有科目已考完！
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {subjectList.map(s => {
          const isSubmitted = s.status === 'submitted'
          const isInProgress = s.status === 'in_progress'
          const hasStarted = isSubmitted || isInProgress

          return (
            <Fade in key={s.subject}>
              <Card
                sx={{
                  p: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 3,
                  border: '1px solid #e8edf2',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  {/* 状态图标 */}
                  <Box
                    sx={{
                      width: 48, height: 48, borderRadius: '50%',
                      bgcolor: isSubmitted
                        ? (s.sClassQualified ? '#e8f5e9' : '#f5f5f5')
                        : '#e3f2fd',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isSubmitted ? (
                      s.sClassQualified
                        ? <EmojiEventsIcon sx={{ color: '#4caf50' }} />
                        : <CheckCircleIcon sx={{ color: '#9e9e9e' }} />
                    ) : (
                      <PlayArrowIcon sx={{ color: '#1976d2' }} />
                    )}
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ color: '#1a2b3c' }}>
                      {s.subjectName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      {isSubmitted ? (
                        <>
                          <Chip
                            label={`${s.score}/${s.fullScore}`}
                            size="small"
                            color={s.sClassQualified ? 'success' : 'default'}
                            variant="filled"
                          />
                          <Chip
                            label={`${s.scoreRate}%`}
                            size="small"
                            variant="outlined"
                            color={s.sClassQualified ? 'success' : 'default'}
                          />
                          {s.sClassQualified && (
                            <Chip
                              label="S班达标"
                              size="small"
                              color="success"
                              icon={<EmojiEventsIcon />}
                            />
                          )}
                        </>
                      ) : isInProgress ? (
                        <Chip label="进行中" size="small" color="primary" variant="outlined" />
                      ) : (
                        <Chip label="未开始" size="small" variant="outlined" />
                      )}
                    </Box>
                  </Box>
                </Box>

                <Button
                  variant={hasStarted ? 'outlined' : 'contained'}
                  size="medium"
                  disabled={startingSubject === s.subject}
                  onClick={() => {
                    if (isSubmitted) {
                      navigate(`/exam/${s.subject}`, { state: { examId: s.examId } })
                    } else {
                      handleStartExam(s.subject)
                    }
                  }}
                  sx={{
                    minWidth: 90,
                    borderRadius: 2,
                    fontWeight: 600,
                    ml: 2,
                    flexShrink: 0,
                  }}
                >
                  {startingSubject === s.subject ? (
                    <CircularProgress size={20} />
                  ) : isSubmitted ? '查看' : isInProgress ? '继续' : '开始'}
                </Button>
              </Card>
            </Fade>
          )
        })}
      </Box>

      {/* 全部考完：查看成绩按钮 */}
      {allSubmitted && subjectList.length > 0 && (
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleViewResults}
          sx={{
            mt: 3, py: 1.5, borderRadius: 3, fontWeight: 600,
            background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
          }}
        >
          查看成绩汇总
        </Button>
      )}
    </Box>
  )
}
