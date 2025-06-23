import { Container, Box, CircularProgress, Typography } from '@mui/material';

interface LoadingComponentProps {
  message?: string;
}

const LoadingComponent = ({
  message = 'Checking authentication...',
}: LoadingComponentProps) => {
  return (
    <Container maxWidth='sm'>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant='body1' color='text.secondary'>
          {message}
        </Typography>
      </Box>
    </Container>
  );
};

export default LoadingComponent;
