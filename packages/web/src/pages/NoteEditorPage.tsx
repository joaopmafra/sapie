import type { MDXEditorMethods } from '@mdxeditor/editor';
import {
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  Button,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useParams, useBlocker, type BlockerFunction } from 'react-router-dom';

import { ClientErrorAlert } from '../components/ClientErrorAlert';
import { useAuth } from '../contexts/AuthContext';
import {
  ContentType,
  noteBodyVersionKey,
  contentQueryKeys,
  useBodySignedUrlFetchSuppressedAfterSave,
  useContentBody,
  useContentItem,
  useNoteBody,
  useRenameContent,
  useSaveNoteBody,
} from '../lib/content';
import { PROBLEM_DETAILS_POINTERS } from '../lib/problemDetailsPointers.ts';

import type { NoteBodyMarkdownChangeOptions } from './note-body-editor/note-body-editor-props';
import { NoteImageUploadContext } from './note-body-editor/note-image-upload-context';
import { NoteBodyEditor } from './note-body-editor/NoteBodyEditor';
import { useNoteImageHandlers } from './note-body-editor/use-note-image-handlers';
import {
  NOTE_BODY_AUTOSAVE_DEBOUNCE_MS,
  NOTE_BODY_SAVED_HEADER_MS,
  noteEditorSaveHeaderText,
  noteEditorShouldWarnBeforeUnload,
  type NoteEditorSavePhase,
} from './note-editor-save-status';

const NoteEditorPage = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const [editorSessionId] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  );
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: note, isLoading, isError, error } = useContentItem(noteId);
  const suppressBodySignedUrlFetchAfterSave =
    useBodySignedUrlFetchSuppressedAfterSave(noteId, editorSessionId);
  const suppressSignedUrlFetch = Boolean(
    suppressBodySignedUrlFetchAfterSave.data
  );
  const fetchBodySignedUrl = Boolean(note && note.body != null);
  /** When false, signed-URL query is off — do not use its `isPending` (disabled + unfetched stays pending). */
  const waitForBodySignedUrlQuery =
    fetchBodySignedUrl && !suppressSignedUrlFetch;
  const bodySignedUrlQuery = useContentBody(noteId, {
    enabled: waitForBodySignedUrlQuery,
  });
  const signedUrl = bodySignedUrlQuery.data?.signedUrl ?? null;
  const bodyVersionKey = note ? noteBodyVersionKey(note) : null;
  const noteBodyQuery = useNoteBody(noteId, signedUrl, bodyVersionKey);
  const cachedNoteBodyFromPut = useQuery({
    queryKey:
      noteId != null && bodyVersionKey != null
        ? contentQueryKeys.noteBodyText(noteId, bodyVersionKey)
        : (['content', 'note-body-text', '__disabled__'] as const),
    queryFn: async () => {
      if (noteId == null || bodyVersionKey == null) {
        return '';
      }
      return (
        queryClient.getQueryData<string>(
          contentQueryKeys.noteBodyText(noteId, bodyVersionKey)
        ) ?? ''
      );
    },
    enabled:
      Boolean(noteId) &&
      bodyVersionKey != null &&
      fetchBodySignedUrl &&
      suppressSignedUrlFetch,
    staleTime: Infinity,
  });
  const saveNoteBody = useSaveNoteBody();
  const renameContent = useRenameContent();

  const [noteName, setNoteName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [renameError, setRenameError] = useState<unknown | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [bodyReady, setBodyReady] = useState(false);
  const [savePhase, setSavePhase] = useState<NoteEditorSavePhase>('idle');
  const savePhaseRef = useRef<NoteEditorSavePhase>('idle');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const renameInProgressRef = useRef(false);
  const richBodyEditorRef = useRef<MDXEditorMethods | null>(null);

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
  /** True for the whole `runSave` async turn, including chained PUTs (Story 55 Phase 4). */
  const saveInFlightRef = useRef(false);
  /** Another `runSave` was requested while a save was already running — drain after the current PUT. */
  const queuedRunSaveRef = useRef(false);
  const navigationFlushInProgressRef = useRef(false);
  const beforeUnloadStayFlushTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  /** Avoid `setSavePhase` after unmount while async save chains still finish (flush / overlap). */
  const isMountedRef = useRef(true);
  const safeSetSavePhase = useCallback((phase: NoteEditorSavePhase) => {
    savePhaseRef.current = phase;
    if (isMountedRef.current) {
      setSavePhase(phase);
    }
  }, []);

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

  const runSaveRef = useRef<(targetNoteId?: string) => Promise<void>>(
    async () => {}
  );

  const runSave = useCallback(
    async (targetNoteId?: string) => {
      if (saveInFlightRef.current) {
        queuedRunSaveRef.current = true;
        return;
      }
      saveInFlightRef.current = true;
      try {
        for (;;) {
          const id = targetNoteId ?? noteId;
          if (!id) {
            break;
          }

          const draft = draftBodyRef.current;
          const base = baselineBodyRef.current;
          if (draft === base) {
            queuedRunSaveRef.current = false;
            safeSetSavePhase('idle');
            break;
          }

          safeSetSavePhase('saving');
          const sent = draft;
          try {
            await saveMutateAsyncRef.current({
              id,
              bodyText: sent,
              editorSessionId: editorSessionIdRef.current,
            });
          } catch {
            queuedRunSaveRef.current = false;
            safeSetSavePhase('error');
            break;
          }

          baselineBodyRef.current = sent;
          const hadQueued = queuedRunSaveRef.current;
          queuedRunSaveRef.current = false;

          if (draftBodyRef.current !== baselineBodyRef.current || hadQueued) {
            safeSetSavePhase('pending');
            continue;
          }

          safeSetSavePhase('saved');
          clearSavedHeaderTimer();
          savedHeaderTimerRef.current = setTimeout(() => {
            savedHeaderTimerRef.current = null;
            safeSetSavePhase('idle');
          }, NOTE_BODY_SAVED_HEADER_MS);
          break;
        }
      } finally {
        saveInFlightRef.current = false;
      }
    },
    [clearSavedHeaderTimer, noteId, safeSetSavePhase]
  );

  runSaveRef.current = runSave;

  const flushSaveAfterImageInsert = useCallback(() => {
    clearAutosaveDebounce();
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        void runSaveRef.current();
      });
    });
  }, [clearAutosaveDebounce]);

  const { imageUploadHandler, imagePreviewHandler, uploadImageAttachment } =
    useNoteImageHandlers(currentUser, noteId, flushSaveAfterImageInsert);

  const noteImageUploadContextValue = useMemo(
    () => ({
      uploadImageAttachment,
      onImageInserted: flushSaveAfterImageInsert,
    }),
    [uploadImageAttachment, flushSaveAfterImageInsert]
  );

  const shouldBlockNavigation = useCallback<BlockerFunction>(() => {
    return noteEditorShouldWarnBeforeUnload({
      draftBody: draftBodyRef.current,
      baselineBody: baselineBodyRef.current,
      debounceScheduled: autosaveDebounceRef.current !== null,
      saveInFlight: saveInFlightRef.current,
    });
  }, []);

  const navigationBlocker = useBlocker(shouldBlockNavigation);
  const navigationBlockerRef = useRef(navigationBlocker);
  navigationBlockerRef.current = navigationBlocker;

  const waitForSaveIdle = useCallback(async () => {
    while (saveInFlightRef.current) {
      await Promise.resolve();
    }
  }, []);

  const flushSaveForNavigation = useCallback(async (): Promise<boolean> => {
    const isSaveError = () => savePhaseRef.current === 'error';

    clearAutosaveDebounce();

    await waitForSaveIdle();
    if (draftBodyRef.current === baselineBodyRef.current && !isSaveError()) {
      return true;
    }

    for (;;) {
      if (isSaveError()) {
        return false;
      }

      if (draftBodyRef.current === baselineBodyRef.current) {
        return true;
      }

      await runSaveRef.current();
      await waitForSaveIdle();

      if (isSaveError()) {
        return false;
      }

      if (draftBodyRef.current === baselineBodyRef.current) {
        return true;
      }
    }
  }, [clearAutosaveDebounce, waitForSaveIdle]);

  const flushSaveForNavigationRef = useRef(flushSaveForNavigation);
  flushSaveForNavigationRef.current = flushSaveForNavigation;

  const resolvedServerBody = useMemo(() => {
    if (!noteId || !note) {
      return undefined;
    }
    if (!fetchBodySignedUrl) {
      return '';
    }
    if (suppressSignedUrlFetch) {
      if (
        !cachedNoteBodyFromPut.isFetched &&
        cachedNoteBodyFromPut.data === undefined
      ) {
        return undefined;
      }
      return cachedNoteBodyFromPut.data ?? '';
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
    suppressSignedUrlFetch,
    cachedNoteBodyFromPut.isFetched,
    cachedNoteBodyFromPut.data,
    bodySignedUrlQuery.isSuccess,
    bodySignedUrlQuery.data,
    noteBodyQuery.isSuccess,
    noteBodyQuery.data,
  ]);

  useEffect(() => {
    const idForSession = noteId;
    return () => {
      clearAutosaveDebounce();
      clearSavedHeaderTimer();
      if (idForSession && draftBodyRef.current !== baselineBodyRef.current) {
        void runSaveRef.current(idForSession);
      }
    };
  }, [noteId, clearAutosaveDebounce, clearSavedHeaderTimer]);

  useEffect(() => {
    setBodyReady(false);
    setDraftBody('');
    baselineBodyRef.current = '';
    clearAutosaveDebounce();
    clearSavedHeaderTimer();
    safeSetSavePhase('idle');
  }, [noteId, clearAutosaveDebounce, clearSavedHeaderTimer, safeSetSavePhase]);

  useEffect(() => {
    if (resolvedServerBody === undefined) {
      return;
    }
    const incoming = resolvedServerBody;
    const currentDraft = draftBodyRef.current;
    const serverContentChangedVsLocal = incoming !== currentDraft;

    setDraftBody(incoming);
    baselineBodyRef.current = incoming;
    setBodyReady(true);

    // Post-save TanStack cache sync often refreshes body text with the same bytes; do not
    // reset save phase or cancel the “Saved” header timer in that case (Story 55 Phase 3).
    if (serverContentChangedVsLocal) {
      clearAutosaveDebounce();
      clearSavedHeaderTimer();
      safeSetSavePhase('idle');
      queueMicrotask(() => {
        richBodyEditorRef.current?.setMarkdown(incoming);
      });
    }
  }, [
    resolvedServerBody,
    noteId,
    clearAutosaveDebounce,
    clearSavedHeaderTimer,
    safeSetSavePhase,
  ]);

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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const clearBeforeUnloadStayFlushTimer = () => {
      if (beforeUnloadStayFlushTimerRef.current) {
        clearTimeout(beforeUnloadStayFlushTimerRef.current);
        beforeUnloadStayFlushTimerRef.current = null;
      }
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        !noteEditorShouldWarnBeforeUnload({
          draftBody: draftBodyRef.current,
          baselineBody: baselineBodyRef.current,
          debounceScheduled: autosaveDebounceRef.current !== null,
          saveInFlight: saveInFlightRef.current,
        })
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';

      // If the user dismisses the native dialog and stays on the page, flush immediately.
      clearBeforeUnloadStayFlushTimer();
      beforeUnloadStayFlushTimerRef.current = setTimeout(() => {
        beforeUnloadStayFlushTimerRef.current = null;
        void flushSaveForNavigationRef.current();
      }, 0);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearBeforeUnloadStayFlushTimer();
    };
  }, []);

  useEffect(() => {
    if (navigationBlocker.state !== 'blocked') {
      return;
    }
    if (navigationFlushInProgressRef.current) {
      return;
    }

    navigationFlushInProgressRef.current = true;

    void (async () => {
      try {
        const saved = await flushSaveForNavigationRef.current();
        const blocker = navigationBlockerRef.current;
        if (blocker.state !== 'blocked') {
          return;
        }
        if (saved) {
          blocker.proceed();
        } else {
          blocker.reset();
        }
      } finally {
        navigationFlushInProgressRef.current = false;
      }
    })();
  }, [navigationBlocker.state]);

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

  const handleDraftBodyUpdate = useCallback(
    (value: string, options?: NoteBodyMarkdownChangeOptions) => {
      if (options?.fromInitialNormalize) {
        if (value !== baselineBodyRef.current) {
          return;
        }
        setDraftBody(value);
        baselineBodyRef.current = value;
        clearAutosaveDebounce();
        clearSavedHeaderTimer();
        safeSetSavePhase('idle');
        return;
      }

      setDraftBody(value);
      clearSavedHeaderTimer();

      if (value === baselineBodyRef.current) {
        clearAutosaveDebounce();
        safeSetSavePhase('idle');
        return;
      }

      safeSetSavePhase('pending');
      scheduleDebouncedAutosave();
    },
    [
      clearAutosaveDebounce,
      clearSavedHeaderTimer,
      safeSetSavePhase,
      scheduleDebouncedAutosave,
    ]
  );

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
    !bodyReady ||
    (waitForBodySignedUrlQuery && bodySignedUrlQuery.isPending) ||
    (Boolean(signedUrl) && noteBodyQuery.isPending);

  const bodyLoadError =
    (waitForBodySignedUrlQuery && bodySignedUrlQuery.isError) ||
    (Boolean(signedUrl) && noteBodyQuery.isError);

  const bodyLoadErrorDetail =
    (waitForBodySignedUrlQuery ? bodySignedUrlQuery.error : null) ??
    (signedUrl ? noteBodyQuery.error : null);

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
            <NoteImageUploadContext.Provider
              value={noteImageUploadContextValue}
            >
              <NoteBodyEditor
                key={noteId}
                richEditorRef={richBodyEditorRef}
                value={draftBody}
                onChange={handleDraftBodyUpdate}
                placeholder='Start writing your note…'
                disabled={!currentUser || bodyLoadPending}
                aria-label='Note body'
                imageUploadHandler={imageUploadHandler}
                imagePreviewHandler={imagePreviewHandler}
              />
            </NoteImageUploadContext.Provider>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default NoteEditorPage;
