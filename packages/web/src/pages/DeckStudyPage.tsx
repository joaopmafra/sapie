import { Box, CircularProgress, Alert, Button, Typography } from '@mui/material';
import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import StudySession from '../components/StudySession';
import { useCards } from '../lib/cards';
import { useContentItem } from '../lib/content';
import type { StudyCard, StudyResult } from '../lib/study';

const DeckStudyPage = () => {
  const navigate = useNavigate();
  const { deckId } = useParams<{ deckId: string }>();

  const { data: deck, isLoading: deckLoading } = useContentItem(deckId);
  const { data: cards = [], isLoading: cardsLoading } = useCards(deckId);

  const studyCards: StudyCard[] = useMemo(
    () =>
      cards.map(card => ({
        id: card.id,
        front: card.front,
        back: card.back,
        dueDate: new Date(card.dueDate),
        interval: card.interval,
        repetitions: card.repetitions,
        deckId: card.deckId,
        deckName: deck?.name ?? 'Deck',
        noteId: deck?.parentId ?? '',
      })),
    [cards, deck],
  );

  const handleComplete = useCallback(
    (_results: StudyResult[]) => {
      navigate(`/decks/${deckId}`);
    },
    [navigate, deckId],
  );

  const handleExit = useCallback(() => {
    navigate(`/decks/${deckId}`);
  }, [navigate, deckId]);

  if (deckLoading || cardsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!deck) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error">Deck not found.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/')}>
          Go home
        </Button>
      </Box>
    );
  }

  if (studyCards.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          No cards in this deck
        </Typography>
        <Button variant="contained" onClick={() => navigate(`/decks/${deckId}`)}>
          Back to deck
        </Button>
      </Box>
    );
  }

  return (
    <StudySession
      cards={studyCards}
      graded={false}
      onComplete={handleComplete}
      onExit={handleExit}
    />
  );
};

export default DeckStudyPage;
