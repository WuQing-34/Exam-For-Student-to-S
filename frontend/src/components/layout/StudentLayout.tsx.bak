import { Outlet, useNavigate } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box, Avatar } from '@mui/material'
import SchoolIcon from '@mui/icons-material/School'
import LogoutIcon from '@mui/icons-material/Logout'
import { useStudentStore } from '../../store/studentStore'

export function StudentLayout() {
  const navigate = useNavigate()
  const { name, logout } = useStudentStore()

  const handleLogout = () => {
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
                onClick={handleLogout}
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
    </Box>
  )
}
