import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
} from '@mui/material'
import { useAuthStore } from '../../store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/admin/dashboard')
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || '登录失败')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
      }}
    >
      <Card sx={{ width: 400, p: 2 }}>
        <CardContent>
          <Typography variant="h5" fontWeight="bold" textAlign="center" mb={3}>
            在线考试系统
          </Typography>
          <Typography variant="h6" textAlign="center" mb={3}>
            管理端登录
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              label="邮箱前缀"
              fullWidth
              margin="normal"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="请输入邮箱前缀"
            />
            <TextField
              label="密码"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading}
              sx={{ mt: 2 }}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>
          </form>

          <Box textAlign="center" mt={2}>
            <Link href="/admin/register" underline="hover">
              还没有账号？去注册
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
