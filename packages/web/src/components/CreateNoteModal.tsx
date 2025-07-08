import {
  Alert,
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
import { useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { contentService } from '../lib/content';
import type { Content } from '../lib/content';

interface CreateNoteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newNote: Content) => void;
  parentId: string | null;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  open,
  onClose,
  onSuccess,
  parentId,
}) => {
  const { currentUser } = useAuth();
  const { getParentPath } = useContent();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!currentUser || !parentId) {
      setError(
        'Cannot create note: parent folder not selected or user not authenticated.'
      );
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newNote = await contentService.createNote(
        currentUser,
        title,
        parentId
      );
      onSuccess(newNote);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setTitle('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
      <DialogTitle>Create New Note</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Creating note in: <strong>{getParentPath(parentId)}</strong>
        </DialogContentText>
        <TextField
          margin='dense'
          id='title'
          label='Note Title'
          type='text'
          fullWidth
          variant='outlined'
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          disabled={loading}
        />
        {error && (
          <Alert severity='error' sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: '0 24px 12px' }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Box sx={{ position: 'relative' }}>
          <Button onClick={handleSubmit} variant='contained' disabled={loading}>
            Create
          </Button>
          {loading && (
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
