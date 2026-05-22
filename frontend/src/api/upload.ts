import { storage } from '../utils/storage'

const uploadBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

export const uploadApi = {
  /** 上传题目图片 */
  async uploadImage(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData()
    formData.append('image', file)

    const token = storage.get<string>('token')
    const response = await fetch(`${uploadBaseUrl}/admin/upload-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    const data = await response.json()
    if (data.code !== 0) {
      throw new Error(data.message || '上传失败')
    }

    return {
      url: data.data.url,
      filename: data.data.filename,
    }
  },
}
