import { useState, useEffect, useRef, useCallback } from 'react'
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
  Divider,
} from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import { uploadApi } from '../../api/upload'
import type { Question, QuestionOption } from '../../types/paper'

interface Props {
  open: boolean
  question: Question | null
  onSave: (questionId: number, content: string, options: QuestionOption[] | null) => void
  onClose: () => void
}

export function QuestionEditDialog({ open, question, onSave, onClose }: Props) {
  const [content, setContent] = useState('')
  const [options, setOptions] = useState<QuestionOption[]>([])
  const [imageUploading, setImageUploading] = useState<number | null>(null) // 正在上传的选项索引
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const optionFileInputRefs = useRef<Map<number, HTMLInputElement | null>>(new Map())

  // 当弹窗打开或question变化时同步数据
  useEffect(() => {
    if (open && question) {
      setContent(question.content)
      // options 可能是字符串（后端JSON字段），需要解析
      let parsedOptions: QuestionOption[] = []
      if (question.options) {
        if (typeof question.options === 'string') {
          try {
            parsedOptions = JSON.parse(question.options)
          } catch {
            parsedOptions = []
          }
        } else if (Array.isArray(question.options)) {
          parsedOptions = question.options
        }
      }
      setOptions(parsedOptions)
      setError('')
    }
  }, [open, question])

  // 题目正文图片上传
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageUploading(-1)
    setError('')

    try {
      const result = await uploadApi.uploadImage(file)
      const imageMd = `\n![题目图片](${result.url})\n`
      setContent(prev => prev + imageMd)
    } catch (err: any) {
      setError(err.message || '上传失败')
    } finally {
      setImageUploading(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 选项图片上传
  const handleOptionImageUpload = useCallback(async (optIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageUploading(optIndex)
    setError('')

    try {
      const result = await uploadApi.uploadImage(file)
      setOptions(prev => {
        const updated = [...prev]
        updated[optIndex] = { ...updated[optIndex], image: result.url }
        return updated
      })
    } catch (err: any) {
      setError(err.message || '上传失败')
    } finally {
      setImageUploading(null)
      const input = optionFileInputRefs.current.get(optIndex)
      if (input) input.value = ''
    }
  }, [])

  // 删除选项图片
  const handleRemoveOptionImage = (optIndex: number) => {
    setOptions(prev => {
      const updated = [...prev]
      updated[optIndex] = { ...updated[optIndex], image: undefined }
      return updated
    })
  }

  const handleSave = () => {
    if (!question) return
    onSave(question.id, content, options.length > 0 ? options : null)
    onClose()
  }

  if (!question) return null

  const isChoice = question.type === 'choice'

  return (
    <Dialog
      open={open}
      onClose={onClose}
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

        {/* 题目正文编辑 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            第{question.order_num}题 · {question.score}分 · {isChoice ? '选择题' : question.type === 'fill' ? '填空题' : '简答题'}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={imageUploading === -1 ? <CircularProgress size={16} /> : <AddPhotoAlternateIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading !== null}
          >
            {imageUploading === -1 ? '上传中...' : '插入图片'}
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
          rows={5}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="输入题目内容。如需插入图片，点击上方「插入图片」按钮。"
          sx={{
            '& .MuiInputBase-root': {
              fontFamily: 'monospace',
              fontSize: '0.95rem',
            },
          }}
        />

        {/* 选项编辑区域（仅选择题显示） */}
        {isChoice && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              选项编辑
            </Typography>
            {options.map((opt, idx) => (
              <Box key={opt.label} sx={{ mb: 2, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 24 }}>
                    {opt.label}.
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={opt.text}
                    onChange={e => {
                      setOptions(prev => {
                        const updated = [...prev]
                        updated[idx] = { ...updated[idx], text: e.target.value }
                        return updated
                      })
                    }}
                    placeholder="选项文字"
                  />
                </Box>

                {/* 选项图片 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={imageUploading === idx ? <CircularProgress size={14} /> : <AddPhotoAlternateIcon />}
                    onClick={() => optionFileInputRefs.current.get(idx)?.click()}
                    disabled={imageUploading !== null}
                  >
                    {imageUploading === idx ? '上传中...' : opt.image ? '更换图片' : '添加图片'}
                  </Button>
                  <input
                    ref={el => { optionFileInputRefs.current.set(idx, el) }}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleOptionImageUpload(idx, e)}
                  />
                  {opt.image && (
                    <>
                      <img
                        src={opt.image}
                        alt={opt.label}
                        style={{ maxWidth: 160, maxHeight: 80, border: '1px solid #ddd', borderRadius: 4 }}
                      />
                      <IconButton size="small" onClick={() => handleRemoveOptionImage(idx)} title="删除图片">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
            ))}
          </>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          💡 上传图片后会自动插入图片标记。选择题可以为每个选项单独配图。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave}>保存</Button>
      </DialogActions>
    </Dialog>
  )
}
