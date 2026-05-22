import { Router } from 'express'
import { authService } from '../../services/authService'
import { apiResponse, errorResponse } from '../../utils/helpers'
import { verifyJWT } from '../../middlewares/auth'

const router = Router()

/**
 * POST /api/admin/auth/register
 * 注册（公开接口，但仅能创建 tutor 角色；admin 角色需由已有 admin 创建）
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body
    if (!email || !password || !name || !role) {
      res.status(400).json(errorResponse(1000, '缺少必填字段'))
      return
    }
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password)) {
      res.status(400).json(errorResponse(1000, '密码必须同时包含字母和数字，8位以上'))
      return
    }
    // 注册接口仅允许创建 tutor 角色；admin 角色需由已登录的 admin 创建
    if (role !== 'tutor' && role !== 'admin') {
      res.status(400).json(errorResponse(1000, '无效的角色'))
      return
    }
    // 仅 tutor 角色允许公开注册，admin 角色需通过管理员创建
    if (role === 'admin') {
      res.status(403).json(errorResponse(1002, '管理员账户需由已有管理员创建'))
      return
    }

    const user = await authService.register({ email, password, name, role })
    res.json(apiResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }, '注册成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * POST /api/admin/auth/login
 * 登录
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json(errorResponse(1000, '请输入邮箱和密码'))
      return
    }

    const result = await authService.login(email, password)

    // 设置 HttpOnly Cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      path: '/',
    })

    res.json(apiResponse(result, '登录成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(401).json(errorResponse(1001, err.message))
  }
})

/**
 * GET /api/admin/auth/me
 * 获取当前用户信息
 */
router.get('/me', verifyJWT, (req, res) => {
  const admin = req.admin
  if (!admin) {
    res.status(401).json(errorResponse(1001, '未登录'))
    return
  }
  const user = authService.getById(admin.id)
  if (!user) {
    res.status(401).json(errorResponse(1001, '用户不存在'))
    return
  }
  res.json(apiResponse(user, '获取成功'))
})

/**
 * POST /api/admin/auth/add-admin
 * 管理员添加新管理员（仅 admin 角色可操作）
 */
router.post('/add-admin', verifyJWT, async (req, res) => {
  try {
    const admin = req.admin
    if (!admin || admin.role !== 'admin') {
      res.status(403).json(errorResponse(1002, '仅管理员可操作'))
      return
    }

    const { email, name } = req.body
    if (!email || !name) {
      res.status(400).json(errorResponse(1000, '请输入邮箱前缀和姓名'))
      return
    }

    const user = await authService.addAdmin(email.trim(), name.trim())
    res.json(apiResponse(user, '管理员创建成功，默认密码为 aa123456'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * PUT /api/admin/auth/change-password
 * 修改当前用户密码
 */
router.put('/change-password', verifyJWT, async (req, res) => {
  try {
    const admin = req.admin
    if (!admin) {
      res.status(401).json(errorResponse(1001, '未登录'))
      return
    }

    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
      res.status(400).json(errorResponse(1000, '请输入原密码和新密码'))
      return
    }

    await authService.changePassword(admin.id, oldPassword, newPassword)
    res.json(apiResponse(null, '密码修改成功'))
  } catch (e: unknown) {
    const err = e as Error
    res.status(400).json(errorResponse(1000, err.message))
  }
})

/**
 * GET /api/admin/auth/admins
 * 获取管理员列表（仅 admin 角色可查看）
 */
router.get('/admins', verifyJWT, (req, res) => {
  try {
    const admin = req.admin
    if (!admin || admin.role !== 'admin') {
      res.status(403).json(errorResponse(1002, '仅管理员可操作'))
      return
    }

    const list = authService.findAllAdmins()
    res.json(apiResponse(list))
  } catch (e: unknown) {
    const err = e as Error
    res.status(500).json(errorResponse(1000, err.message))
  }
})

export { router as adminAuthRoutes }
