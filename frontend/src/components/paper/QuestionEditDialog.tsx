import { useState, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import CloseIcon from '@mui/icons-material/Close'
import { uploadApi } from '../../api/upload'
import type { Question } from '../../types/paper'

interface Props {
  open: boolean
  question: Question | null
  onSave: (questionId: number, content: string) => void
  onClose: () => void
}

export function QuestionEditDialog({ open, question, onSave, onClose }: Props) {
  const [content, setContent] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 当 question 变化时同步内容
  const handleOpen = () => {
    if (question) setContent(question.content)
    setError('')
  }

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageUploading(true)
    setError('')

    try {
      const result = await uploadApi.uploadImage(file)
      // 在光标位置插入图片 markdown（使用固定描述避免中文乱码）
      const imageMd = `\n![题目图片](${result.url})\n`
      setContent(prev => prev + imageMd)
    } catch (err: any) {
      setError(err.message || '上传失败')
    } finally {
      setImageUploading(false)
      // 清空 input 以便重复上传同一文件
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = () => {
    if (!question) return
    onSave(question.id, content)
    onClose()
  }

  if (!question) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onTransitionEnter={handleOpen}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        编辑题目内容
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            第{question.order_num}题 · {question.score}分
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={imageUploading ? <CircularProgress size={16} /> : <AddPhotoAlternateIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
          >
            {imageUploading ? '上传中...' : '插入图片'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleUploadImage}
          />
        </Box>

        <TextField
          multiline
          fullWidth
          rows={6}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="输入题目内容。如需插入图片，点击上方「插入图片」按钮。&#10;&#10;支持图片语法：![描述](图片地址)"
          sx={{
            '& .MuiInputBase-root': {
              fontFamily: 'monospace',
              fontSize: '0.95rem',
            },
          }}
        />

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          💡 提示：上传图片后会自动插入图片标记。图片将以原始大小嵌入题目中。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave}>保存</Button>
      </DialogActions>
    </Dialog>
  )
}
