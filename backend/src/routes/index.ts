import { Router } from 'express'
import { adminAuthRoutes } from './admin/auth'
import { adminPaperRoutes } from './admin/paper'
import { adminUserRoutes } from './admin/user'
import { adminAssignmentRoutes } from './admin/assignment'
import { adminExamRoutes } from './admin/exam'
import { adminQuestionBankRoutes } from './admin/questionBank'
import { adminUploadRoutes } from './admin/upload'
import { studentRoutes } from './student'

const router = Router()

// 管理端路由
router.use('/admin/auth', adminAuthRoutes)
router.use('/admin/papers', adminPaperRoutes)
router.use('/admin/students', adminUserRoutes)
router.use('/admin/assignments', adminAssignmentRoutes)
router.use('/admin/exams', adminExamRoutes)
router.use('/admin/question-bank', adminQuestionBankRoutes)
router.use('/admin', adminUploadRoutes)

// 考生端路由
router.use('/student', studentRoutes)

export { router }
