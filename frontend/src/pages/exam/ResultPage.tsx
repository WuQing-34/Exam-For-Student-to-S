// @ts-nocheck - 旧版成绩页，已由 MultiResultPage 替代
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import StarIcon from '@mui/icons-material/Star'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { studentExamApi } from '../../api/exam'

export function ResultPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    studentExamApi.getResult(examRecordId)
      .then(res => {
        const d = res.data
        if (d.code === 0) setResult(d.data)
        else setError(d.message)
      })
      .catch(() => setError('获取成绩失败'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={40} sx={{ color: '#7c4dff' }} />
        <Typography mt={2} color="#718096">正在加载成绩...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4, borderRadius: 2 }}>
        {error}
      </Alert>
    )
  }

  if (!result) return null

  const isPerfect = result.total_score === result.total_full_score

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e8edf2',
          overflow: 'hidden',
        }}
      >
        {/* 成绩头部 */}
        <Box
          sx={{
            py: 5,
            px: 3,
            background: isPerfect
              ? 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.05)' },
                '100%': { transform: 'scale(1)' },
              },
            }}
          >
            {isPerfect ? (
              <EmojiEventsIcon sx={{ fontSize: 44, color: '#fff' }} />
            ) : (
              <StarIcon sx={{ fontSize: 44, color: '#fff' }} />
            )}
          </Box>
          <Typography variant="h5" fontWeight={700} color="#fff" mb={1}>
            {isPerfect ? '满分！太棒了！' : '考试完成'}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            满分 {result.total_full_score} 分
          </Typography>
        </Box>

        <CardContent sx={{ py: 4 }}>
          {/* 总分 */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h1" fontWeight={800} sx={{ fontSize: { xs: '4rem', sm: '5.5rem' }, color: '#1a2b3c', lineHeight: 1.1 }}>
              {result.total_score}
            </Typography>
            <Typography variant="body2" color="#a0aec0" mt={1}>
              总得分 / {result.total_full_score}
            </Typography>
          </Box>

          {/* S班资格 */}
          {result.s_class_qualified !== undefined && (
            <Box sx={{ mb: 4 }}>
              <Chip
                icon={<StarIcon />}
                label={result.s_class_qualified ? '恭喜！获得 S班 报名资格' : 'S班资格：所有科目需≥60%'}
                color={result.s_class_qualified ? 'warning' : 'default'}
                sx={{
                  fontSize: '0.95rem',
                  py: 2.5,
                  px: 1,
                  borderRadius: 2.5,
                  fontWeight: result.s_class_qualified ? 600 : 400,
                }}
              />
            </Box>
          )}

          {/* 分科成绩 */}
          {result.subject_scores && result.subject_scores.length > 0 && (
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="h6" fontWeight={700} color="#1a2b3c" mb={2}>
                分科成绩
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {result.subject_scores.map(ss => (
                  <Box
                    key={ss.subject}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      px: 2.5,
                      bgcolor: '#f7fafc',
                      borderRadius: 2.5,
                      border: '1px solid #edf2f7',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: '#edf2f7',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography fontWeight={700} color="#2d3748">
                        {ss.subject_name}
                      </Typography>
                      {ss.score_rate >= 60 && (
                        <Chip
                          label="达标"
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: '#f0fff4',
                            color: '#38a169',
                            borderRadius: 1.5,
                          }}
                        />
                      )}
                    </Box>
                    <Typography fontWeight={700} color={ss.score_rate >= 60 ? '#2f855a' : '#e53e3e'}>
                      {ss.score} / {ss.full_score}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 4 }} />

          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/exams')}
            sx={{
              px: 4,
              py: 1.2,
              borderRadius: 2.5,
              fontWeight: 600,
              color: '#4a5568',
              borderColor: '#e2e8f0',
              '&:hover': { borderColor: '#a0aec0', bgcolor: '#f7fafc' },
            }}
          >
            返回试卷列表
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}
