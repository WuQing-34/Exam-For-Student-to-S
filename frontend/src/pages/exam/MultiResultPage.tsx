import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, Typography, Button, Chip, CircularProgress, Alert,
  LinearProgress, Paper,
} from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import RefreshIcon from '@mui/icons-material/Refresh'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CancelIcon from '@mui/icons-material/Cancel'
import { studentExamApi } from '../../api/exam'

interface SubjectResult {
  subject: string
  subjectName: string
  status: string
  score: number | null
  fullScore: number
  scoreRate: number | null
  sClassQualified: boolean
  submittedAt: string | null
}

export function MultiResultPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState<SubjectResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchResults = useCallback(() => {
    setLoading(true)
    setError('')
    studentExamApi.getResults().then(res => {
      if (res.data.code === 0 && res.data.data) {
        setResults(res.data.data.results)
      } else {
        setError(res.data.message || '获取成绩失败')
      }
    }).catch((err: unknown) => {
      const e = err as { message?: string }
      setError(e.message || '获取成绩失败')
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
  }

  const qualifiedCount = results.filter(r => r.sClassQualified).length
  const totalCount = results.filter(r => r.status === 'submitted').length

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: '#1a2b3c' }}>
        考试成绩
      </Typography>
      <Typography variant="body2" color="#718096" sx={{ mb: 3 }}>
        以下是您的各科目考试成绩和S班资格评定
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchResults} startIcon={<RefreshIcon />}>
              重试
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* 汇总卡片 */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          S班资格汇总：{qualifiedCount}/{totalCount} 科达标
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {results.filter(r => r.status === 'submitted').map(r => (
            <Chip
              key={r.subject}
              icon={r.sClassQualified ? <EmojiEventsIcon /> : <CancelIcon />}
              label={`${r.subjectName} ${r.sClassQualified ? '达标' : '未达标'}`}
              color={r.sClassQualified ? 'success' : 'default'}
              variant={r.sClassQualified ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Paper>

      {/* 各科详情 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {results.map(r => {
          const score = r.score ?? 0
          const pct = r.fullScore > 0 ? (score / r.fullScore) * 100 : 0

          return (
            <Card
              key={r.subject}
              sx={{
                p: 2.5, borderRadius: 3,
                border: '1px solid #e8edf2',
                borderLeft: `4px solid ${r.sClassQualified ? '#4caf50' : '#9e9e9e'}`,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>{r.subjectName}</Typography>
                  {r.status !== 'submitted' && (
                    <Chip label="未考试" size="small" variant="outlined" sx={{ mt: 0.5 }} />
                  )}
                </Box>
                {r.status === 'submitted' && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h5" fontWeight={700} color={r.sClassQualified ? 'success.main' : 'text.primary'}>
                      {score}/{r.fullScore}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {r.scoreRate}%
                    </Typography>
                  </Box>
                )}
              </Box>

              {r.status === 'submitted' && (
                <>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(pct, 100)}
                    sx={{
                      height: 8, borderRadius: 4, mb: 1.5,
                      bgcolor: '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: r.sClassQualified ? '#4caf50' : '#9e9e9e',
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {r.sClassQualified ? (
                      <Chip
                        icon={<EmojiEventsIcon />}
                        label="S班资格达标"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<CancelIcon />}
                        label="未达标（需≥60%）"
                        variant="outlined"
                        size="small"
                        sx={{ color: '#9e9e9e' }}
                      />
                    )}
                  </Box>
                </>
              )}
            </Card>
          )
        })}
      </Box>

      <Button
        variant="contained"
        fullWidth
        size="large"
        onClick={() => navigate('/subjects')}
        startIcon={<HomeIcon />}
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
