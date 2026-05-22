import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Checkbox,
  Button,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { assignmentApi } from '../../../api/assignment'
import { paperApi } from '../../../api/paper'
import { userApi } from '../../../api/user'
import { ALL_GRADE_MAP } from '../../../types'

export function AssignPage() {
  const [students, setStudents] = useState<any[]>([])
  const [papers, setPapers] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [selectedPaper, setSelectedPaper] = useState<number | ''>('')
  const [filterGrade, setFilterGrade] = useState('')
  const [snackbar, setSnackbar] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const fetchStudents = async () => {
    try {
      const res = await userApi.list({ grade: filterGrade || undefined, pageSize: 10000 })
      const d = res.data
      if (d.code === 0) setStudents(d.data!.list)
    } catch {
      // ignore
    }
  }

  const fetchPapers = async () => {
    try {
      const res = await paperApi.list({ pageSize: 1000 })
      const d = res.data
      if (d.code === 0) setPapers(d.data!.list)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [filterGrade])

  useEffect(() => {
    fetchPapers()
  }, [])

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleAssign = async () => {
    if (!selectedPaper || selectedStudents.length === 0) return
    setAssigning(true)
    try {
      const res = await assignmentApi.assign({ paperId: selectedPaper as number, studentIds: selectedStudents })
      const d = res.data
      if (d.code === 0) {
        setSnackbar(`分配完成：成功 ${d.data!.assigned}，跳过 ${d.data!.skipped}`)
      } else {
        setSnackbar(d.message)
      }
      setSelectedStudents([])
      setConfirmOpen(false)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setSnackbar(err.message || '分配失败')
    } finally {
      setAssigning(false)
    }
  }

  const selectedPaperInfo = papers.find(p => p.id === selectedPaper)

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>分配试卷</Typography>

      <Grid container spacing={3}>
        {/* 左侧：用户列表 */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">选择考生</Typography>
                <Select size="small" value={filterGrade} onChange={e => setFilterGrade(e.target.value)} displayEmpty sx={{ minWidth: 120 }}>
                  <MenuItem value="">全部年级</MenuItem>
                  {Object.entries(ALL_GRADE_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                已选择 {selectedStudents.length} 名考生
              </Alert>
              <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                <List dense>
                  {students.map(s => (
                    <ListItem key={s.id} disablePadding>
                      <ListItemIcon>
                        <Checkbox
                          checked={selectedStudents.includes(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={s.name}
                        secondary={`${ALL_GRADE_MAP[s.grade] || s.grade} | ${s.phone}`}
                      />
                    </ListItem>
                  ))}
                  {students.length === 0 && (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                      暂无考生
                    </Typography>
                  )}
                </List>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧：选择试卷 */}
        <Grid item xs={12} md={7}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>选择试卷</Typography>
              <Select
                fullWidth
                value={selectedPaper}
                onChange={e => setSelectedPaper(e.target.value as number)}
                displayEmpty
              >
                <MenuItem value="" disabled>请选择试卷</MenuItem>
                {papers.map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.title}（{ALL_GRADE_MAP[p.grade] || p.grade}）
                  </MenuItem>
                ))}
              </Select>

              {selectedPaperInfo && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2"><strong>试卷名称：</strong>{selectedPaperInfo.title}</Typography>
                  <Typography variant="body2"><strong>年级：</strong>{ALL_GRADE_MAP[selectedPaperInfo.grade] || selectedPaperInfo.grade}</Typography>
                  <Typography variant="body2"><strong>总分：</strong>{selectedPaperInfo.total_full_score || selectedPaperInfo.total_score}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={!selectedPaper || selectedStudents.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            分配给 {selectedStudents.length} 名考生
          </Button>
        </Grid>
      </Grid>

      {/* 分配确认弹窗 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>确认分配</DialogTitle>
        <DialogContent>
          确认将试卷「{selectedPaperInfo?.title}」分配给选中的 {selectedStudents.length} 名考生？
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button onClick={handleAssign} variant="contained" disabled={assigning}>
            {assigning ? '分配中...' : '确认分配'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3000} onClose={() => setSnackbar('')} message={snackbar} />
    </Box>
  )
}
