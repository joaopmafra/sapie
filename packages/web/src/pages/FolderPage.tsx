import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import { isAxiosError } from 'axios';
import { useParams } from 'react-router-dom';

import { ContentType, useContentItem } from '../lib/content';

const FolderPage = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const { data: folder, isLoading, isError, error } = useContentItem(folderId);

  const createError = (errorMessage: string) => (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Alert severity='error' sx={{ mb: 2 }}>
        {errorMessage}
      </Alert>
    </Box>
  );

  if (!folderId) {
    return createError('Folder ID is required');
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return createError(
        'Folder not found. This folder may have been deleted or the link may be invalid.'
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to load this folder.';
    return createError(message);
  }

  if (!folder) {
    return createError('Folder not found.');
  }

  if (folder.type !== ContentType.DIRECTORY) {
    return createError('The specified content is not a folder');
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant='h4' component='h1' sx={{ mb: 3 }}>
          {folder.name || 'Untitled Folder'}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Created: {folder.createdAt.toLocaleString()}
        </Typography>
      </Paper>
    </Box>
  );
};

export default FolderPage;
