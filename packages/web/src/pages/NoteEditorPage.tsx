import {
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  Button,
} from '@mui/material';
import { isAxiosError } from 'axios';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { ClientErrorAlert } from '../components/ClientErrorAlert';
import { useAuth } from '../contexts/AuthContext';
import {
  ContentType,
  useContentBody,
  useContentItem,
  useNoteBody,
  useRenameContent,
  useSaveNoteBody,
} from '../lib/content';
import { PROBLEM_DETAILS_POINTERS } from '../lib/problemDetailsPointers.ts';

const NoteEditorPage = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const { currentUser } = useAuth();
  const { data: note, isLoading, isError, error } = useContentItem(noteId);
  const bodySignedUrlQuery = useContentBody(noteId);
  const signedUrl = bodySignedUrlQuery.data?.signedUrl ?? null;
  const noteBodyQuery = useNoteBody(noteId, signedUrl);
  const saveNoteBody = useSaveNoteBody();
  const renameContent = useRenameContent();

  const [noteName, setNoteName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [renameError, setRenameError] = useState<unknown | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [saveUi, setSaveUi] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const renameInProgressRef = useRef(false);

  const resolvedServerBody = useMemo(() => {
    if (!noteId || !bodySignedUrlQuery.isSuccess) {
      return undefined;
    }
    if (bodySignedUrlQuery.data === null) {
      return '';
    }
    if (!noteBodyQuery.isSuccess) {
      return undefined;
    }
    return noteBodyQuery.data ?? '';
  }, [
    noteId,
    bodySignedUrlQuery.isSuccess,
    bodySignedUrlQuery.data,
    noteBodyQuery.isSuccess,
    noteBodyQuery.data,
  ]);

  useEffect(() => {
    if (resolvedServerBody === undefined) {
      return;
    }
    setDraftBody(resolvedServerBody);
  }, [resolvedServerBody, noteId]);

  useEffect(() => {
    if (note) {
      setNoteName(note.name);
    }
  }, [note]);

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
    setRenameError(null);

    try {
      await renameContent.mutateAsync({
        id: noteId,
        name: trimmed,
        parentId: note.parentId,
      });
      setNoteName(trimmed);
      setIsEditing(false);
    } catch (err) {
      setRenameError(err);
    } finally {
      renameInProgressRef.current = false;
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

  if (!noteId) {
    return createError('Note ID is required');
  }

  if (isLoading) {
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

  if (isError) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return createError(
        'Note not found. This note may have been deleted or the link may be invalid.'
      );
    }
    const message =
      error instanceof Error ? error.message : 'Failed to load this note.';
    return createError(message);
  }

  if (!note) {
    return createError('Note not found.');
  }

  if (note.type !== ContentType.NOTE) {
    return createError('The specified content is not a note');
  }

  const bodyLoadPending =
    bodySignedUrlQuery.isPending ||
    (Boolean(signedUrl) && noteBodyQuery.isPending);

  const bodyLoadError =
    bodySignedUrlQuery.isError || (Boolean(signedUrl) && noteBodyQuery.isError);

  const bodyLoadErrorDetail =
    bodySignedUrlQuery.error ?? (signedUrl ? noteBodyQuery.error : null);

  const handleDraftChange = (value: string) => {
    setDraftBody(value);
    if (saveUi) {
      setSaveUi(null);
    }
  };

  const handleSaveBody = async () => {
    if (!noteId) {
      return;
    }
    setSaveUi(null);
    try {
      await saveNoteBody.mutateAsync({ id: noteId, bodyText: draftBody });
      setSaveUi({ kind: 'success', message: 'Saved.' });
    } catch (err: unknown) {
      const text =
        err instanceof Error
          ? err.message
          : 'Save failed. Check your connection and try again.';
      setSaveUi({ kind: 'error', message: text });
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={1} sx={{ p: 3 }}>
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
                disabled={renameContent.isPending}
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

        <Box sx={{ mb: 3, color: 'text.secondary' }}>
          <Typography variant='body2'>
            Created: {note.createdAt.toLocaleDateString()}
          </Typography>
          <Typography variant='body2'>
            Modified: {note.updatedAt.toLocaleDateString()}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          {bodyLoadError ? (
            <Alert severity='error' sx={{ mb: 2 }}>
              {bodyLoadErrorDetail instanceof Error
                ? bodyLoadErrorDetail.message
                : 'Failed to load note body.'}
            </Alert>
          ) : null}

          {bodyLoadPending ? (
            <Box
              sx={{
                minHeight: '240px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress size={32} />
            </Box>
          ) : (
            <>
              {saveUi ? (
                <Alert
                  role='status'
                  aria-live='polite'
                  severity={saveUi.kind === 'success' ? 'success' : 'error'}
                  sx={{ mb: 2 }}
                >
                  {saveUi.message}
                </Alert>
              ) : null}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1,
                }}
              >
                <Button
                  type='button'
                  variant='contained'
                  onClick={() => void handleSaveBody()}
                  disabled={
                    !currentUser || saveNoteBody.isPending || bodyLoadPending
                  }
                >
                  {saveNoteBody.isPending ? 'Saving…' : 'Save'}
                </Button>
              </Box>
              <TextField
                multiline
                fullWidth
                minRows={16}
                value={draftBody}
                onChange={e => handleDraftChange(e.target.value)}
                placeholder='Start writing your note…'
                inputProps={{
                  'aria-label': 'Note body',
                }}
              />
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default NoteEditorPage;
