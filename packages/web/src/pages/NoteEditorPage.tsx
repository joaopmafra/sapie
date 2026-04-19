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
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useParams } from 'react-router-dom';

import { ClientErrorAlert } from '../components/ClientErrorAlert';
import { useAuth } from '../contexts/AuthContext';
import {
  ContentType,
  useBodySignedUrlFetchSuppressedAfterSave,
  useContentBody,
  useContentItem,
  useNoteBody,
  useRenameContent,
  useSaveNoteBody,
} from '../lib/content';
import { PROBLEM_DETAILS_POINTERS } from '../lib/problemDetailsPointers.ts';

import {
  NOTE_BODY_AUTOSAVE_DEBOUNCE_MS,
  NOTE_BODY_SAVED_HEADER_MS,
  noteEditorSaveHeaderText,
  type NoteEditorSavePhase,
} from './note-editor-save-status';

const NoteEditorPage = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const [editorSessionId] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  );
  const { currentUser } = useAuth();
  const { data: note, isLoading, isError, error } = useContentItem(noteId);
  const suppressBodySignedUrlFetchAfterSave =
    useBodySignedUrlFetchSuppressedAfterSave(noteId, editorSessionId);
  const suppressSignedUrlFetch = Boolean(
    suppressBodySignedUrlFetchAfterSave.data
  );
  const fetchBodySignedUrl = Boolean(note && note.size != null);
  /** When false, signed-URL query is off — do not use its `isPending` (disabled + unfetched stays pending). */
  const waitForBodySignedUrlQuery =
    fetchBodySignedUrl && !suppressSignedUrlFetch;
  const bodySignedUrlQuery = useContentBody(noteId, {
    enabled: waitForBodySignedUrlQuery,
  });
  const signedUrl = bodySignedUrlQuery.data?.signedUrl ?? null;
  const noteBodyQuery = useNoteBody(noteId, signedUrl);
  const saveNoteBody = useSaveNoteBody();
  const renameContent = useRenameContent();

  const [noteName, setNoteName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [renameError, setRenameError] = useState<unknown | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [savePhase, setSavePhase] = useState<NoteEditorSavePhase>('idle');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const renameInProgressRef = useRef(false);

  const draftBodyRef = useRef(draftBody);
  draftBodyRef.current = draftBody;
  const baselineBodyRef = useRef('');
  const editorSessionIdRef = useRef(editorSessionId);
  editorSessionIdRef.current = editorSessionId;
  const saveMutateAsyncRef = useRef(saveNoteBody.mutateAsync);
  saveMutateAsyncRef.current = saveNoteBody.mutateAsync;

  const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const savedHeaderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const clearAutosaveDebounce = useCallback(() => {
    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
      autosaveDebounceRef.current = null;
    }
  }, []);

  const clearSavedHeaderTimer = useCallback(() => {
    if (savedHeaderTimerRef.current) {
      clearTimeout(savedHeaderTimerRef.current);
      savedHeaderTimerRef.current = null;
    }
  }, []);

  const scheduleDebouncedAutosave = useCallback(() => {
    clearAutosaveDebounce();
    autosaveDebounceRef.current = setTimeout(() => {
      autosaveDebounceRef.current = null;
      void runSaveRef.current();
    }, NOTE_BODY_AUTOSAVE_DEBOUNCE_MS);
  }, [clearAutosaveDebounce]);

  const runSaveRef = useRef<() => Promise<void>>(async () => {});

  const runSave = useCallback(async () => {
    const id = noteId;
    if (!id) {
      return;
    }
    const draft = draftBodyRef.current;
    const base = baselineBodyRef.current;
    if (draft === base) {
      setSavePhase('idle');
      return;
    }

    setSavePhase('saving');
    try {
      const sent = draft;
      await saveMutateAsyncRef.current({
        id,
        bodyText: sent,
        editorSessionId: editorSessionIdRef.current,
      });
      const nowDraft = draftBodyRef.current;
      baselineBodyRef.current = sent;

      if (nowDraft !== sent) {
        setSavePhase('pending');
        scheduleDebouncedAutosave();
        return;
      }

      setSavePhase('saved');
      clearSavedHeaderTimer();
      savedHeaderTimerRef.current = setTimeout(() => {
        savedHeaderTimerRef.current = null;
        setSavePhase('idle');
      }, NOTE_BODY_SAVED_HEADER_MS);
    } catch {
      setSavePhase('error');
    }
  }, [clearSavedHeaderTimer, noteId, scheduleDebouncedAutosave]);

  runSaveRef.current = runSave;

  const resolvedServerBody = useMemo(() => {
    if (!noteId || !note) {
      return undefined;
    }
    if (!fetchBodySignedUrl) {
      return '';
    }
    if (!bodySignedUrlQuery.isSuccess) {
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
    note,
    fetchBodySignedUrl,
    bodySignedUrlQuery.isSuccess,
    bodySignedUrlQuery.data,
    noteBodyQuery.isSuccess,
    noteBodyQuery.data,
  ]);

  useEffect(() => {
    if (resolvedServerBody === undefined) {
      return;
    }
    const incoming = resolvedServerBody;
    const currentDraft = draftBodyRef.current;
    const serverContentChangedVsLocal = incoming !== currentDraft;

    setDraftBody(incoming);
    baselineBodyRef.current = incoming;

    // Post-save TanStack cache sync often refreshes markdown with the same bytes; do not
    // reset save phase or cancel the “Saved” header timer in that case (Story 55 Phase 3).
    if (serverContentChangedVsLocal) {
      clearAutosaveDebounce();
      clearSavedHeaderTimer();
      setSavePhase('idle');
    }
  }, [
    resolvedServerBody,
    noteId,
    clearAutosaveDebounce,
    clearSavedHeaderTimer,
  ]);

  useEffect(() => {
    const idForSession = noteId;
    return () => {
      clearAutosaveDebounce();
      clearSavedHeaderTimer();
      if (idForSession && draftBodyRef.current !== baselineBodyRef.current) {
        void saveMutateAsyncRef.current({
          id: idForSession,
          bodyText: draftBodyRef.current,
          editorSessionId: editorSessionIdRef.current,
        });
      }
    };
  }, [noteId, clearAutosaveDebounce, clearSavedHeaderTimer]);

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
    (waitForBodySignedUrlQuery && bodySignedUrlQuery.isPending) ||
    (Boolean(signedUrl) && noteBodyQuery.isPending);

  const bodyLoadError =
    (waitForBodySignedUrlQuery && bodySignedUrlQuery.isError) ||
    (Boolean(signedUrl) && noteBodyQuery.isError);

  const bodyLoadErrorDetail =
    (waitForBodySignedUrlQuery ? bodySignedUrlQuery.error : null) ??
    (signedUrl ? noteBodyQuery.error : null);

  const handleDraftChange = (value: string) => {
    setDraftBody(value);
    clearSavedHeaderTimer();

    if (value === baselineBodyRef.current) {
      clearAutosaveDebounce();
      setSavePhase('idle');
      return;
    }

    setSavePhase('pending');
    scheduleDebouncedAutosave();
  };

  const handleRetrySave = () => {
    clearAutosaveDebounce();
    void runSave();
  };

  const saveHeaderText = noteEditorSaveHeaderText(savePhase);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Box
          sx={{
            mb: 3,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
                  problemDetailJsonPointer={
                    PROBLEM_DETAILS_POINTERS.CONTENT.name
                  }
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
          <Box
            aria-live='polite'
            sx={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              pt: 0.5,
            }}
          >
            {saveHeaderText ? (
              <Typography
                variant='body2'
                color={
                  savePhase === 'saved' ? 'success.main' : 'text.secondary'
                }
              >
                {saveHeaderText}
              </Typography>
            ) : null}
            {savePhase === 'error' ? (
              <Button
                type='button'
                size='small'
                variant='outlined'
                onClick={() => void handleRetrySave()}
                disabled={!currentUser || bodyLoadPending}
              >
                Retry
              </Button>
            ) : null}
          </Box>
        </Box>

        <Box sx={{ mb: 3, color: 'text.secondary' }}>
          <Typography variant='body2'>
            Last saved on: {note.updatedAt.toLocaleString()}
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
              <TextField
                multiline
                fullWidth
                minRows={16}
                value={draftBody}
                onChange={e => handleDraftChange(e.target.value)}
                placeholder='Start writing your note…'
                disabled={!currentUser || bodyLoadPending}
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
