import { Alert, AlertTitle } from '@mui/material'

interface Props {
  message: string
  title?: string
  severity?: 'error' | 'warning' | 'info' | 'success'
  onClose?: () => void
}

export function ErrorAlert({ message, title, severity = 'error', onClose }: Props) {
  return (
    <Alert severity={severity} onClose={onClose} sx={{ mb: 2 }}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </Alert>
  )
}
