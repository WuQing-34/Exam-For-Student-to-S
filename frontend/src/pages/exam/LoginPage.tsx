import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  Fade,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import SchoolIcon from '@mui/icons-material/School'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import { studentExamApi } from '../../api/exam'
import { useStudentStore } from '../../store/studentStore'

const REMEMBER_KEY = 'exam_remember'

interface RememberData {
  name: string
  phone: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useStudentStore()
  const [form, setForm] = useState({ name: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(REMEMBER_KEY)
      if (stored) {
        const data: RememberData = JSON.parse(stored)
        if (data.name && data.phone) {
          setForm({ name: data.name, phone: data.phone })
          setRememberMe(true)
        }
      }
    } catch { /* ignore */ }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name || !form.phone) {
      setError('请输入微信昵称和手机号')
      return
    }

    setLoading(true)
    try {
      const res = await studentExamApi.login(form)
      const d = res.data
      if (d.code === 0 && d.data) {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ name: form.name, phone: form.phone }))
        } else {
          localStorage.removeItem(REMEMBER_KEY)
        }
        login(d.data.studentId, d.data.name, d.data.grade, d.data.subjects)
        navigate('/subjects')
      } else {
        setError(d.message)
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: { xs: 0, sm: 2 },
      }}
    >
      <Fade in timeout={600}>
        <Card
          sx={{
            width: '100%',
            maxWidth: 420,
            borderRadius: { xs: 0, sm: 4 },
            overflow: 'visible',
            boxShadow: { xs: 'none', sm: '0 20px 60px rgba(0,0,0,0.3)' },
            minHeight: { xs: '100vh', sm: 'auto' },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
              p: 4,
              textAlign: 'center',
              borderRadius: { xs: 0, sm: '16px 16px 0 0' },
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <SchoolIcon sx={{ fontSize: 36, color: '#fff' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="#fff">
              在线考试系统
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
              欢迎参加考试，请登录后开始
            </Typography>
          </Box>

          <Box sx={{ p: { xs: 2.5, sm: 3 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <TextField
                fullWidth
                sx={{ mb: 2.5 }}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="请输入微信昵称"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: '#a0aec0', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                sx={{ mb: 2 }}
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="请输入手机号"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon sx={{ color: '#a0aec0', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    size="small"
                    sx={{ color: '#a0aec0', '&.Mui-checked': { color: '#1976d2' } }}
                  />
                }
                label={<Typography variant="body2" color="#718096">记住我</Typography>}
                sx={{ mb: 2, ml: -0.5 }}
              />

              <Box sx={{ flex: 1 }} />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 3,
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
                  boxShadow: '0 4px 15px rgba(25, 118, 210, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #651fff 100%)',
                    boxShadow: '0 6px 20px rgba(25, 118, 210, 0.5)',
                  },
                }}
              >
                {loading ? '登录中...' : '进入考试'}
              </Button>
            </form>

            <Box textAlign="center" mt={2}>
              <Typography variant="body2" color="#718096">
                还没有账号？{' '}
                <Link to="/register" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
                  立即注册
                </Link>
              </Typography>
            </Box>
          </Box>
        </Card>
      </Fade>
    </Box>
  )
}
