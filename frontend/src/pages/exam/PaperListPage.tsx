import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import QuizIcon from '@mui/icons-material/Quiz'
import { studentExamApi } from '../../api/exam'
import { GRADE_MAP } from '../../types'

export function PaperListPage() {
  const navigate = useNavigate()
  const [papers, setPapers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    studentExamApi.getPaperList()
      .then(res => {
        const d = res.data
        if (d.code === 0) setPapers(d.data!.list)
        else setError(d.message)
      })
      .catch(() => setError('获取试卷列表失败'))
      .finally(() => setLoading(false))
  }, [])

  const handleStart = async (item: any) => {
    if (item.status === 'completed') {
      navigate(`/exams/${item.examRecordId}/result`)
    } else if (item.status === 'in_progress') {
      navigate(`/exams/${item.id}/answer`)
    } else {
      try {
        const res = await studentExamApi.startExam(item.id)
        const d = res.data
        if (d.code === 0) {
          navigate(`/exams/${item.id}/answer`)
        } else {
          setError(d.message)
        }
      } catch (e: unknown) {
        const err = e as { message?: string }
        setError(err.message || '启动考试失败')
      }
    }
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={40} sx={{ color: '#7c4dff' }} />
        <Typography mt={2} color="#718096">正在加载试卷...</Typography>
      </Box>
    )
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />,
          label: '已完成',
          color: '#38a169',
          bgColor: '#f0fff4',
          borderColor: '#c6f6d5',
        }
      case 'in_progress':
        return {
          icon: <PendingActionsIcon sx={{ fontSize: 20 }} />,
          label: '答题中',
          color: '#dd6b20',
          bgColor: '#fffaf0',
          borderColor: '#feebc8',
        }
      default:
        return {
          icon: <PlayCircleOutlineIcon sx={{ fontSize: 20 }} />,
          label: '未开始',
          color: '#4299e1',
          bgColor: '#ebf8ff',
          borderColor: '#bee3f8',
        }
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="#1a2b3c">
          我的试卷
        </Typography>
        <Typography variant="body2" color="#718096" mt={0.5}>
          {papers.length > 0 ? `共 ${papers.length} 套试卷` : ''}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {papers.length === 0 ? (
        <Card
          sx={{
            textAlign: 'center',
            py: 8,
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <QuizIcon sx={{ fontSize: 64, color: '#cbd5e0', mb: 2 }} />
          <Typography variant="h6" color="#a0aec0" fontWeight={600}>
            暂无分配试卷
          </Typography>
          <Typography variant="body2" color="#cbd5e0" mt={1}>
            请联系辅导老师分配试卷
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {papers.map(item => {
            const statusConfig = getStatusConfig(item.status)
            return (
              <Card
                key={item.id}
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid #e8edf2',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea onClick={() => handleStart(item)} sx={{ p: 0 }}>
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-start' }, gap: { xs: 1.5, sm: 0 } }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 2,
                              background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <AssignmentIcon sx={{ color: '#fff', fontSize: 24 }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="subtitle1"
                              fontWeight={600}
                              color="#1a2b3c"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.paperTitle}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                              <Chip
                                label={GRADE_MAP[item.paperGrade as keyof typeof GRADE_MAP] || item.paperGrade}
                                size="small"
                                sx={{
                                  height: 24,
                                  fontSize: '0.75rem',
                                  bgcolor: '#f7fafc',
                                  color: '#4a5568',
                                  fontWeight: 500,
                                }}
                              />
                              <Chip
                                label={`满分 ${item.paperTotalScore}`}
                                size="small"
                                sx={{
                                  height: 24,
                                  fontSize: '0.75rem',
                                  bgcolor: '#ebf8ff',
                                  color: '#2b6cb0',
                                  fontWeight: 500,
                                }}
                              />
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, ml: { xs: 6, sm: 2 }, flexShrink: 0, display: 'flex', alignItems: { xs: 'center', sm: 'flex-start' }, gap: 1.5 }}>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              bgcolor: statusConfig.bgColor,
                              color: statusConfig.color,
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              border: `1px solid ${statusConfig.borderColor}`,
                            }}
                          >
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Box>
                          {item.status === 'completed' && (
                            <Typography
                              variant="h6"
                              fontWeight={700}
                              sx={{ color: '#38a169', mt: 1, display: 'block' }}
                            >
                              {item.score} 分
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
