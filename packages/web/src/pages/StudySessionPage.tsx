import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { useRecordStudyResult } from '../lib/cards';
import { useDueCards } from '../lib/study';
import type { StudyCard, StudyPhase, StudyResult } from '../lib/study';

const StudySessionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rootIdsParam = searchParams.get('rootIds') ?? '';

  const rootIds = rootIdsParam
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);

  const { data, isLoading, isError, error } = useDueCards(rootIds);
  const recordResult = useRecordStudyResult();

  const [phase, setPhase] = useState<StudyPhase>('front');
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [results, setResults] = useState<StudyResult[]>([]);
  const initialized = useRef(false);

  // Initialize queue when data loads
  useEffect(() => {
    if (data && data.cards.length > 0 && !initialized.current) {
      setQueue([...data.cards]);
      initialized.current = true;
    }
  }, [data]);

  const currentCard = queue.length > 0 ? queue[0] : null;

  const handleReveal = useCallback(() => {
    setPhase('back');
  }, []);

  const handleRate = useCallback(
    (result: 'know' | 'dont_know') => {
      if (!currentCard) return;

      // Persist the study result to the backend
      recordResult.mutate({
        deckId: currentCard.deckId,
        cardId: currentCard.id,
        result,
      });

      setResults(prev => [...prev, { cardId: currentCard.id, result }]);
      setPhase('front');

      setQueue(prev => {
        if (prev.length === 0) return prev;

        if (result === 'dont_know') {
          // Move current card to end of queue
          const newQueue = [...prev.slice(1), prev[0]];
          return newQueue;
        } else {
          // Remove current card from queue
          const newQueue = prev.slice(1);
          if (newQueue.length === 0) {
            // Session complete
            setTimeout(() => setPhase('summary'), 0);
          }
          return newQueue;
        }
      });
    },
    [currentCard, recordResult],
  );

  const correctCount = results.filter(r => r.result === 'know').length;
  const incorrectCount = results.filter(r => r.result === 'dont_know').length;

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
        <Alert severity="error">{message}</Alert>
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
          <Typography variant="h4" sx={{ mb: 2 }}>
            All caught up! 🎉
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            No due cards in the selected content roots.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/study')}>
            Back to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  if (phase === 'summary') {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 3 }}>
            Session Complete
          </Typography>
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography variant="body1">
              Total cards studied: {results.length}
            </Typography>
            <Typography variant="body1" color="success.main">
              Correct: {correctCount}
            </Typography>
            <Typography variant="body1" color="error.main">
              Incorrect: {incorrectCount}
            </Typography>
          </Stack>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/study')}
          >
            Back to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!currentCard) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8 }}>
        <Alert severity="info">No more cards to review.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {queue.length} card{queue.length !== 1 ? 's' : ''} remaining
        </Typography>
        <Button size="small" onClick={() => navigate('/study')}>
          Finish Early
        </Button>
      </Box>

      <Paper elevation={2} sx={{ p: 4, minHeight: 300 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {currentCard.deckName}
        </Typography>

        <Typography variant="h5" sx={{ mb: phase === 'back' ? 2 : 4 }}>
          {currentCard.front}
        </Typography>

        {phase === 'back' && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h5" color="primary" sx={{ mb: 4 }}>
              {currentCard.back}
            </Typography>
          </>
        )}
      </Paper>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        {phase === 'front' && (
          <Button
            variant="contained"
            size="large"
            onClick={handleReveal}
            sx={{ minWidth: 200, minHeight: 48 }}
          >
            Reveal
          </Button>
        )}

        {phase === 'back' && (
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="error"
              size="large"
              onClick={() => handleRate('dont_know')}
              sx={{ minWidth: 160, minHeight: 48 }}
              disabled={recordResult.isPending}
            >
              I don&rsquo;t know
            </Button>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={() => handleRate('know')}
              sx={{ minWidth: 160, minHeight: 48 }}
              disabled={recordResult.isPending}
            >
              I know
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default StudySessionPage;
