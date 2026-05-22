import { useState, useEffect } from 'react'
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  TablePagination, Select, MenuItem, CircularProgress, Chip,
  Drawer, IconButton, Button,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CloseIcon from '@mui/icons-material/Close'
import { adminExamApi } from '../../../api/exam'
import { SUBJECT_MAP } from '../../../types'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'

interface ExamDetail {
  record: any
  student: any
  questions: any[]
  studentAnswers: any[]
}

export function ExamDataPage() {
  const [records, setRecords] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [detail, setDetail] = useState<ExamDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await adminExamApi.list({
        subject: subject || undefined,
        page: page + 1,
        pageSize,
      })
      const d = res.data
      if (d.code === 0) {
        setRecords(d.data!.list)
        setTotal(d.data!.total)
      } else {
        setError(d.message)
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err.message || '获取失败')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchRecords() }, [page, subject])

  const handleShowDetail = async (id: number) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await adminExamApi.getDetail(id)
      if (res.data.code === 0) setDetail(res.data.data as any)
    } catch { /* ignore */ }
    finally { setDetailLoading(false) }
  }

  const answerMap = new Map((detail?.studentAnswers || []).map((a: any) => [a.questionId, a.answer]))

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>考试数据</Typography>
      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Select size="small" value={subject} onChange={e => { setSubject(e.target.value); setPage(0) }} displayEmpty sx={{ minWidth: 120 }}>
          <MenuItem value="">全部科目</MenuItem>
          {Object.entries(SUBJECT_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </Select>
        <Button variant="contained" onClick={fetchRecords}>刷新</Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>考生姓名</TableCell>
                <TableCell>科目</TableCell>
                <TableCell>得分</TableCell>
                <TableCell>S班资格</TableCell>
                <TableCell>时长</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{r.subjectName}</TableCell>
                  <TableCell>{r.score !== null ? `${r.score} / ${r.fullScore}` : '-'}</TableCell>
                  <TableCell>
                    {r.sClassQualified !== undefined ? (
                      <Chip
                        label={r.sClassQualified ? '达标' : '未达标'}
                        size="small"
                        color={r.sClassQualified ? 'success' : 'default'}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>{r.durationFormatted || '-'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleShowDetail(r.id)} title="查看详情">
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center">暂无数据</TableCell></TableRow>
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

      <Drawer anchor="right" open={!!detail} onClose={() => setDetail(null)} PaperProps={{ sx: { width: { xs: '100%', sm: 500 } } }}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">考试详情</Typography>
            <IconButton onClick={() => setDetail(null)}><CloseIcon /></IconButton>
          </Box>

          {detailLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : detail ? (
            <>
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body1"><strong>考生：</strong>{detail.student.name}</Typography>
                <Typography variant="body1"><strong>科目：</strong>{detail.record.subjectName}</Typography>
                <Typography variant="body1">
                  <strong>得分：</strong>
                  <span style={{ color: '#1976d2', fontWeight: 'bold', fontSize: '1.2em' }}>
                    {detail.record.score} / {detail.record.fullScore}
                  </span>
                  （{detail.record.scoreRate}%）
                </Typography>
                <Typography variant="body1">
                  <strong>S班资格：</strong>
                  <Chip
                    label={detail.record.sClassQualified ? '达标' : '未达标'}
                    size="small"
                    color={detail.record.sClassQualified ? 'success' : 'error'}
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Box>

              <Typography variant="h6" mb={2}>题目详情</Typography>
              {detail.questions.map((q: any, idx: number) => {
                const studentAnswer = answerMap.get(q.id)?.answer || '(未作答)'
                const correctAnswer = q.correct_answer || ''
                const isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
                return (
                  <Box key={q.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="body1" fontWeight="bold">
                      第{idx + 1}题 [{q.type === 'choice' ? '选择' : '填空'}]（10分）
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{q.content}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>考生答案：</strong>
                      <span style={{ color: isCorrect ? '#2e7d32' : '#d32f2f' }}>{studentAnswer}</span>
                    </Typography>
                    <Typography variant="body2">
                      <strong>正确答案：</strong>{correctAnswer}
                    </Typography>
                  </Box>
                )
              })}
            </>
          ) : null}
        </Box>
      </Drawer>
    </Box>
  )
}
