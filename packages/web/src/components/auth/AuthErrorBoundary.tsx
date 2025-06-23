import { Container, Box, Typography, Button, Alert } from '@mui/material';
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class AuthErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Authentication error caught by boundary:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    // Reload the page to reset authentication state
    window.location.reload();
  };

  private handleLogin = () => {
    // Navigate to login page
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth='sm'>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50vh',
              gap: 3,
            }}
          >
            <Alert severity='error' sx={{ width: '100%' }}>
              <Typography variant='h6' gutterBottom>
                Authentication Error
              </Typography>
              <Typography variant='body2' sx={{ mb: 2 }}>
                {this.state.error?.message ||
                  'An authentication error occurred. Please try again.'}
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant='contained'
                color='primary'
                onClick={this.handleRetry}
              >
                Retry
              </Button>
              <Button
                variant='outlined'
                color='primary'
                onClick={this.handleLogin}
              >
                Go to Login
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;
