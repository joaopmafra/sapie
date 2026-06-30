import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import { useAppSnackbar } from '../hooks/useAppSnackbar';
import {
  useCards,
  useCreateCard,
  useDeleteCard,
  useUpdateCard,
} from '../lib/cards';
import type { Card } from '../lib/cards';
import { useContentItem } from '../lib/content';
import { getErrorMessageOr } from '../lib/error-messages-utils';

const DeckViewPage = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useAppSnackbar();

  // ── Deck metadata ─────────────────────────────────────────────
  const {
    data: deck,
    isLoading: deckLoading,
    isError: deckError,
    error: deckErrorData,
  } = useContentItem(deckId);

  // ── Cards ─────────────────────────────────────────────────────
  const { data: cards = [], isLoading: cardsLoading } = useCards(deckId);

  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();

  // ── Create dialog state ───────────────────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  // ── Edit dialog state ─────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<Card | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  // ── Delete dialog state ───────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);

  // ── Error display helper ──────────────────────────────────────
  const createError = (errorMessage: string) => (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Alert severity='error' sx={{ mb: 2 }}>
        {errorMessage}
      </Alert>
    </Box>
  );

  // ── Loading / error states ────────────────────────────────────
  if (!deckId) {
    return createError('Deck ID is required');
  }

  if (deckLoading) {
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

  if (deckError) {
    if (isAxiosError(deckErrorData) && deckErrorData.response?.status === 404) {
      return createError(
        'Deck not found. This deck may have been deleted or the link may be invalid.'
      );
    }
    const message =
      deckErrorData instanceof Error
        ? deckErrorData.message
        : 'Failed to load this deck.';
    return createError(message);
  }

  if (!deck) {
    return createError('Deck not found.');
  }

  // ── Handlers ──────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setNewFront('');
    setNewBack('');
    setCreateDialogOpen(true);
  };

  const handleCreate = () => {
    if (!deckId || !newFront.trim() || !newBack.trim()) return;
    createCard.mutate(
      { deckId, front: newFront.trim(), back: newBack.trim() },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          setNewFront('');
          setNewBack('');
          showSuccess('Card created');
        },
        onError: err => {
          showError(getErrorMessageOr(err, 'Failed to create card'));
        },
      }
    );
  };

  const handleOpenEdit = (card: Card) => {
    setEditTarget(card);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const handleSaveEdit = () => {
    if (!editTarget || !deckId || !editFront.trim() || !editBack.trim()) return;
    updateCard.mutate(
      {
        deckId,
        cardId: editTarget.id,
        front: editFront.trim(),
        back: editBack.trim(),
      },
      {
        onSuccess: () => {
          setEditTarget(null);
          showSuccess('Card updated');
        },
        onError: err => {
          showError(getErrorMessageOr(err, 'Failed to update card'));
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget || !deckId) return;
    deleteCard.mutate(
      { deckId, cardId: deleteTarget.id },
      {
        onSuccess: () => {
          setDeleteTarget(null);
          showSuccess('Card deleted');
        },
        onError: err => {
          showError(getErrorMessageOr(err, 'Failed to delete card'));
          setDeleteTarget(null);
        },
      }
    );
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1,
          }}
        >
          <IconButton
            onClick={() => navigate(-1)}
            aria-label='Go back'
            size='small'
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant='h4' component='h1' sx={{ flexGrow: 1 }}>
            {deck.name || 'Untitled Deck'}
          </Typography>
          <Button
            variant='contained'
            color='primary'
            disabled
            title='Study mode coming soon (Story 78)'
          >
            Study
          </Button>
        </Box>
        <Typography variant='body2' color='text.secondary'>
          Created: {deck.createdAt.toLocaleString()}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Cards: {cards.length}
        </Typography>
      </Paper>

      {/* ── Card List ───────────────────────────────────────── */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant='h5' component='h2'>
            Cards
          </Typography>
          <Button variant='contained' onClick={handleOpenCreate}>
            Add Card
          </Button>
        </Box>

        {cardsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : cards.length === 0 ? (
          <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
            No cards yet. Click "Add Card" to create your first flashcard.
          </Typography>
        ) : (
          <List disablePadding>
            {cards.map((card, index) => (
              <React.Fragment key={card.id}>
                {index > 0 && <Divider component='li' />}
                <ListItem
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        edge='end'
                        aria-label='Edit card'
                        onClick={() => handleOpenEdit(card)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge='end'
                        aria-label='Delete card'
                        onClick={() => setDeleteTarget(card)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={card.front}
                    secondary={card.back}
                    primaryTypographyProps={{
                      sx: { fontWeight: 500 },
                    }}
                    secondaryTypographyProps={{
                      sx: { mt: 0.5 },
                    }}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* ── Create Card Dialog ──────────────────────────────── */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      >
        <DialogTitle>Add Card</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin='dense'
            label='Front'
            placeholder='Question or prompt'
            fullWidth
            multiline
            minRows={2}
            value={newFront}
            onChange={e => setNewFront(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin='dense'
            label='Back'
            placeholder='Answer'
            fullWidth
            multiline
            minRows={2}
            value={newBack}
            onChange={e => setNewBack(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCreateDialogOpen(false)}
            disabled={createCard.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              !newFront.trim() || !newBack.trim() || createCard.isPending
            }
            variant='contained'
          >
            {createCard.isPending ? 'Adding…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Card Dialog ────────────────────────────────── */}
      <Dialog open={editTarget !== null} onClose={() => setEditTarget(null)}>
        <DialogTitle>Edit Card</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin='dense'
            label='Front'
            placeholder='Question or prompt'
            fullWidth
            multiline
            minRows={2}
            value={editFront}
            onChange={e => setEditFront(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin='dense'
            label='Back'
            placeholder='Answer'
            fullWidth
            multiline
            minRows={2}
            value={editBack}
            onChange={e => setEditBack(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setEditTarget(null)}
            disabled={updateCard.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            disabled={
              !editFront.trim() || !editBack.trim() || updateCard.isPending
            }
            variant='contained'
          >
            {updateCard.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Card Confirmation ────────────────────────── */}
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        message={`Are you sure you want to delete the card "${deleteTarget?.front ?? ''}"? This action cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteCard.isPending}
      />
    </Box>
  );
};

export default DeckViewPage;
