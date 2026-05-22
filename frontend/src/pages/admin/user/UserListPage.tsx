import { useState, useEffect } from 'react'
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
  TextField,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  InputAdornment,
  Snackbar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import { userApi } from '../../../api/user'
import { GRADE_MAP } from '../../../types'
import { formatDateTime } from '../../../utils/formatters'
import { maskPhone } from '../../../utils/formatters'
import { useAuthStore } from '../../../store/authStore'

export function UserListPage() {
  const currentUser = useAuthStore(s => s.user)
  const isTutor = currentUser?.role === 'short_term_tutor'
  const [students, setStudents] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(50)
  const [grade, setGrade] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState('')

  // 新增/编辑弹窗
  const [editDialog, setEditDialog] = useState<{ open: boolean; student?: any }>({ open: false })
  const [editForm, setEditForm] = useState({ name: '', phone: '', grade: '' })
  const [editSaving, setEditSaving] = useState(false)

  // 导入弹窗
  const [importDialog, setImportDialog] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)

  // 删除确认
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = isTutor
        ? await userApi.myStudents({ page: page + 1, pageSize })
        : await userApi.list({
            grade: grade || undefined,
            keyword: keyword || undefined,
            page: page + 1,
            pageSize,
          })
      const d = res.data
      if (d.code === 0) {
        setStudents(d.data!.list)
        setTotal(d.data!.total)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [page, grade, keyword])

  const handleOpenEdit = (student?: any) => {
    setEditForm(student ? { name: student.name, phone: student.phone, grade: student.grade } : { name: '', phone: '', grade: 'junior1' })
    setEditDialog({ open: true, student })
  }

  const handleSaveEdit = async () => {
    setEditSaving(true)
    try {
      if (editDialog.student) {
        await userApi.update(editDialog.student.id, editForm)
        setSnackbar('更新成功')
      } else {
        await userApi.create(editForm)
        setSnackbar('创建成功')
      }
      setEditDialog({ open: false })
      fetchStudents()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setSnackbar(err.message || '操作失败')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await userApi.delete(deleteId)
      setDeleteId(null)
      setSnackbar('删除成功')
      fetchStudents()
    } catch {
      setSnackbar('删除失败')
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    setImportLoading(true)
    const formData = new FormData()
    formData.append('file', importFile)
    try {
      const res = await userApi.import(formData)
      const d = res.data
      if (d.code === 0) {
        setSnackbar(`导入完成：成功 ${d.data!.success}，失败 ${d.data!.failed} 条`)
      } else {
        setSnackbar(d.message)
      }
      setImportDialog(false)
      setImportFile(null)
      fetchStudents()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setSnackbar(err.message || '导入失败')
    } finally {
      setImportLoading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = ['姓名', '手机号', '年级']
    const rows = [['张三', '13800138000', '初一']]
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '考生导入模板.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">用户管理</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate}>
            下载模板
          </Button>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setImportDialog(true)}>
            批量导入
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenEdit()}>
            新增用户
          </Button>
        </Box>
      </Box>

      {/* 筛选 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          size="small"
          placeholder="搜索姓名或手机号"
          value={keyword}
          onChange={e => { setKeyword(e.target.value); setPage(0) }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <Select size="small" value={grade} onChange={e => { setGrade(e.target.value); setPage(0) }} displayEmpty sx={{ minWidth: 120 }}>
          <MenuItem value="">全部年级</MenuItem>
          {Object.entries(GRADE_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </Select>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>姓名</TableCell>
                <TableCell>手机号</TableCell>
                <TableCell>年级</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{maskPhone(s.phone)}</TableCell>
                  <TableCell>{GRADE_MAP[s.grade as keyof typeof GRADE_MAP] || s.grade}</TableCell>
                  <TableCell>{formatDateTime(s.created_at)}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenEdit(s)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(s.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center">暂无数据</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[50]}
          />
        </>
      )}

      {/* 新增/编辑弹窗 */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle>{editDialog.student ? '编辑用户' : '新增用户'}</DialogTitle>
        <DialogContent>
          <TextField label="姓名" fullWidth sx={{ mt: 2 }} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="手机号" fullWidth sx={{ mt: 2 }} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          {/* v1.1: 修复 margin prop，使用 sx 代替 */}
          <Select fullWidth sx={{ mt: 2 }} value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value as string }))} displayEmpty>
            <MenuItem value="" disabled>选择年级</MenuItem>
            {Object.entries(GRADE_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false })}>取消</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={editSaving}>
            {editSaving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 导入弹窗 */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>批量导入用户</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            请下载模板，按格式填写后上传。支持 .xlsx .csv 格式。导入后系统会自动分配最新试卷。
          </Typography>
          <Button variant="outlined" fullWidth onClick={downloadTemplate} sx={{ mb: 2 }}>
            下载模板
          </Button>
          <Button variant="outlined" component="label" fullWidth>
            选择文件
            <input type="file" accept=".xlsx,.csv" hidden onChange={e => setImportFile(e.target.files?.[0] || null)} />
          </Button>
          {importFile && <Typography variant="body2" mt={1}>{importFile.name}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>取消</Button>
          <Button onClick={handleImport} variant="contained" disabled={importLoading || !importFile}>
            {importLoading ? '导入中...' : '开始导入'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>确定要删除该考生吗？相关考试数据也会被删除。</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>取消</Button>
          <Button onClick={handleDelete} color="error" variant="contained">删除</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')} message={snackbar} />
    </Box>
  )
}
