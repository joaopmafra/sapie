import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Link,
  Alert,
} from '@mui/material';
import { useState, useEffect } from 'react';

import reactLogo from '../assets/react.svg';
import { useAuth } from '../contexts/AuthContext';

import viteLogo from '/vite.svg';

import { HealthApi, createApiConfiguration } from '../lib/api-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const HomePage = () => {
  const { currentUser } = useAuth();
  const [count, setCount] = useState(0);
  const [healthStatus, setHealthStatus] = useState<string>('');

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        // Create API client instances with configuration
        const config = createApiConfiguration(API_BASE_URL);
        const healthApi = new HealthApi(config);

        // Fetch health status using generated client
        const healthResponse = await healthApi.healthControllerGetHealth();
        setHealthStatus(JSON.stringify(healthResponse.data, null, 2));
      } catch (error) {
        setHealthStatus('Error fetching health status');
        console.error('API Error:', error);
      }
    };
    fetchHealth().catch(console.error);
  }, []);

  return (
    <Container maxWidth='sm'>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          py: 4,
        }}
      >
        {currentUser && (
          <Alert severity='success' sx={{ width: '100%', mb: 2 }}>
            Welcome back, {currentUser.displayName || currentUser.email}!
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Link href='https://vite.dev' target='_blank'>
            <img src={viteLogo} className='logo' alt='Vite logo' />
          </Link>
          <Link href='https://react.dev' target='_blank'>
            <img src={reactLogo} className='logo react' alt='React logo' />
          </Link>
        </Box>

        <Typography variant='h3' component='h1' gutterBottom>
          Vite + React + Firebase
        </Typography>

        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant='h6' gutterBottom>
              API Health Status
            </Typography>

            {healthStatus ? (
              <Typography
                variant='body2'
                sx={{ mb: 2, fontFamily: 'monospace' }}
                data-testid='api-health-status'
              >
                {healthStatus}
              </Typography>
            ) : (
              <Typography
                variant='body2'
                sx={{ mb: 2, fontFamily: 'monospace' }}
              >
                Loading...
              </Typography>
            )}

            <Button
              variant='contained'
              onClick={() => setCount(count => count + 1)}
              sx={{ mb: 2 }}
            >
              count is {count}
            </Button>

            <Typography variant='body1'>
              Edit <code>src/App.tsx</code> and save to test HMR
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Click on the Vite and React logos to learn more
            </Typography>

            {!currentUser && (
              <Typography variant='body2' sx={{ mt: 2 }}>
                <Link href='/login'>Sign in</Link> to unlock more features
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default HomePage;
