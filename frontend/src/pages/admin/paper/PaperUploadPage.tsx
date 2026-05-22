import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { paperApi } from '../../../api/paper'
import { GRADE_MAP } from '../../../types'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'

export function PaperUploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [grade, setGrade] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setError('')
      if (!title) {
        setTitle(f.name.replace(/\.(xlsx|xls|docx)$/i, ''))
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFile(f)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file || !title || !grade) {
      setError('请填写所有必填字段')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('grade', grade)

    setUploading(true)
    setError('')
    try {
      const res = await paperApi.upload(formData)
      const d = res.data
      if (d.code === 0) {
        setResult(d.data)
      } else {
        setError(d.message)
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>上传试卷</Typography>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      {result ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          试卷上传成功！科目：{result.subjectsIncluded?.join('、')}，
          自动分配 {result.autoAssigned} 名学生。
          <Button onClick={() => navigate('/admin/papers')} sx={{ ml: 2 }}>返回列表</Button>
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* 上传区域 */}
        <Box sx={{ flex: '1 1 400px' }}>
          <Card>
            <CardContent>
              {/* 拖拽上传区 */}
              <Box
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: '2px dashed #1976d2',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: '#e3f2fd',
                  '&:hover': { bgcolor: '#bbdefb' },
                  mb: 3,
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
                <Typography>{file ? file.name : '点击或拖拽上传 Excel/Word 文件'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  支持多 Sheet Excel 格式（语/数/英/物/化），或单科目格式
                </Typography>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.docx"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </Box>

              <TextField
                label="试卷名称"
                fullWidth
                value={title}
                onChange={e => setTitle(e.target.value)}
                sx={{ mb: 2 }}
              />

              {/* v1.1: 只保留年级选择，移除科目选择 */}
              <Select
                value={grade}
                onChange={e => setGrade(e.target.value)}
                displayEmpty
                sx={{ width: '100%' }}
                label="年级"
              >
                <MenuItem value="" disabled>请选择年级</MenuItem>
                {Object.entries(GRADE_MAP).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </Select>

              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={uploading || !file || !title || !grade}
                onClick={handleUpload}
                sx={{ mt: 3 }}
              >
                {uploading ? <CircularProgress size={24} /> : '上传并解析'}
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* 格式说明 */}
        <Box sx={{ flex: '1 1 300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>多科目 Excel 格式说明</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                v1.1 支持多 Sheet Excel，每个 Sheet 名称为科目名（语文/数学/英语/物理/化学）
              </Alert>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Sheet 名：语文、数学、英语、物理、化学"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="列顺序：题号 | 题型 | 题目内容 | 选项A | 选项B | 选项C | 选项D | 正确答案 | 分值"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="每科总分必须为 100 分" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="初三试卷必须包含化学科目" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}
