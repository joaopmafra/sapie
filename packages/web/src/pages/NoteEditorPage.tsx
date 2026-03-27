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

import { useContent } from '../contexts/ContentContext';
import { ContentType } from '../lib/content';

const NoteEditorPage = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const { nodeMap } = useContent();
  const [noteName, setNoteName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
      handleNameSave();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleNameCancel();
    }
  };

  const handleNameSave = () => {
    // TODO: Implement actual name saving in Task 5
    // For now, just update the local state and exit editing mode
    console.log('Note name would be saved:', noteName);
    setIsEditing(false);
  };

  const handleNameCancel = () => {
    // Reset to original name and exit editing mode
    if (note) {
      setNoteName(note.name);
    }
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
      'Note note found. Please navigate to the note from the sidebar.'
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={1} sx={{ p: 3 }}>
        {/* Note Header */}
        <Box sx={{ mb: 3 }}>
          {isEditing ? (
            <TextField
              fullWidth
              value={noteName}
              onChange={e => setNoteName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameSave}
              autoFocus
              variant='outlined'
              placeholder='Enter note name...'
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '1.5rem',
                  fontWeight: 500,
                },
              }}
            />
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
              onClick={() => setIsEditing(true)}
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
