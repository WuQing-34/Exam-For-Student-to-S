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
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Drawer,
  Chip,
  IconButton,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DownloadIcon from '@mui/icons-material/Download'
import CloseIcon from '@mui/icons-material/Close'
import { adminExamApi } from '../../../api/exam'
import { ALL_GRADE_MAP, SUBJECT_MAP } from '../../../types'
import { QuestionContent } from '../../../components/ui/QuestionContent'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'

interface ExamDetail {
  record: any
  student: any
  paper: any
  questions: any[]
  studentAnswers: any[]
}

export function ExamDataPage() {
  const [records, setRecords] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [grade, setGrade] = useState('')
  const [minScore, setMinScore] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 详情抽屉
  const [detail, setDetail] = useState<ExamDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await adminExamApi.list({
        grade: grade || undefined,
        minScore: minScore ? parseInt(minScore) : undefined,
        maxScore: maxScore ? parseInt(maxScore) : undefined,
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [page, grade, minScore, maxScore])

  const handleShowDetail = async (id: number) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await adminExamApi.getDetail(id)
      const d = res.data
      if (d.code === 0) setDetail(d.data)
    } catch {
      // ignore
    } finally {
      setDetailLoading(false)
    }
  }

  const handleExport = async (id: number) => {
    try {
      const blob = await adminExamApi.export(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `考试报告_${Date.now()}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err.message || '导出失败')
    }
  }

  const answerMap = new Map((detail?.studentAnswers || []).map((a: any) => [a.questionId, a.answer]))

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>考试数据</Typography>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      {/* 筛选 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Select size="small" value={grade} onChange={e => { setGrade(e.target.value); setPage(0) }} displayEmpty sx={{ minWidth: 120 }}>
          <MenuItem value="">全部年级</MenuItem>
          {Object.entries(ALL_GRADE_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </Select>
        <TextField
          size="small"
          type="number"
          placeholder="最低分"
          value={minScore}
          onChange={e => { setMinScore(e.target.value); setPage(0) }}
          sx={{ width: 100 }}
        />
        <TextField
          size="small"
          type="number"
          placeholder="最高分"
          value={maxScore}
          onChange={e => { setMaxScore(e.target.value); setPage(0) }}
          sx={{ width: 100 }}
        />
        <Button variant="contained" onClick={fetchRecords}>筛选</Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>考生姓名</TableCell>
                <TableCell>年级</TableCell>
                <TableCell>试卷名称</TableCell>
                <TableCell>得分</TableCell>
                {/* v1.1: S班资格列 */}
                <TableCell>S班资格</TableCell>
                <TableCell>时长</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{ALL_GRADE_MAP[r.studentGrade] || r.studentGrade}</TableCell>
                  <TableCell>{r.paperTitle}</TableCell>
                  <TableCell>{r.score !== null ? `${r.score} / ${r.totalScore}` : '-'}</TableCell>
                  {/* v1.1: S班资格 */}
                  <TableCell>
                    {r.sClassQualified !== undefined ? (
                      <Chip
                        label={r.sClassQualified ? '合格' : '不合格'}
                        size="small"
                        color={r.sClassQualified ? 'primary' : 'default'}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>{r.durationFormatted}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.status === 'submitted' ? '已完成' : r.status === 'in_progress' ? '答题中' : '未开始'}
                      size="small"
                      color={r.status === 'submitted' ? 'success' : r.status === 'in_progress' ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {r.status === 'submitted' && (
                      <>
                        <IconButton size="small" onClick={() => handleShowDetail(r.id)} title="查看详情">
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleExport(r.id)} title="导出Word">
                          <DownloadIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow><TableCell colSpan={9} align="center">暂无数据</TableCell></TableRow>
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

      {/* 详情抽屉 */}
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
                <Typography variant="body1"><strong>年级：</strong>{ALL_GRADE_MAP[detail.student.grade] || detail.student.grade}</Typography>
                <Typography variant="body1"><strong>试卷：</strong>{detail.paper.title}</Typography>
                <Typography variant="body1">
                  <strong>得分：</strong>
                  <span style={{ color: '#1976d2', fontWeight: 'bold', fontSize: '1.2em' }}>
                    {detail.record.score ?? 0} / {detail.paper.total_score}
                  </span>
                  {detail.paper.total_score > 0 && `（${((detail.record.score ?? 0) / detail.paper.total_score * 100).toFixed(1)}%）`}
                </Typography>
                {/* v1.1: S班资格 */}
                {detail.record.sClassQualified !== undefined && (
                  <Typography variant="body1">
                    <strong>S班资格：</strong>
                    <Chip
                      label={detail.record.sClassQualified ? '合格' : '不合格'}
                      size="small"
                      color={detail.record.sClassQualified ? 'primary' : 'error'}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                )}
              </Box>

              {/* v1.1: 分科成绩 */}
              {detail.record.subjectScores && detail.record.subjectScores.length > 0 && (
                <>
                  <Typography variant="h6" mb={2}>分科成绩</Typography>
                  <Box sx={{ mb: 3 }}>
                    {detail.record.subjectScores.map((ss: any) => (
                      <Box key={ss.subject} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                        <Typography>{ss.subject_name}</Typography>
                        <Typography fontWeight="bold">
                          {ss.score} / {ss.full_score}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              <Typography variant="h6" mb={2}>题目详情</Typography>
              {detail.questions.map((q: any) => {
                const studentAnswer = answerMap.get(q.id) || '(未作答)'
                const isCorrect = studentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
                return (
                  <Box key={q.id} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="body1" fontWeight="bold">
                      第{q.order_num}题 [{q.type === 'choice' ? '选择' : q.type === 'fill' ? '填空' : '简答'}]
                      {q.subject && ` [${SUBJECT_MAP[q.subject as keyof typeof SUBJECT_MAP] || q.subject}]`}（{q.score}分）
                    </Typography>
                    <QuestionContent content={q.content} />
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>考生答案：</strong>
                      <span style={{ color: isCorrect ? '#2e7d32' : '#d32f2f' }}>{studentAnswer}</span>
                    </Typography>
                    <Typography variant="body2">
                      <strong>正确答案：</strong>{q.correct_answer}
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
