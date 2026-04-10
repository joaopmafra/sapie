import { Container, Box, Typography, Paper } from '@mui/material';
import { Navigate, useLocation } from 'react-router-dom';

import FirebaseUIAuth from '../components/auth/FirebaseUIAuth';
import { useAuth } from '../contexts/AuthContext';

type LoginRedirectState = { from?: { pathname?: string } } | null | undefined;

const DEFAULT_AFTER_LOGIN = '/';

/**
 * After sign-in (or visiting /login while already signed in), choose where to go.
 * `state.from` comes from ProtectedRoute when the user was sent here from a protected URL;
 * it can be stale (new account, emulator reset). `/notes/:id` in particular often 404s, so
 * we send those users home instead.
 */
function postLoginRedirectPath(
  state: LoginRedirectState,
  fallback: string
): string {
  const p = state?.from?.pathname;
  if (!p || p === '/login') return fallback;
  if (p.startsWith('/notes/')) return fallback;
  return p;
}

const LoginPage = () => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  const handleSignInSuccess = () => {
    // Let React re-render with currentUser set, then Navigate below runs.
    return false;
  };

  const handleSignInFailure = async (error: unknown) => {
    console.error('Sign-in failed:', error);
  };

  if (loading) {
    return (
      <Container maxWidth='sm'>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
          }}
        >
          <Typography variant='body1'>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (currentUser) {
    return (
      <Navigate
        to={postLoginRedirectPath(location.state, DEFAULT_AFTER_LOGIN)}
        replace
        state={{}}
      />
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
