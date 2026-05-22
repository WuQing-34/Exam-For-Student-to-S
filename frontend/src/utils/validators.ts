/**
 * 表单校验工具函数
 */

/**
 * 校验密码：必须同时包含字母和数字，8位以上
 */
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: '密码至少需要8位' }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含字母' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: '密码必须包含数字' }
  }
  return { valid: true, message: '' }
}

/**
 * 校验手机号（中国大陆11位手机号）
 */
export function validatePhone(phone: string): { valid: boolean; message: string } {
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { valid: false, message: '请输入正确的手机号' }
  }
  return { valid: true, message: '' }
}

/**
 * 校验邮箱格式
 */
export function validateEmail(email: string): { valid: boolean; message: string } {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: '请输入正确的邮箱格式' }
  }
  return { valid: true, message: '' }
}
