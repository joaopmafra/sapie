import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import React, { useState } from 'react';

import { useCreateNote, useContentItem, type Content } from '../lib/content';
import { PROBLEM_DETAILS_POINTERS } from '../lib/problemDetailsPointers.ts';

import { ClientErrorAlert } from './ClientErrorAlert';

interface CreateNoteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newNote: Content) => void;
  parentId: string;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  open,
  onClose,
  onSuccess,
  parentId,
}) => {
  const createNote = useCreateNote();
  const { data: parentFolder } = useContentItem(parentId || undefined);
  const [noteName, setNoteName] = useState('');
  const [error, setError] = useState<unknown | null>(null);

  const handleSubmit = async () => {
    if (!parentId) {
      setError(
        'Cannot create note: parent folder not selected or user not authenticated.'
      );
      return;
    }
    if (!noteName.trim()) {
      setError('Name is required.');
      return;
    }

    setError(null);

    try {
      const newNote = await createNote.mutateAsync({
        name: noteName.trim(),
        parentId,
      });
      setNoteName('');
      onSuccess(newNote);
    } catch (err) {
      setError(err);
    }
  };

  const handleCancel = () => {
    if (createNote.isPending) return;
    setNoteName('');
    setError(null);
    onClose();
  };

  const parentLabel = parentFolder?.name ?? '…';

  return (
    <Dialog open={open} onClose={handleCancel} fullWidth maxWidth='sm'>
      <DialogTitle>Create New Note</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Creating note in: <strong>{parentLabel}</strong>
        </DialogContentText>
        <TextField
          margin='dense'
          id='title'
          label='Note Name'
          type='text'
          fullWidth
          variant='outlined'
          value={noteName}
          onChange={e => setNoteName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
          disabled={createNote.isPending}
        />
        <ClientErrorAlert
          value={error}
          sx={{ mt: 2 }}
          problemDetailJsonPointer={PROBLEM_DETAILS_POINTERS.CONTENT.name}
        />
      </DialogContent>
      <DialogActions sx={{ p: '0 24px 12px' }}>
        <Button onClick={handleCancel} disabled={createNote.isPending}>
          Cancel
        </Button>
        <Box sx={{ position: 'relative' }}>
          <Button
            onClick={() => void handleSubmit()}
            variant='contained'
            disabled={createNote.isPending}
          >
            Create
          </Button>
          {createNote.isPending && (
            <CircularProgress
              size={24}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px',
              }}
            />
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CreateNoteModal;
