import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Button,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Checkbox,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { paperApi } from '../../../api/paper'
import { ALL_GRADE_MAP, SUBJECT_MAP } from '../../../types'
import { formatDateTime } from '../../../utils/formatters'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { QuestionContent } from '../../../components/ui/QuestionContent'
import { QuestionEditDialog } from '../../../components/paper/QuestionEditDialog'

export function PaperListPage() {
  const navigate = useNavigate()
  const [papers, setPapers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [grade, setGrade] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewPaper, setPreviewPaper] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)
  const [error, setError] = useState('')

  // 批量选择
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const allIds = papers.map(p => p.id)
    setSelectedIds(prev => prev.length === allIds.length ? [] : allIds)
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`确定删除选中的 ${selectedIds.length} 份试卷？此操作不可撤销，将同时删除试卷内的所有题目。`)) return
    try {
      await paperApi.batchDelete(selectedIds)
      setSelectedIds([])
      fetchPapers()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err.message || '批量删除失败')
    }
  }

  const fetchPapers = async () => {
    setLoading(true)
    try {
      const res = await paperApi.list({
        grade: grade || undefined,
        page: page + 1,
        pageSize,
      })
      const d = res.data
      if (d.code === 0) {
        setPapers(d.data!.list)
        setTotal(d.data!.total)
      }
    } catch (e: unknown) {
      const err = e as Error
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPapers()
  }, [page, grade])

  const handlePreview = async (id: number) => {
    setPreviewLoading(true)
    setPreviewPaper(null)
    try {
      const res = await paperApi.preview(id)
      const d = res.data
      if (d.code === 0) setPreviewPaper(d.data)
    } catch {
      // ignore
    } finally {
      setPreviewLoading(false)
    }
  }

  // 渲染预览题目列表
  const renderPreviewQuestions = () => {
    if (!previewPaper?.questions) return null
    return previewPaper.questions.map((q: any) => {
      const isChoice = q.type === 'choice'
      const isFill = q.type === 'fill_blank' || q.type === 'fill'

      let rawOpts = q.options
      if (typeof rawOpts === 'string') {
        try { rawOpts = JSON.parse(rawOpts) } catch { rawOpts = null }
      }
      const rawArr: any[] = Array.isArray(rawOpts) ? rawOpts : []

      const choiceOpts = isChoice && rawArr.length > 0
        ? rawArr.map((item: any) => {
            if (typeof item === 'object' && item !== null && 'label' in item) {
              return { label: item.label, text: item.text || '', image: item.image }
            }
            if (typeof item === 'string') {
              const m = item.match(/^([A-D])\s*[.．、]\s*(.+)/)
              if (m) {
                const imgM = m[2].match(/!\[\]\(([^)]+)\)/)
                return { label: m[1], text: imgM ? m[2].replace(imgM[0], '').trim() : m[2].trim(), image: imgM?.[1] }
              }
              return { label: '', text: item }
            }
            return { label: '', text: String(item) }
          })
        : []

      let fillLabels: string[] = []
      let fillAnswers: string[] = []
      if (isFill) {
        if (rawArr.length > 0 && typeof rawArr[0] === 'string') {
          fillLabels = rawArr
        }
        let rawAns = q.correct_answer
        if (typeof rawAns === 'string') {
          try { rawAns = JSON.parse(rawAns) } catch { /* keep as string */ }
        }
        fillAnswers = Array.isArray(rawAns) ? rawAns : []
      }

      let shortAnswer = ''
      if (!isChoice && !isFill) {
        let rawAns: any = q.correct_answer
        if (typeof rawAns === 'string') {
          try { const p = JSON.parse(rawAns); rawAns = Array.isArray(p) ? p.join('；') : rawAns } catch { /* keep as string */ }
        } else if (Array.isArray(rawAns)) {
          rawAns = rawAns.join('；')
        }
        shortAnswer = String(rawAns || '')
      }

      return (
        <Box key={q.id} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" fontWeight="bold">
              第{q.order_num}题 [{q.type === 'choice' ? '选择题' : q.type === 'fill' || q.type === 'fill_blank' ? '填空题' : '简答题'}]
              {q.subject && ` [${SUBJECT_MAP[q.subject as keyof typeof SUBJECT_MAP] || q.subject}]`}（{q.score}分）
            </Typography>
            <IconButton size="small" onClick={() => setEditingQuestion(q)} title="编辑题目">
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
          <QuestionContent content={q.content} />

          {isChoice && choiceOpts.length > 0 && (
            <Box sx={{ mt: 1, pl: 2 }}>
              {choiceOpts.map((opt: any) => (
                <Box key={opt.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="body2">
                    {opt.label}. {opt.text}
                  </Typography>
                  {opt.image && (
                    <img src={opt.image} alt={opt.label}
                      style={{ maxWidth: 200, maxHeight: 120, border: '1px solid #e0e0e0', borderRadius: 4 }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}

          {isFill && fillLabels.length > 0 && (
            <Box sx={{ mt: 1, pl: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>填空标签：</Typography>
              {fillLabels.map((label, idx) => (
                <Chip
                  key={idx}
                  label={`(${idx + 1}) ${label}`}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
              {fillAnswers.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>参考答案：</Typography>
                  {fillAnswers.map((ans, idx) => (
                    <Typography key={idx} variant="body2" sx={{ color: '#1976d2' }}>
                      ({idx + 1}) {ans}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {!isChoice && !isFill && shortAnswer.length > 0 && (
            <Box sx={{ mt: 1, pl: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>参考答案：</Typography>
              <Typography variant="body2" sx={{ color: '#1976d2' }}>{shortAnswer}</Typography>
            </Box>
          )}
        </Box>
      )
    })
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await paperApi.delete(deleteId)
      setDeleteId(null)
      fetchPapers()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err.message || '删除失败')
    }
  }

  const handleSaveQuestion = async (questionId: number, content: string, options?: any) => {
    try {
      await paperApi.updateQuestion(questionId, content, options)
      // 刷新预览
      if (previewPaper) {
        handlePreview(previewPaper.paper.id)
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err.message || '保存失败')
    }
  }


  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">试卷管理</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selectedIds.length > 0 && (
            <Button variant="contained" color="error" onClick={handleBatchDelete}>
              删除选中 ({selectedIds.length})
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/admin/papers/upload')}>
            上传试卷
          </Button>
        </Box>
      </Box>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      {/* 筛选 - v1.1 移除科目筛选 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Select size="small" value={grade} onChange={e => { setGrade(e.target.value); setPage(0) }} displayEmpty sx={{ minWidth: 120 }}>
          <MenuItem value="">全部年级</MenuItem>
          {Object.entries(ALL_GRADE_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </Select>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={papers.length > 0 && selectedIds.length === papers.length}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < papers.length}
                    onChange={toggleSelectAll}
                    size="small"
                  />
                </TableCell>
                <TableCell>试卷名称</TableCell>
                <TableCell>年级</TableCell>
                <TableCell>科目</TableCell>
                <TableCell>题目数</TableCell>
                <TableCell>总分</TableCell>
                <TableCell>上传时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {papers.map(paper => (
                <TableRow key={paper.id} hover selected={selectedIds.includes(paper.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(paper.id)}
                      onChange={() => toggleSelect(paper.id)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{paper.title}</TableCell>
                  <TableCell>{ALL_GRADE_MAP[paper.grade] || paper.grade}</TableCell>
                  <TableCell>
                    {paper.subjects_included?.length > 0
                      ? paper.subjects_included.map((s: string) => SUBJECT_MAP[s as keyof typeof SUBJECT_MAP] || s).join('、')
                      : SUBJECT_MAP[paper.subject as keyof typeof SUBJECT_MAP] || paper.subject}
                  </TableCell>
                  <TableCell>{paper.questionCount}</TableCell>
                  <TableCell>{paper.total_full_score || paper.total_score}</TableCell>
                  <TableCell>{formatDateTime(paper.created_at)}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handlePreview(paper.id)} title="预览">
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(paper.id)} title="删除">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {papers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">暂无数据</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[20]}
          />
        </>
      )}

      {/* 预览弹窗 */}
      <Dialog open={!!previewPaper || previewLoading} onClose={() => setPreviewPaper(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          试卷预览：{previewPaper?.paper?.title}
          <Chip label={`${previewPaper?.questions?.length || 0} 题`} size="small" sx={{ ml: 2 }} />
        </DialogTitle>
        <DialogContent dividers>
          {previewLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            renderPreviewQuestions()
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewPaper(null)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>确定要删除这份试卷吗？</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>取消</Button>
          <Button onClick={handleDelete} color="error" variant="contained">确认删除</Button>
        </DialogActions>
      </Dialog>

      {/* 题目编辑弹窗 */}
      <QuestionEditDialog
        open={!!editingQuestion}
        question={editingQuestion}
        onSave={handleSaveQuestion}
        onClose={() => setEditingQuestion(null)}
      />
    </Box>
  )
}
