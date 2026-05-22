import { Box, Typography } from '@mui/material'

interface QuestionNavProps {
  questions: Array<{ id: number }>
  answers: Record<number, string>
  currentIndex: number
  onSelect: (index: number) => void
}

export function QuestionNav({ questions, answers, currentIndex, onSelect }: QuestionNavProps) {
  const total = questions.length
  const answered = questions.filter(q => {
    const a = answers[q.id]
    return a !== undefined && a !== null && String(a).trim() !== ''
  }).length

  const handleClick = (index: number) => {
    onSelect(index)
    const el = document.getElementById(`q-${index}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e8edf2',
      }}
    >
      <Typography variant="body2" fontWeight={700} color="#4a5568" sx={{ mb: 1.5 }}>
        已答 {answered} / {total}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 0.75,
        }}
      >
        {questions.map((q, index) => {
          const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && String(answers[q.id]).trim() !== ''
          const isCurrent = index === currentIndex

          return (
            <Box
              key={q.id}
              onClick={() => handleClick(index)}
              sx={{
                width: '100%',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1.5,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                bgcolor: isAnswered ? '#1976d2' : '#e2e8f0',
                color: isAnswered ? '#fff' : '#718096',
                border: isCurrent ? '2.5px solid #7c4dff' : '2px solid transparent',
                '&:hover': {
                  opacity: 0.85,
                  transform: 'scale(1.08)',
                },
              }}
            >
              {index + 1}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
