import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import SchoolIcon from '@mui/icons-material/School'
import LogoutIcon from '@mui/icons-material/Logout'
import { useStudentStore } from '../../store/studentStore'
import { useState } from 'react'

export function StudentLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { name, logout } = useStudentStore()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  // 是否在考试中（路径为 /exam/xxx）
  const isInExam = location.pathname.startsWith('/exam/')

  const handleLogoutClick = () => {
    if (isInExam) {
      // 考试中需要二次确认
      setLogoutConfirmOpen(true)
    } else {
      logout()
      navigate('/login')
    }
  }

  const handleLogoutConfirm = async () => {
    setLogoutConfirmOpen(false)
    // 触发考试页保存草稿（如果正在考试中）
    window.dispatchEvent(new CustomEvent('exam:save-draft'))
    // 给保存操作一点时间
    await new Promise(r => setTimeout(r, 300))
    logout()
    navigate('/login')
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#fff',
          borderBottom: '1px solid #e8edf2',
          color: '#1a2b3c',
        }}
      >
        <Toolbar sx={{ maxWidth: 800, mx: 'auto', width: '100%', px: { xs: 2, sm: 3 } }}>
          <SchoolIcon sx={{ color: '#1976d2', mr: 1.5, fontSize: 28 }} />
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: 0.5,
              background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            在线考试
          </Typography>
          {name && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {name.charAt(0)}
              </Avatar>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: '#4a5568',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {name}
              </Typography>
              <Button
                onClick={handleLogoutClick}
                size="small"
                startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
                sx={{
                  color: '#718096',
                  minWidth: 'auto',
                  px: { xs: 1, sm: 'auto' },
                  '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
                  '&:hover': { bgcolor: '#f7fafc', color: '#e53e3e' },
                }}
              >
                <Typography component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  退出
                </Typography>
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
        <Outlet />
      </Box>

      {/* 考试中退出二次确认弹窗 */}
      <Dialog open={logoutConfirmOpen} onClose={() => setLogoutConfirmOpen(false)}>
        <DialogTitle>⚠️ 考试进行中</DialogTitle>
        <DialogContent>
          <Typography>
            您正在考试中，退出登录将离开考试页面。
            您的答案草稿已定期自动保存，下次登录后可继续作答。
            确定要退出吗？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutConfirmOpen(false)} variant="contained" color="primary">
            继续答题
          </Button>
          <Button onClick={handleLogoutConfirm} color="warning">
            退出登录
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
