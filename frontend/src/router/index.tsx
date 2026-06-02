import { Navigate, useRoutes } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useStudentStore } from '../store/studentStore'

// 管理端页面
import { AdminLayout } from '../components/layout/AdminLayout'
import { LoginPage as AdminLoginPage } from '../pages/admin/LoginPage'
import { RegisterPage } from '../pages/admin/RegisterPage'
import { DashboardPage } from '../pages/admin/DashboardPage'
import { PaperListPage } from '../pages/admin/paper/PaperListPage'
import { PaperUploadPage } from '../pages/admin/paper/PaperUploadPage'
import { UserListPage } from '../pages/admin/user/UserListPage'
import { AssignPage } from '../pages/admin/assignment/AssignPage'
import { ExamDataPage } from '../pages/admin/exam/ExamDataPage'
import { AdminManagePage } from '../pages/admin/AdminManagePage'
import { QuestionBankPage } from '../pages/admin/question-bank/QuestionBankPage'
import { TutorImportPage } from '../pages/admin/TutorImportPage'

// 考生端页面
import { StudentLayout } from '../components/layout/StudentLayout'
import { LoginPage as ExamLoginPage } from '../pages/exam/LoginPage'
import { RegisterPage as ExamRegisterPage } from '../pages/exam/RegisterPage'
import { SubjectListPage } from '../pages/exam/SubjectListPage'
import { ExamPage } from '../pages/exam/ExamPage'
import { ExamReviewPage } from '../pages/exam/ExamReviewPage'
import { MultiResultPage } from '../pages/exam/MultiResultPage'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'

/** 管理端鉴权守卫 */
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}

/** 考生端鉴权守卫 */
function StudentGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useStudentStore()
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function AppRouter() {
  return useRoutes([
    // 首页重定向
    { path: '/', element: <Navigate to="/login" replace /> },

    // 管理端登录注册（公开）
    { path: '/admin/login', element: <AdminLoginPage /> },
    { path: '/admin/register', element: <RegisterPage /> },

    // 管理端（需鉴权）
    {
      path: '/admin',
      element: (
        <AdminGuard>
          <AdminLayout />
        </AdminGuard>
      ),
      children: [
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'question-bank', element: <QuestionBankPage /> },
        { path: 'papers', element: <PaperListPage /> },
        { path: 'papers/upload', element: <PaperUploadPage /> },
        { path: 'users', element: <UserListPage /> },
        { path: 'assign', element: <AssignPage /> },
        { path: 'exams', element: <ExamDataPage /> },
        { path: 'admins', element: <AdminManagePage /> },
        { path: 'tutor-import', element: <TutorImportPage /> },
        { path: '', element: <Navigate to="/admin/dashboard" replace /> },
      ],
    },

    // 考生端（公开）
    { path: '/login', element: <ExamLoginPage /> },
    { path: '/register', element: <ExamRegisterPage /> },

    // 考生端（需鉴权）
    {
      element: (
        <StudentGuard>
          <StudentLayout />
        </StudentGuard>
      ),
      children: [
        { path: '/subjects', element: <SubjectListPage /> },
        { path: '/exam/:subject', element: <ErrorBoundary><ExamPage /></ErrorBoundary> },
        { path: '/review/:subject', element: <ExamReviewPage /> },
        { path: '/results', element: <MultiResultPage /> },
      ],
    },

    // 兼容旧路径
    { path: '/exams', element: <Navigate to="/subjects" replace /> },
    { path: '/exams/*', element: <Navigate to="/subjects" replace /> },

    // 404
    { path: '*', element: <Navigate to="/" replace /> },
  ])
}
