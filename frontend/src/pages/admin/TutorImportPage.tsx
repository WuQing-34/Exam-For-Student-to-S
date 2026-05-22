import { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import api from '../../api'

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export function TutorImportPage() {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setError('仅支持 .xlsx 或 .xls 格式的 Excel 文件')
        return
      }
      setSelectedFile(file)
      setError('')
      setResult(null)
      setSuccessMsg('')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('请先选择文件')
      return
    }

    setUploading(true)
    setError('')
    setSuccessMsg('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await api.post('/admin/auth/batch-import-tutors', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const d = res.data
      if (d.code === 0) {
        setResult(d.data)
        setSuccessMsg(d.message)
        setSelectedFile(null)
        // 重置 file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setError(d.message)
      }
    } catch (e: unknown) {
      const err = e as Error
      setError(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = () => {
    // 生成模板 CSV
    const headers = ['中心', '战队', '姓名', '邮箱前缀']
    const rows = [
      ['北京中心', '战队A', '张三', 'zhangsan'],
      ['上海中心', '战队B', '李四', 'lisi'],
    ]
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '短期班辅导导入模板.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">短期班辅导导入</Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadTemplate}
        >
          下载导入模板
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          导入说明
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Excel 文件需包含以下列：<strong>中心、战队、姓名、邮箱前缀</strong>（支持中文或英文列名 center/team/name/email）
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          导入后短期班辅导默认密码为 <strong>aa123456</strong>，可凭"邮箱前缀 + 密码"直接登录。
        </Typography>
        <Typography variant="body2" color="text.secondary">
          如邮箱前缀已存在，该条记录将被跳过不重复导入。
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadFileIcon />}
          >
            选择 Excel 文件
            <input
              id="file-input"
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </Button>
          {selectedFile && (
            <Typography variant="body2" color="text.secondary">
              已选择：{selectedFile.name}
            </Typography>
          )}
          <Button
            variant="contained"
            color="success"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? '上传中...' : '开始导入'}
          </Button>
        </Box>
        {uploading && <LinearProgress sx={{ mt: 2 }} />}
      </Paper>

      {result && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            导入结果
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>成功</TableCell>
                  <TableCell>失败</TableCell>
                  <TableCell>合计</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Typography color="success.main" fontWeight="bold">{result.success} 条</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography color="error.main" fontWeight="bold">{result.failed} 条</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">{result.success + result.failed} 条</Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          {result.errors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="error.main" gutterBottom>
                失败详情：
              </Typography>
              {result.errors.map((err, i) => (
                <Typography key={i} variant="body2" color="text.secondary">
                  {i + 1}. {err}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  )
}
