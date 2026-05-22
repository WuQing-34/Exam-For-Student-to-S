import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import LockIcon from '@mui/icons-material/Lock'
import DeleteIcon from '@mui/icons-material/Delete'
import { authApi } from '../../api/auth'
import type { AdminUser } from '../../types/user'

export function AdminManagePage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 添加管理员弹窗
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addSuccess, setAddSuccess] = useState('')

  // 修改密码弹窗
  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwdTarget, setPwdTarget] = useState<AdminUser | null>(null)
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  const loadAdmins = async () => {
    try {
      setLoading(true)
      const res = await authApi.listAdmins()
      const d = res.data
      if (d.code === 0) {
        setAdmins(d.data || [])
      }
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAdmins() }, [])

  const handleAddAdmin = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      setError('请填写姓名和邮箱前缀')
      return
    }
    setAddLoading(true)
    setError('')
    setAddSuccess('')
    try {
      const res = await authApi.addAdmin({ email: addForm.email.trim(), name: addForm.name.trim() })
      const d = res.data
      if (d.code === 0) {
        setAddSuccess(`管理员 ${addForm.name} 创建成功，默认密码为 aa123456`)
        setAddForm({ name: '', email: '' })
        setAddOpen(false)
        loadAdmins()
      } else {
        setError(d.message)
      }
    } catch (e: unknown) {
      const err = e as Error
      setError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) {
      setPwdError('请填写原密码和新密码')
      return
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('两次密码不一致')
      return
    }
    setPwdLoading(true)
    setPwdError('')
    setPwdSuccess('')
    try {
      const res = await authApi.changePassword({
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      })
      const d = res.data
      if (d.code === 0) {
        setPwdSuccess('密码修改成功')
        setPwdOpen(false)
        setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setPwdError(d.message)
      }
    } catch (e: unknown) {
      const err = e as Error
      setPwdError(err.message)
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">管理员管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setAddOpen(true); setError(''); setAddSuccess('') }}
        >
          添加管理员
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {addSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAddSuccess('')}>{addSuccess}</Alert>}
      {pwdSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setPwdSuccess('')}>{pwdSuccess}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>姓名</TableCell>
              <TableCell>邮箱前缀</TableCell>
              <TableCell>角色</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {admins.map(a => (
              <TableRow key={a.id}>
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell>{a.email}</TableCell>
                <TableCell>
                  <Chip
                    label={a.role === 'admin' ? '管理员' : '短期班辅导'}
                    color={a.role === 'admin' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{a.created_at?.slice(0, 10)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="修改密码">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setPwdTarget(a)
                        setPwdOpen(true)
                        setPwdError('')
                        setPwdSuccess('')
                        setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                      }}
                    >
                      <LockIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {admins.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">暂无数据</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 添加管理员弹窗 */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>添加管理员</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            新管理员默认密码为 <strong>aa123456</strong>，请提醒其首次登录后修改密码。
          </Alert>
          <TextField
            label="姓名"
            fullWidth
            margin="normal"
            value={addForm.name}
            onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
            placeholder="请输入姓名"
          />
          <TextField
            label="邮箱前缀"
            fullWidth
            margin="normal"
            value={addForm.email}
            onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
            placeholder="请输入邮箱前缀"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleAddAdmin} disabled={addLoading}>
            {addLoading ? '创建中...' : '确认添加'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 修改密码弹窗 */}
      <Dialog open={pwdOpen} onClose={() => setPwdOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>修改密码 — {pwdTarget?.name}</DialogTitle>
        <DialogContent>
          {pwdError && <Alert severity="error" sx={{ mb: 2 }}>{pwdError}</Alert>}
          <TextField
            label="原密码"
            type="password"
            fullWidth
            margin="normal"
            value={pwdForm.oldPassword}
            onChange={e => setPwdForm(p => ({ ...p, oldPassword: e.target.value }))}
          />
          <TextField
            label="新密码"
            type="password"
            fullWidth
            margin="normal"
            value={pwdForm.newPassword}
            onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
          />
          <TextField
            label="确认新密码"
            type="password"
            fullWidth
            margin="normal"
            value={pwdForm.confirmPassword}
            onChange={e => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwdOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleChangePassword} disabled={pwdLoading}>
            {pwdLoading ? '修改中...' : '确认修改'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
