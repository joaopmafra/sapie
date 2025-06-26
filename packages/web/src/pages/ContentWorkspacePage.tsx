import { Folder as FolderIcon } from '@mui/icons-material';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { contentService } from '../lib/content';
import type { Content } from '../lib/content';

/**
 * Content Workspace Page
 *
 * This page displays the user's content workspace, starting with their root directory.
 * It provides the entry point for all content management operations.
 */
const ContentWorkspacePage = () => {
  const { currentUser } = useAuth();
  const [rootDirectory, setRootDirectory] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Load the user's root directory when the component mounts
  useEffect(() => {
    const loadRootDirectory = async () => {
      if (!currentUser) {
        setRootDirectory(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const directory = await contentService.getRootDirectory(currentUser);
        setRootDirectory(directory);
      } catch (err) {
        console.error('Failed to load root directory:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load your content workspace. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadRootDirectory().catch(console.error);
  }, [currentUser]);

  // Show loading state
  if (loading) {
    return (
      <Container maxWidth='md'>
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
          <CircularProgress />
          <Typography variant='body1' color='text.secondary'>
            Loading your content workspace...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container maxWidth='md'>
        <Box sx={{ py: 4 }}>
          <Alert severity='error' sx={{ mb: 2 }}>
            <Typography variant='body1' gutterBottom>
              Failed to load your content workspace
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {error}
            </Typography>
          </Alert>
        </Box>
      </Container>
    );
  }

  // Show empty state (user not authenticated)
  if (!currentUser || !rootDirectory) {
    return (
      <Container maxWidth='md'>
        <Box sx={{ py: 4 }}>
          <Alert severity='info'>
            <Typography variant='body1'>
              Please sign in to access your content workspace.
            </Typography>
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='md'>
      <Box sx={{ py: 4 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant='h4' component='h1' gutterBottom>
            Content Workspace
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Welcome to your personal content workspace. Here you can organize
            and manage your study materials.
          </Typography>
        </Box>

        {/* Root Directory Display */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <FolderIcon sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant='h5' component='h2'>
                  {rootDirectory.name}
                </Typography>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
                >
                  <Chip
                    label={rootDirectory.type}
                    size='small'
                    variant='outlined'
                    color='primary'
                  />
                  <Typography variant='body2' color='text.secondary'>
                    Created: {rootDirectory.createdAt.toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Empty State Message */}
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant='h6' color='text.secondary' gutterBottom>
                Your workspace is ready!
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                This is where your notes, documents, and study materials will be
                organized.
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                Content creation features are coming soon. Stay tuned!
              </Typography>
            </Box>

            {/* Debug Information (for development) */}
            {import.meta.env.DEV && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant='body2' color='text.secondary' gutterBottom>
                  Debug Information:
                </Typography>
                <Typography
                  variant='body2'
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    backgroundColor: 'grey.100',
                    padding: 1,
                    borderRadius: 1,
                  }}
                >
                  {JSON.stringify(rootDirectory, null, 2)}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ContentWorkspacePage;
