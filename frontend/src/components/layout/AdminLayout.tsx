import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  useMediaQuery,
  useTheme,
  Button,
  Tooltip,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import ArticleIcon from '@mui/icons-material/Article'
import PeopleIcon from '@mui/icons-material/People'
import AssessmentIcon from '@mui/icons-material/Assessment'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import LockIcon from '@mui/icons-material/Lock'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import { useAuthStore } from '../../store/authStore'

const DRAWER_WIDTH = 240

export function AdminLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const isAdmin = user?.role === 'admin'

  const menuItems = [
    { label: '首页', path: '/admin/dashboard', icon: <AssessmentIcon /> },
    ...(isAdmin ? [{ label: '题库管理', path: '/admin/question-bank', icon: <LibraryBooksIcon /> }] : []),
    ...(isAdmin ? [{ label: '试卷管理', path: '/admin/papers', icon: <ArticleIcon /> }] : []),
    { label: '我的学生', path: '/admin/users', icon: <PeopleIcon /> },
    { label: '考试数据', path: '/admin/exams', icon: <AssessmentIcon /> },
    ...(isAdmin ? [{ label: '管理员管理', path: '/admin/admins', icon: <AdminPanelSettingsIcon /> }] : []),
    ...(isAdmin ? [{ label: '辅导导入', path: '/admin/tutor-import', icon: <GroupAddIcon /> }] : []),
  ]

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const drawer = (
    <Box sx={{ width: DRAWER_WIDTH }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="bold">
          在线考试系统
        </Typography>
        {isMobile && (
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      <List>
        {menuItems.map(item => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path)
                if (isMobile) setDrawerOpen(false)
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* 顶部栏 */}
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" onClick={() => setDrawerOpen(true)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            在线考试系统 - 管理端
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              {user?.name}（{user?.role === 'admin' ? '管理员' : '短期班辅导'}）
            </Typography>
            <Tooltip title="修改密码">
              <IconButton color="inherit" onClick={() => navigate('/admin/admins')}>
                <LockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button color="inherit" onClick={handleLogout} variant="outlined" size="small">
              退出
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 侧边栏 */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* 移动端抽屉 */}
      {isMobile && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {drawer}
        </Drawer>
      )}

      {/* 主内容区 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
