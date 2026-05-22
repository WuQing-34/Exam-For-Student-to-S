import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Box, Card, TextField, Button, Typography, Alert, Autocomplete,
  InputAdornment, Fade, FormControl, FormLabel,
  Chip, CircularProgress,
} from '@mui/material'
import SchoolIcon from '@mui/icons-material/School'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import GradeIcon from '@mui/icons-material/Grade'
import { studentExamApi } from '../../api/exam'
import { useStudentStore } from '../../store/studentStore'
import { GRADE_MAP, SUBJECT_MAP, Subject } from '../../types'

export function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useStudentStore()
  const [form, setForm] = useState({
    name: '', phone: '', grade: '',
    subjects: [] as string[],
    salesId: undefined as number | undefined,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [salesList, setSalesList] = useState<Array<{ id: number; name: string }>>([])
  const [salesLoading, setSalesLoading] = useState(true)

  useEffect(() => {
    studentExamApi.getSales().then(res => {
      if (res.data.code === 0 && res.data.data) {
        setSalesList(res.data.data.list)
      }
    }).catch(() => {}).finally(() => setSalesLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name || !form.phone || !form.grade) {
      setError('请填写完整信息（微信昵称/手机号/年级）')
      return
    }
    if (form.subjects.length === 0) {
      setError('请至少选择一门科目')
      return
    }
    if (!form.salesId) {
      setError('请选择辅导老师')
      return
    }

    setLoading(true)
    try {
      const res = await studentExamApi.register({
        name: form.name,
        phone: form.phone,
        grade: form.grade,
        subjects: form.subjects,
        salesId: form.salesId,
      })
      const d = res.data
      if (d.code === 0 && d.data) {
        login(d.data.studentId, form.name, form.grade, form.subjects)
        navigate('/subjects')
      } else {
        setError(d.message)
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  const toggleSubject = (s: string) => {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(s)
        ? f.subjects.filter(x => x !== s)
        : [...f.subjects, s],
    }))
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
            maxWidth: 440,
            borderRadius: { xs: 0, sm: 4 },
            boxShadow: { xs: 'none', sm: '0 20px 60px rgba(0,0,0,0.3)' },
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
                width: 64, height: 64, borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 2,
              }}
            >
              <SchoolIcon sx={{ fontSize: 36, color: '#fff' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="#fff">注册报名</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
              填写信息后即可参加考试
            </Typography>
          </Box>

          <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth sx={{ mb: 2 }}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="请输入微信昵称"
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: '#a0aec0', fontSize: 20 }} /></InputAdornment> }}
              />
              <TextField
                fullWidth sx={{ mb: 2 }}
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="请输入手机号"
                InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ color: '#a0aec0', fontSize: 20 }} /></InputAdornment> }}
              />
              <Autocomplete
                fullWidth sx={{ mb: 2 }}
                value={form.grade ? Object.entries(GRADE_MAP).find(([k]) => k === form.grade) ?? null : null}
                onChange={(_, v) => setForm(f => ({ ...f, grade: v ? v[0] : '' }))}
                options={Object.entries(GRADE_MAP)}
                getOptionLabel={([, label]) => label}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="请选择年级"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <InputAdornment position="start"><GradeIcon sx={{ color: '#a0aec0', fontSize: 20 }} /></InputAdornment>,
                    }}
                  />
                )}
                noOptionsText="无匹配年级"
              />

              {/* 科目多选 */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel sx={{ fontSize: 14, mb: 0.5, color: '#4a5568' }}>报名科目（多选）</FormLabel>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(Object.keys(SUBJECT_MAP) as Subject[]).map(s => (
                    <Chip
                      key={s}
                      label={SUBJECT_MAP[s]}
                      variant={form.subjects.includes(s) ? 'filled' : 'outlined'}
                      color={form.subjects.includes(s) ? 'primary' : 'default'}
                      onClick={() => toggleSubject(s)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </FormControl>

              {/* 选择销售 */}
              <FormControl fullWidth sx={{ mb: 3 }} required>
                <FormLabel sx={{ fontSize: 14, mb: 0.5, color: '#4a5568' }}>选择辅导老师</FormLabel>
                <Autocomplete
                  value={salesList.find(s => s.id === form.salesId) ?? null}
                  onChange={(_, v) => setForm(f => ({ ...f, salesId: v ? v.id : undefined }))}
                  options={salesList}
                  getOptionLabel={s => s.name}
                  disabled={salesLoading}
                  loading={salesLoading}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="请选择辅导老师（可输入检索）" />
                  )}
                  noOptionsText="无匹配老师"
                />
                {salesLoading && <CircularProgress size={16} sx={{ mt: 0.5 }} />}
              </FormControl>

              <Button
                type="submit" variant="contained" fullWidth size="large" disabled={loading}
                sx={{
                  py: 1.5, borderRadius: 3, fontSize: '1rem', fontWeight: 600,
                  background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
                  boxShadow: '0 4px 15px rgba(25, 118, 210, 0.4)',
                  '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #651fff 100%)' },
                }}
              >
                {loading ? '注册中...' : '注册并登录'}
              </Button>
            </form>

            <Box textAlign="center" mt={2}>
              <Typography variant="body2" color="#718096">
                已有账号？{' '}
                <Link to="/login" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
                  去登录
                </Link>
              </Typography>
            </Box>
          </Box>
        </Card>
      </Fade>
    </Box>
  )
}
