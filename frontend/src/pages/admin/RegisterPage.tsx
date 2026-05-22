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
  MenuItem,
  Link,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material'
import { useAuthStore } from '../../store/authStore'
import { validatePassword } from '../../utils/validators'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'short_term_tutor' as 'admin' | 'short_term_tutor',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setFieldErrors(prev => ({ ...prev, [field]: '' }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!form.name.trim()) errors.name = '请输入姓名'
    if (!form.email.trim()) errors.email = '请输入邮箱'
    if (!form.password) errors.password = '请输入密码'
    if (form.password !== form.confirmPassword) errors.confirmPassword = '两次密码不一致'

    const pwdResult = validatePassword(form.password)
    if (!pwdResult.valid) {
      errors.password = pwdResult.message
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    try {
      await register({
        name: form.name,
        email: form.email,
        role: form.role,
        password: form.password,
      })
      navigate('/admin/login')
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || '注册失败')
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
      <Card sx={{ width: 420, p: 2 }}>
        <CardContent>
          <Typography variant="h5" fontWeight="bold" textAlign="center" mb={3}>
            在线考试系统 - 注册
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              label="姓名"
              fullWidth
              margin="normal"
              value={form.name}
              onChange={handleChange('name')}
              error={!!fieldErrors.name}
              helperText={fieldErrors.name}
            />
            <TextField
              label="邮箱前缀"
              fullWidth
              margin="normal"
              value={form.email}
              onChange={handleChange('email')}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-label">身份</InputLabel>
              <Select
                labelId="role-label"
                label="身份"
                value={form.role}
                onChange={(e: SelectChangeEvent) => setForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'short_term_tutor' }))}
              >
                <MenuItem value="admin">管理员</MenuItem>
                <MenuItem value="short_term_tutor">短期班辅导</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="密码"
              type="password"
              fullWidth
              margin="normal"
              value={form.password}
              onChange={handleChange('password')}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password || '必须同时包含字母和数字，8位以上'}
            />
            <TextField
              label="确认密码"
              type="password"
              fullWidth
              margin="normal"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading}
              sx={{ mt: 2 }}
            >
              {isLoading ? '注册中...' : '注册'}
            </Button>
          </form>

          <Box textAlign="center" mt={2}>
            <Link href="/admin/login" underline="hover">
              已有账号？去登录
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
