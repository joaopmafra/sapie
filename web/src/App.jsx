import { useState } from 'react'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  Button, 
  Card, 
  CardContent,
  Stack
} from '@mui/material'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            SAPIE
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container component="main" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Stack spacing={4} alignItems="center">
          <Box sx={{ display: 'flex', gap: 2 }}>
            <a href="https://vite.dev" target="_blank" rel="noreferrer">
              <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <a href="https://react.dev" target="_blank" rel="noreferrer">
              <img src={reactLogo} className="logo react" alt="React logo" />
            </a>
          </Box>

          <Typography variant="h3" component="h1" gutterBottom>
            Vite + React
          </Typography>

          <Card sx={{ width: '100%', maxWidth: 600 }}>
            <CardContent>
              <Stack spacing={2} alignItems="center">
                <Button 
                  variant="contained" 
                  onClick={() => setCount((count) => count + 1)}
                  size="large"
                >
                  Count is {count}
                </Button>
                <Typography>
                  Edit <code>src/App.jsx</code> and save to test HMR
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Typography variant="body2" color="text.secondary">
            Click on the Vite and React logos to learn more
          </Typography>
        </Stack>
      </Container>
    </Box>
  )
}

export default App
