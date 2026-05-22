import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from './theme'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppRouter />
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
