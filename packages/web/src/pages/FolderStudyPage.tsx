import {
  Box,
  CircularProgress,
  Alert,
  Button,
  Typography,
} from '@mui/material';
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import StudySession from '../components/StudySession';
import { useContentItem } from '../lib/content';
import { useFolderCards } from '../lib/study';
import type { StudyResult } from '../lib/study';

const FolderStudyPage = () => {
  const navigate = useNavigate();
  const { folderId } = useParams<{ folderId: string }>();

  const { data: folder } = useContentItem(folderId);
  const { data, isLoading, isError, error } = useFolderCards(folderId);

  const handleComplete = useCallback(
    (_results: StudyResult[]) => {
      navigate(`/folders/${folderId}`);
    },
    [navigate, folderId]
  );

  const handleExit = useCallback(() => {
    navigate(`/folders/${folderId}`);
  }, [navigate, folderId]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : 'Failed to load folder cards.';
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity='error'>{message}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/folders/${folderId}`)}>
          Back to folder
        </Button>
      </Box>
    );
  }

  if (!data || data.cards.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, textAlign: 'center' }}>
        <Typography variant='h5' sx={{ mb: 2 }}>
          No cards found
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
          {folder?.name ?? 'This folder'} has no cards to study. Add decks with
          cards first.
        </Typography>
        <Button
          variant='contained'
          onClick={() => navigate(`/folders/${folderId}`)}
        >
          Back to folder
        </Button>
      </Box>
    );
  }

  return (
    <StudySession
      cards={data.cards}
      graded={false}
      onComplete={handleComplete}
      onExit={handleExit}
    />
  );
};

export default FolderStudyPage;
