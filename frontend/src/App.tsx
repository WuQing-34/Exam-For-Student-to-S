import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppRouter } from './router'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from './theme'

function AppWrapper() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRouter />
    </ThemeProvider>
  )
}

const router = createBrowserRouter([
  { path: '*', element: <AppWrapper /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
