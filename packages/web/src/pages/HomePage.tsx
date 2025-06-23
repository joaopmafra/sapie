import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Link,
  Alert,
  Divider,
} from '@mui/material';
import { useState, useEffect } from 'react';

import reactLogo from '../assets/react.svg';
import { useAuth } from '../contexts/AuthContext';

import viteLogo from '/vite.svg';

import {
  HealthApi,
  AuthenticationApi,
  createApiConfiguration,
} from '../lib/api-client';
import type { AuthenticatedUser } from '../lib/api-client';
import { createAuthenticatedApiConfiguration } from '../lib/auth-utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const HomePage = () => {
  const { currentUser } = useAuth();
  const [count, setCount] = useState(0);
  const [healthStatus, setHealthStatus] = useState<string>('');
  const [userInfo, setUserInfo] = useState<AuthenticatedUser | null>(null);
  const [userInfoLoading, setUserInfoLoading] = useState(false);
  const [userInfoError, setUserInfoError] = useState<string>('');

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

  // Fetch user information when user is authenticated
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!currentUser) {
        setUserInfo(null);
        setUserInfoError('');
        return;
      }

      setUserInfoLoading(true);
      setUserInfoError('');

      try {
        // Create authenticated API configuration
        const config = await createAuthenticatedApiConfiguration(
          API_BASE_URL,
          currentUser
        );
        const authApi = new AuthenticationApi(config);

        // Fetch user information from /api/auth endpoint
        const userResponse = await authApi.authControllerGetCurrentUser();
        setUserInfo(userResponse.data);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        setUserInfoError('Failed to fetch user information from API');
      } finally {
        setUserInfoLoading(false);
      }
    };

    fetchUserInfo().catch(console.error);
  }, [currentUser]);

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

        {currentUser && (
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant='h6' gutterBottom>
                User Information from API (/api/auth)
              </Typography>

              {userInfoLoading ? (
                <Typography variant='body2' sx={{ mb: 2 }}>
                  Loading user information...
                </Typography>
              ) : userInfoError ? (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {userInfoError}
                </Alert>
              ) : userInfo ? (
                <Box sx={{ textAlign: 'left' }}>
                  <Typography
                    variant='body2'
                    sx={{
                      mb: 2,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                    }}
                    data-testid='user-info-api'
                  >
                    {JSON.stringify(userInfo, null, 2)}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant='body2' color='text.secondary'>
                    This information was fetched from the <code>/api/auth</code>{' '}
                    endpoint using the Firebase ID token for authentication.
                  </Typography>
                </Box>
              ) : (
                <Typography variant='body2' sx={{ mb: 2 }}>
                  No user information available
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
};

export default HomePage;
