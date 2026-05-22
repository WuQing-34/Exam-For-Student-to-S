import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Grid,
} from '@mui/material'
import ArticleIcon from '@mui/icons-material/Article'
import PeopleIcon from '@mui/icons-material/People'
import AssessmentIcon from '@mui/icons-material/Assessment'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import { useAuthStore } from '../../store/authStore'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const menuItems = [
    ...(isAdmin
      ? [{
          label: '题库管理',
          desc: '管理各科目题库',
          path: '/admin/question-bank',
          icon: <LibraryBooksIcon sx={{ fontSize: 48, color: '#00bcd4' }} />,
        }]
      : []),
    ...(isAdmin
      ? [{
          label: '试卷管理',
          desc: '上传、预览、删除试卷',
          path: '/admin/papers',
          icon: <ArticleIcon sx={{ fontSize: 48, color: '#1976d2' }} />,
        }]
      : []),
    {
      label: '我的学生',
      desc: '查看、管理学生信息',
      path: '/admin/users',
      icon: <PeopleIcon sx={{ fontSize: 48, color: '#388e3c' }} />,
    },
    {
      label: '考试数据',
      desc: '查看学生考试成绩',
      path: '/admin/exams',
      icon: <AssessmentIcon sx={{ fontSize: 48, color: '#7b1fa2' }} />,
    },
  ]

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        欢迎回来，{user?.name}！
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        {isAdmin ? '您是系统管理员，可以访问全部功能' : '您是短期班辅导，可以管理用户、分配试卷、查看考试数据'}
      </Typography>

      <Grid container spacing={3}>
        {menuItems.map(item => (
          <Grid item xs={12} sm={6} md={3} key={item.path}>
            <Card>
              <CardActionArea onClick={() => navigate(item.path)} sx={{ p: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>{item.icon}</Box>
                  <Typography variant="h6" fontWeight="bold">
                    {item.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {item.desc}
                  </Typography>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
