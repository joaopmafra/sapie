import { Container, Box, Typography, Paper } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import FirebaseUIAuth from '../components/auth/FirebaseUIAuth';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination from location state
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    // Redirect to intended destination if user is already authenticated
    if (!loading && currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, loading, navigate, from]);

  const handleSignInSuccess = (_authResult: unknown, redirectUrl?: string) => {
    // Navigate to the intended destination or provided redirect URL
    const targetUrl = redirectUrl || from;
    navigate(targetUrl, { replace: true });

    // Return false to prevent FirebaseUI from handling the redirect
    return false;
  };

  const handleSignInFailure = async (error: unknown) => {
    console.error('Sign-in failed:', error);
    // You can add custom error handling here, like showing a toast notification
  };

  if (loading) {
    return (
      <Container maxWidth='sm'>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
          }}
        >
          <Typography variant='body1'>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='sm'>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: '100%',
            maxWidth: 400,
          }}
        >
          <Typography
            variant='h4'
            component='h1'
            gutterBottom
            textAlign='center'
            sx={{ mb: 3 }}
          >
            Welcome to Sapie
          </Typography>

          <Typography
            variant='body2'
            color='text.secondary'
            textAlign='center'
            sx={{ mb: 3 }}
          >
            Sign in to your account or create a new one
          </Typography>

          <FirebaseUIAuth
            signInSuccessUrl='/'
            onSignInSuccess={handleSignInSuccess}
            onSignInFailure={handleSignInFailure}
          />
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
