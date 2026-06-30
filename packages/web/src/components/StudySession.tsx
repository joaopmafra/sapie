import {
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import { useState, useCallback, useEffect, useRef } from 'react';

import type { StudyCard, StudyPhase, StudyResult } from '../lib/study';

export interface StudySessionProps {
  cards: StudyCard[];
  /** If true, calls onRate for persistence; if false, only tracks locally. */
  graded?: boolean;
  onRate?: (cardId: string, deckId: string, result: 'know' | 'dont_know') => void;
  onComplete: (results: StudyResult[]) => void;
  onExit: () => void;
  isRating?: boolean;
}

const StudySession = ({
  cards,
  graded = true,
  onRate,
  onComplete,
  onExit,
  isRating = false,
}: StudySessionProps) => {
  const [phase, setPhase] = useState<StudyPhase>('front');
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [results, setResults] = useState<StudyResult[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (cards.length > 0 && !initialized.current) {
      setQueue([...cards]);
      initialized.current = true;
    }
  }, [cards]);

  const currentCard = queue.length > 0 ? queue[0] : null;

  const handleReveal = useCallback(() => {
    setPhase('back');
  }, []);

  const handleRate = useCallback(
    (result: 'know' | 'dont_know') => {
      if (!currentCard) return;

      setResults(prev => [...prev, { cardId: currentCard.id, result }]);
      setPhase('front');

      if (graded && onRate) {
        onRate(currentCard.id, currentCard.deckId, result);
      }

      setQueue(prev => {
        if (prev.length === 0) return prev;
        if (result === 'dont_know') {
          return [...prev.slice(1), prev[0]];
        } else {
          const newQueue = prev.slice(1);
          if (newQueue.length === 0) {
            setTimeout(() => {
              setResults(current => {
                setPhase('summary');
                return current;
              });
            }, 0);
          }
          return newQueue;
        }
      });
    },
    [currentCard, graded, onRate],
  );

  const correctCount = results.filter(r => r.result === 'know').length;
  const incorrectCount = results.filter(r => r.result === 'dont_know').length;

  if (cards.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8 }}>
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            No cards to study
          </Typography>
          <Button variant="contained" onClick={onExit}>
            Go back
          </Button>
        </Paper>
      </Box>
    );
  }

  if (phase === 'summary') {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center' }}>
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
            onClick={() => onComplete(results)}
          >
            {graded ? 'Back to Dashboard' : 'Back'}
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
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4, px: { xs: 2, sm: 0 } }}>
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {queue.length} card{queue.length !== 1 ? 's' : ''} remaining
        </Typography>
        <Button size="small" onClick={onExit}>
          Finish Early
        </Button>
      </Box>

      <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 }, minHeight: 300 }}>
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
            sx={{ minWidth: 200, minHeight: 48, width: { xs: '100%', sm: 'auto' } }}
          >
            Reveal
          </Button>
        )}

        {phase === 'back' && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <Button
              variant="contained"
              color="error"
              size="large"
              onClick={() => handleRate('dont_know')}
              sx={{ minWidth: 160, minHeight: 48, flex: { xs: 1, sm: 'none' } }}
              disabled={isRating}
            >
              I don&rsquo;t know
            </Button>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={() => handleRate('know')}
              sx={{ minWidth: 160, minHeight: 48, flex: { xs: 1, sm: 'none' } }}
              disabled={isRating}
            >
              I know
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default StudySession;
