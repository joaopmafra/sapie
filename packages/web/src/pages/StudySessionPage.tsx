import {
  Box,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Typography,
} from '@mui/material';
import { useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import StudySession from '../components/StudySession';
import { useRecordStudyResult } from '../lib/cards';
import { useDueCards } from '../lib/study';
import type { StudyResult } from '../lib/study';

const StudySessionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rootIdsParam = searchParams.get('rootIds') ?? '';

  const rootIds = useMemo(
    () =>
      rootIdsParam
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0),
    [rootIdsParam]
  );

  const { data, isLoading, isError, error } = useDueCards(rootIds);
  const recordResult = useRecordStudyResult();

  const handleRate = useCallback(
    (cardId: string, deckId: string, result: 'know' | 'dont_know') => {
      recordResult.mutate({ deckId, cardId, result });
    },
    [recordResult]
  );

  const handleComplete = useCallback(
    (_results: StudyResult[]) => {
      navigate('/study');
    },
    [navigate]
  );

  const handleExit = useCallback(() => {
    navigate('/study');
  }, [navigate]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : 'Failed to load study cards.';
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity='error'>{message}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/study')}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  if (!data || data.cards.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8 }}>
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant='h4' sx={{ mb: 2 }}>
            All caught up! 🎉
          </Typography>
          <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
            No due cards in the selected content roots.
          </Typography>
          <Button variant='contained' onClick={() => navigate('/study')}>
            Back to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <StudySession
      cards={data.cards}
      graded
      onRate={handleRate}
      onComplete={handleComplete}
      onExit={handleExit}
      isRating={recordResult.isPending}
    />
  );
};

export default StudySessionPage;
