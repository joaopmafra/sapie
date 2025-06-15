import { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Link
} from '@mui/material'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [healthStatus, setHealthStatus] = useState<string>('')

  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then(data => setHealthStatus(JSON.stringify(data, null, 2)))
      .catch(() => setHealthStatus('Error fetching health status'))
  }, [])

  return (
    <Container maxWidth="sm">
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        py: 4
      }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Link href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </Link>
          <Link href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </Link>
        </Box>

        <Typography variant="h3" component="h1" gutterBottom>
          Vite + React
        </Typography>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              API Health Status
            </Typography>

            {healthStatus
              ? <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace' }} data-testid="api-health-status">
                {healthStatus}
              </Typography>
              : <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace' }}>
                Loading...
              </Typography>
            }

            <Button
              variant="contained"
              onClick={() => setCount((count) => count + 1)}
              sx={{ mb: 2 }}
            >
              count is {count}
            </Button>
            <Typography variant="body1">
              Edit <code>src/App.tsx</code> and save to test HMR
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click on the Vite and React logos to learn more
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}

export default App
