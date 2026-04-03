import {
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { ClientErrorAlert } from '../components/ClientErrorAlert';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import { contentService, ContentType } from '../lib/content';
import { PROBLEM_DETAILS_POINTERS } from '../lib/problemDetailsPointers.ts';

const NoteEditorPage = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const { currentUser } = useAuth();
  const { nodeMap, updateContentInMap } = useContent();
  const [noteName, setNoteName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<unknown | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const renameInProgressRef = useRef(false);

  // Get note data from the nodeMap
  const note = noteId ? nodeMap.get(noteId) : undefined;

  useEffect(() => {
    if (!noteId) {
      setError('Note ID is required');
      setLoading(false);
      return;
    }

    // Check if note exists in nodeMap
    if (note) {
      setLoading(false);
      if (note.type !== ContentType.NOTE) {
        setError('The specified content is not a note');
        return;
      }
      setError(null);
      setNoteName(note.name);
    } else {
      // Note not found in nodeMap - this could happen if user navigates directly to URL
      // without going through the app flow
      setError('Note not found. Please navigate to the note from the sidebar.');
      setLoading(false);
    }
  }, [noteId, note]);

  // Focus the input when editing mode is activated
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditing]);

  const handleNameKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleNameSave();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleNameCancel();
    }
  };

  const handleNameSave = async () => {
    if (!noteId || !note || renameInProgressRef.current) {
      return;
    }

    const trimmed = noteName.trim();
    if (!trimmed) {
      setRenameError('Name is required.');
      return;
    }

    if (trimmed === note.name) {
      setRenameError(null);
      setIsEditing(false);
      return;
    }

    if (!currentUser) {
      setRenameError('You must be signed in to rename this note.');
      return;
    }

    renameInProgressRef.current = true;
    setIsRenaming(true);
    setRenameError(null);

    try {
      const updated = await contentService.renameContent(
        currentUser,
        noteId,
        trimmed
      );
      updateContentInMap(updated);
      setNoteName(updated.name);
      setIsEditing(false);
    } catch (err) {
      setRenameError(err);
    } finally {
      renameInProgressRef.current = false;
      setIsRenaming(false);
    }
  };

  const handleNameCancel = () => {
    if (note) {
      setNoteName(note.name);
    }
    setRenameError(null);
    setIsEditing(false);
  };

  const createError = (errorMessage: string) => {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Alert severity='error' sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      </Box>
    );
  };

  if (loading) {
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

  if (error) {
    return createError(error);
  }

  if (!note) {
    return createError(
      'Note not found. Please navigate to the note from the sidebar.'
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={1} sx={{ p: 3 }}>
        {/* Note Header */}
        <Box sx={{ mb: 3 }}>
          {isEditing ? (
            <Box>
              <TextField
                fullWidth
                inputRef={nameInputRef}
                value={noteName}
                onChange={e => setNoteName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={() => void handleNameSave()}
                disabled={isRenaming}
                variant='outlined'
                placeholder='Enter note name...'
                error={Boolean(renameError)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '1.5rem',
                    fontWeight: 500,
                  },
                }}
              />
              <ClientErrorAlert
                value={renameError}
                sx={{ mt: 1 }}
                problemDetailJsonPointer={PROBLEM_DETAILS_POINTERS.CONTENT.name}
              />
            </Box>
          ) : (
            <Typography
              variant='h4'
              component='h1'
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                p: 1,
                borderRadius: 1,
                transition: 'background-color 0.2s',
              }}
              onClick={() => {
                setRenameError(null);
                setIsEditing(true);
              }}
              title='Click to edit name'
            >
              {noteName || 'Untitled Note'}
            </Typography>
          )}
        </Box>

        {/* Note Metadata */}
        <Box sx={{ mb: 3, color: 'text.secondary' }}>
          <Typography variant='body2'>
            Created: {note.createdAt.toLocaleDateString()}
          </Typography>
          <Typography variant='body2'>
            Modified: {note.updatedAt.toLocaleDateString()}
          </Typography>
        </Box>

        {/* Note Content Area - Placeholder for future content editing */}
        <Box
          sx={{
            minHeight: '400px',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant='body1'>
            Note content editing will be implemented in future tasks.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default NoteEditorPage;
