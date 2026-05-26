import { useState, useEffect } from 'react'
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Snackbar, CircularProgress, Checkbox,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import UploadIcon from '@mui/icons-material/Upload'
import DownloadIcon from '@mui/icons-material/Download'
import { questionBankApi } from '../../../api/exam'
import { SUBJECT_MAP, Subject } from '../../../types'

interface QuestionItem {
  id: number
  subject: string
  type: string
  content: string
  options: string | null
  correct_answer: string
  created_at: string
}

interface Stats {
  subject: string
  choice: number
  fill: number
}

export function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterSubject, setFilterSubject] = useState('')
  const [filterType, setFilterType] = useState('')
  const [stats, setStats] = useState<Stats[]>([])

  // 添加题目弹窗
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    subject: '', type: 'choice', content: '', options: '', correct_answer: '',
  })
  const [addLoading, setAddLoading] = useState(false)

  // 导入
  const [importLoading, setImportLoading] = useState(false)
  const [snackOpen, setSnackOpen] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')

  // 批量选择
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const allIds = questions.map(q => q.id)
    setSelectedIds(prev => prev.length === allIds.length ? [] : allIds)
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`确定删除选中的 ${selectedIds.length} 道题目？此操作不可撤销。`)) return
    try {
      await questionBankApi.batchDelete(selectedIds)
      setSelectedIds([])
      fetchQuestions()
      fetchStats()
      setSnackMsg(`成功删除 ${selectedIds.length} 道题目`)
      setSnackOpen(true)
    } catch { /* ignore */ }
  }

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const res = await questionBankApi.list({
        subject: filterSubject || undefined,
        type: filterType || undefined,
        page,
        pageSize: 50,
      })
      if (res.data.code === 0 && res.data.data) {
        setQuestions(res.data.data.list)
        setTotal(res.data.data.total)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const fetchStats = async () => {
    try {
      const res = await questionBankApi.stats()
      if (res.data.code === 0 && res.data.data) {
        setStats(res.data.data)
      }
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchQuestions(); fetchStats() }, [page, filterSubject, filterType])

  const handleAdd = async () => {
    if (!addForm.subject || !addForm.content || !addForm.correct_answer) return
    setAddLoading(true)
    try {
      const res = await questionBankApi.create({
        subject: addForm.subject,
        type: addForm.type,
        content: addForm.content,
        options: addForm.type === 'choice' ? JSON.stringify(
          addForm.options.split('\n').filter(Boolean).map(line => {
            const m = line.match(/^([A-D])[.、]\s*(.+)/)
            return m ? { label: m[1], text: m[2] } : null
          }).filter(Boolean)
        ) : null,
        correct_answer: addForm.correct_answer,
      })
      if (res.data.code === 0) {
        setAddOpen(false)
        setAddForm({ subject: '', type: 'choice', content: '', options: '', correct_answer: '' })
        fetchQuestions()
        fetchStats()
        setSnackMsg('添加成功')
        setSnackOpen(true)
      }
    } finally { setAddLoading(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该题目？')) return
    await questionBankApi.delete(id)
    fetchQuestions()
    fetchStats()
    setSnackMsg('删除成功')
    setSnackOpen(true)
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setImportLoading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await questionBankApi.batchImport(fd)
        if (res.data.code === 0 && res.data.data) {
          setSnackMsg(`成功导入 ${res.data.data.count} 道题目`)
          setSnackOpen(true)
          fetchQuestions()
          fetchStats()
        }
      } finally { setImportLoading(false) }
    }
    input.click()
  }

  const formatOptions = (opts: string | null) => {
    if (!opts) return '-'
    try {
      const arr = JSON.parse(opts)
      if (Array.isArray(arr)) return arr.map((o: { label: string; text: string }) => `${o.label}. ${o.text}`).join(' | ')
    } catch { return opts }
    return opts
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>题库管理</Typography>

      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {stats.map(s => (
          <Card key={s.subject} sx={{ p: 2, minWidth: 140, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {SUBJECT_MAP[s.subject as Subject] || s.subject}
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              选择{s.choice} / 填空{s.fill}
            </Typography>
          </Card>
        ))}
      </Box>

      {/* 操作栏 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          select size="small" label="科目" sx={{ minWidth: 120 }}
          value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1) }}
        >
          <MenuItem value="">全部</MenuItem>
          {Object.entries(SUBJECT_MAP).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" label="题型" sx={{ minWidth: 100 }}
          value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
        >
          <MenuItem value="">全部</MenuItem>
          <MenuItem value="choice">选择题</MenuItem>
          <MenuItem value="fill">填空题</MenuItem>
        </TextField>
        <Box sx={{ flex: 1 }} />
        {selectedIds.length > 0 && (
          <Button variant="contained" color="error" onClick={handleBatchDelete}>
            删除选中 ({selectedIds.length})
          </Button>
        )}
        <Button variant="text" startIcon={<DownloadIcon />} href="/题库批量导入模板.xlsx" download>
          下载模板
        </Button>
        <Button variant="outlined" startIcon={<UploadIcon />} onClick={handleImport} disabled={importLoading}>
          {importLoading ? '导入中...' : '批量导入'}
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          添加题目
        </Button>
      </Box>

      {/* 题目列表 */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={questions.length > 0 && selectedIds.length === questions.length}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < questions.length}
                  onChange={toggleSelectAll}
                  size="small"
                />
              </TableCell>
              <TableCell>科目</TableCell>
              <TableCell>题型</TableCell>
              <TableCell>题目</TableCell>
              <TableCell>选项</TableCell>
              <TableCell>答案</TableCell>
              <TableCell width={80}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center"><CircularProgress /></TableCell></TableRow>
            ) : questions.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#a0aec0' }}>暂无题目，请添加</TableCell></TableRow>
            ) : questions.map(q => (
              <TableRow key={q.id} hover selected={selectedIds.includes(q.id)}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{SUBJECT_MAP[q.subject as Subject] || q.subject}</TableCell>
                <TableCell><Chip label={q.type === 'choice' ? '选择' : '填空'} size="small" /></TableCell>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.content}
                </TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatOptions(q.options)}
                </TableCell>
                <TableCell>{q.correct_answer}</TableCell>
                <TableCell>
                  <IconButton size="small" color="error" onClick={() => handleDelete(q.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      {total > 50 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
          <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <Typography sx={{ lineHeight: 2.5 }}>第 {page} / {Math.ceil(total / 50)} 页</Typography>
          <Button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </Box>
      )}

      {/* 添加题目弹窗 */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加题目</DialogTitle>
        <DialogContent>
          <TextField
            select fullWidth label="科目" sx={{ mt: 2, mb: 2 }}
            value={addForm.subject}
            onChange={e => setAddForm(f => ({ ...f, subject: e.target.value }))}
          >
            {Object.entries(SUBJECT_MAP).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
          <TextField
            select fullWidth label="题型" sx={{ mb: 2 }}
            value={addForm.type}
            onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
          >
            <MenuItem value="choice">选择题</MenuItem>
            <MenuItem value="fill">填空题</MenuItem>
          </TextField>
          <TextField
            fullWidth label="题目内容" multiline rows={3} sx={{ mb: 2 }}
            value={addForm.content}
            onChange={e => setAddForm(f => ({ ...f, content: e.target.value }))}
          />
          {addForm.type === 'choice' && (
            <TextField
              fullWidth label="选项（每行一个，格式：A. xxx）" multiline rows={4} sx={{ mb: 2 }}
              value={addForm.options}
              onChange={e => setAddForm(f => ({ ...f, options: e.target.value }))}
              helperText="示例：A. 李白  B. 杜甫"
            />
          )}
          <TextField
            fullWidth label="正确答案"
            value={addForm.correct_answer}
            onChange={e => setAddForm(f => ({ ...f, correct_answer: e.target.value }))}
            helperText={addForm.type === 'choice' ? '输入选项字母，如 A' : '输入正确答案文本'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>取消</Button>
          <Button onClick={handleAdd} variant="contained" disabled={addLoading}>
            {addLoading ? '添加中...' : '确认添加'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        message={snackMsg}
      />
    </Box>
  )
}
