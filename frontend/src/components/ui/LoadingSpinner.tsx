import { CircularProgress, Box } from '@mui/material'

interface Props {
  fullScreen?: boolean
  tip?: string
}

export function LoadingSpinner({ fullScreen, tip }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: fullScreen ? '100vh' : '100%',
        minHeight: 200,
        gap: 2,
      }}
    >
      <CircularProgress />
      {tip && <span>{tip}</span>}
    </Box>
  )
}
