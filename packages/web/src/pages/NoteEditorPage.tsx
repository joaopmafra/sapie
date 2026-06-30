import type { MDXEditorMethods } from '@mdxeditor/editor';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { ClientErrorAlert } from '../components/ClientErrorAlert';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import { useAuth } from '../contexts/AuthContext';
import { useAppSnackbar } from '../hooks/useAppSnackbar';
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  useParams,
  useNavigate,
  useBlocker,
  type BlockerFunction,
} from 'react-router-dom';
import {
  ContentType,
  noteBodyVersionKey,
  noteBodyExpectedRevision,
  contentQueryKeys,
  useBodySignedUrlFetchSuppressedAfterSave,
  useContentBody,
  useContentItem,
  useCreateNote,
  useDeleteContent,
  useFolderChildren,
  useNoteBody,
  useRenameContent,
  useSaveNoteBody,
} from '../lib/content';
import { noteEditorDebug } from '../lib/debug/note-editor-debug';
import { getErrorMessageOr } from '../lib/error-messages-utils';
import { PROBLEM_DETAILS_POINTERS } from '../lib/problemDetailsPointers.ts';

import type { NoteBodyMarkdownChangeOptions } from './note-body-editor/note-body-editor-props';
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
  const { showError } = useAppSnackbar();
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
  const noteBodyQuery = useNoteBody(
    noteId,
    suppressSignedUrlFetch ? null : signedUrl,
    bodyVersionKey
  );
  const cachedNoteBodyFromPut = useQuery({
    queryKey:
      noteId != null && bodyVersionKey != null
        ? contentQueryKeys.noteBodyText(noteId, bodyVersionKey)
        : (['content', 'note-body-text', '__disabled__'] as const),
    queryFn: async (): Promise<string | undefined> => {
      if (noteId == null || bodyVersionKey == null) {
        return undefined;
      }
      return queryClient.getQueryData<string>(
        contentQueryKeys.noteBodyText(noteId, bodyVersionKey)
      );
    },
    enabled:
      Boolean(noteId) &&
      bodyVersionKey != null &&
      fetchBodySignedUrl &&
      suppressSignedUrlFetch,
    staleTime: Infinity,
  });
  const deleteContent = useDeleteContent();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const saveNoteBody = useSaveNoteBody();
  const renameContent = useRenameContent();

  // ── Decks (Attachments section) ────────────────────────────────
  const { data: noteChildren = [] } = useFolderChildren(noteId);
  const decks = noteChildren.filter(c => c.type === ContentType.DECK);
  const createNote = useCreateNote();
  const [createDeckOpen, setCreateDeckOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [deckRenameId, setDeckRenameId] = useState<string | null>(null);
  const [deckRenameName, setDeckRenameName] = useState('');
  const [deckDeleteTarget, setDeckDeleteTarget] = useState<{
    id: string;
    name: string;
    parentId: string | null;
  } | null>(null);

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
  const expectedRevisionRef = useRef('');
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
            const saved = await saveMutateAsyncRef.current({
              id,
              bodyText: sent,
              expectedRevision: expectedRevisionRef.current,
              editorSessionId: editorSessionIdRef.current,
            });
            expectedRevisionRef.current =
              saved.body?.updatedAt?.toISOString() ?? '';
          } catch (saveError) {
            if (isAxiosError(saveError) && saveError.response?.status === 409) {
              showError(
                'Save failed — note was changed elsewhere. Reload and try again.'
              );
            }
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
    [clearSavedHeaderTimer, currentUser, noteId, safeSetSavePhase, showError]
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

  const handleImageUploadError = useCallback(
    (uploadError: unknown) => {
      showError(
        getErrorMessageOr(uploadError, 'Could not upload image. Try again.')
      );
    },
    [showError]
  );

  const { imageUploadHandler, imagePreviewHandler, uploadImageAttachment } =
    useNoteImageHandlers(
      currentUser,
      noteId,
      flushSaveAfterImageInsert,
      handleImageUploadError
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
    const suppressWithCachedBody =
      suppressSignedUrlFetch &&
      cachedNoteBodyFromPut.isFetched &&
      cachedNoteBodyFromPut.data !== undefined;
    if (suppressWithCachedBody) {
      return cachedNoteBodyFromPut.data;
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
    if (!noteId) {
      return;
    }
    noteEditorDebug('mount', { noteId, editorSessionId });
    void queryClient.invalidateQueries({
      queryKey: contentQueryKeys.bodySignedUrl(noteId),
    });
    void queryClient.invalidateQueries({
      predicate: query =>
        query.queryKey[0] === 'content' &&
        query.queryKey[1] === 'note-body-text' &&
        query.queryKey[2] === noteId,
    });
    return () => {
      noteEditorDebug('unmount', { noteId, editorSessionId });
    };
  }, [noteId, editorSessionId, queryClient]);

  useEffect(() => {
    noteEditorDebug('load-state', {
      noteId,
      editorSessionId,
      suppressSignedUrlFetch,
      bodyReady,
      bodyVersionKey,
      storedBodySize: note?.body?.size ?? null,
      resolvedServerBody:
        resolvedServerBody === undefined
          ? undefined
          : {
              length: resolvedServerBody.length,
              preview: resolvedServerBody.slice(0, 80),
            },
      signedUrlPending: bodySignedUrlQuery.isPending,
      signedUrlSuccess: bodySignedUrlQuery.isSuccess,
      noteBodyPending: noteBodyQuery.isPending,
      noteBodySuccess: noteBodyQuery.isSuccess,
      cachedBodyFromPut:
        cachedNoteBodyFromPut.data === undefined
          ? undefined
          : {
              length: cachedNoteBodyFromPut.data.length,
              preview: cachedNoteBodyFromPut.data.slice(0, 80),
            },
      saveInFlight: saveInFlightRef.current,
    });
  }, [
    noteId,
    editorSessionId,
    suppressSignedUrlFetch,
    bodyReady,
    bodyVersionKey,
    note?.body?.size,
    resolvedServerBody,
    bodySignedUrlQuery.isPending,
    bodySignedUrlQuery.isSuccess,
    noteBodyQuery.isPending,
    noteBodyQuery.isSuccess,
    cachedNoteBodyFromPut.data,
  ]);

  useEffect(() => {
    const idForSession = noteId;
    return () => {
      clearAutosaveDebounce();
      clearSavedHeaderTimer();
      if (!idForSession) {
        return;
      }
      const draft = draftBodyRef.current;
      const base = baselineBodyRef.current;
      if (draft === base) {
        return;
      }
      // Refs can lag setState by one render; never overwrite stored content with "".
      if (draft === '' && base.length > 0) {
        noteEditorDebug('unmount-flush-skipped', {
          reason: 'empty-draft-nonempty-baseline',
          noteId: idForSession,
          baselineLength: base.length,
        });
        return;
      }
      void runSaveRef.current(idForSession);
    };
  }, [noteId, clearAutosaveDebounce, clearSavedHeaderTimer]);

  useEffect(() => {
    setBodyReady(false);
    setDraftBody('');
    baselineBodyRef.current = '';
    expectedRevisionRef.current = '';
    clearAutosaveDebounce();
    clearSavedHeaderTimer();
    safeSetSavePhase('idle');
  }, [noteId, clearAutosaveDebounce, clearSavedHeaderTimer, safeSetSavePhase]);

  useEffect(() => {
    if (resolvedServerBody === undefined) {
      return;
    }
    // After a successful save this session, the editor is source of truth — do not re-apply
    // server/cache body (a version-key cache miss would otherwise wipe the draft as "").
    if (suppressSignedUrlFetch && bodyReady) {
      noteEditorDebug('apply-server-body-skipped', {
        reason: 'suppress-after-save',
        noteId,
      });
      return;
    }
    if (saveInFlightRef.current) {
      noteEditorDebug('apply-server-body-skipped', {
        reason: 'save-in-flight',
        noteId,
      });
      return;
    }

    const incoming = resolvedServerBody;
    const currentDraft = draftBodyRef.current;
    const storedBodySize = note?.body?.size ?? 0;
    if (incoming === '' && storedBodySize > 0 && currentDraft.length > 0) {
      noteEditorDebug('apply-server-body-skipped', {
        reason: 'empty-incoming-with-nonempty-draft-and-metadata',
        noteId,
        storedBodySize,
        draftLength: currentDraft.length,
      });
      return;
    }
    const serverContentChangedVsLocal = incoming !== currentDraft;
    const isInitialLoad = !bodyReady;

    if (note) {
      expectedRevisionRef.current = noteBodyExpectedRevision(note);
    }

    noteEditorDebug('apply-server-body', {
      noteId,
      isInitialLoad,
      serverContentChangedVsLocal,
      incomingLength: incoming.length,
      draftLength: currentDraft.length,
      storedBodySize,
    });

    // Keep refs in sync before setState — StrictMode can unmount before the next render,
    // and unmount flush compares draftBodyRef to baselineBodyRef.
    draftBodyRef.current = incoming;
    baselineBodyRef.current = incoming;
    setDraftBody(incoming);
    setBodyReady(true);

    // Post-save TanStack cache sync often refreshes body text with the same bytes; do not
    // reset save phase or cancel the “Saved” header timer in that case (Story 55 Phase 3).
    if (serverContentChangedVsLocal || isInitialLoad) {
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
    note,
    suppressSignedUrlFetch,
    bodyReady,
    clearAutosaveDebounce,
    clearSavedHeaderTimer,
    safeSetSavePhase,
  ]);

  useEffect(() => {
    if (!note || !suppressSignedUrlFetch || !bodyReady) {
      return;
    }
    expectedRevisionRef.current = noteBodyExpectedRevision(note);
  }, [
    note?.body?.updatedAt?.toISOString(),
    noteId,
    suppressSignedUrlFetch,
    bodyReady,
    note,
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
        draftBodyRef.current = value;
        setDraftBody(value);
        baselineBodyRef.current = value;
        clearAutosaveDebounce();
        clearSavedHeaderTimer();
        safeSetSavePhase('idle');
        return;
      }

      draftBodyRef.current = value;
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
    (!suppressSignedUrlFetch && Boolean(signedUrl) && noteBodyQuery.isPending);

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
            <Button
              type='button'
              size='small'
              color='error'
              variant='outlined'
              onClick={() => setDeleteDialogOpen(true)}
              disabled={!currentUser || !note}
            >
              Delete
            </Button>
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
              uploadImageAttachment={uploadImageAttachment}
              onImageInserted={flushSaveAfterImageInsert}
              onUploadError={handleImageUploadError}
            />
          )}
        </Box>

        {/* ── Attachments (Decks) ─────────────────────────────── */}
        <Divider sx={{ my: 3 }} />
        <Typography variant='h6' sx={{ mb: 1 }}>
          Attachments
        </Typography>
        {decks.length === 0 ? (
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            No decks yet. Create a flashcard deck to study this note's content.
          </Typography>
        ) : (
          <List dense disablePadding>
            {decks.map(deck => (
              <ListItem
                key={deck.id}
                disableGutters
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size='small'
                      aria-label={`Rename deck ${deck.name}`}
                      onClick={() => {
                        setDeckRenameId(deck.id);
                        setDeckRenameName(deck.name);
                      }}
                    >
                      <EditIcon fontSize='small' />
                    </IconButton>
                    <IconButton
                      size='small'
                      aria-label={`Delete deck ${deck.name}`}
                      onClick={() =>
                        setDeckDeleteTarget({
                          id: deck.id,
                          name: deck.name,
                          parentId: deck.parentId,
                        })
                      }
                    >
                      <DeleteIcon fontSize='small' />
                    </IconButton>
                  </Box>
                }
              >
                {deckRenameId === deck.id ? (
                  <TextField
                    size='small'
                    value={deckRenameName}
                    onChange={e => setDeckRenameName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        renameContent.mutate({
                          id: deck.id,
                          name: deckRenameName,
                          parentId: deck.parentId,
                        });
                        setDeckRenameId(null);
                      } else if (e.key === 'Escape') {
                        setDeckRenameId(null);
                      }
                    }}
                    onBlur={() => {
                      if (
                        deckRenameName.trim() &&
                        deckRenameName !== deck.name
                      ) {
                        renameContent.mutate({
                          id: deck.id,
                          name: deckRenameName.trim(),
                          parentId: deck.parentId,
                        });
                      }
                      setDeckRenameId(null);
                    }}
                    autoFocus
                    sx={{ flexGrow: 1 }}
                  />
                ) : (
                  <ListItemText
                    primary={deck.name}
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: {
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                      },
                    }}
                    onClick={() => navigate(`/decks/${deck.id}`)}
                  />
                )}
              </ListItem>
            ))}
          </List>
        )}
        <Button
          variant='outlined'
          size='small'
          onClick={() => {
            setNewDeckName('');
            setCreateDeckOpen(true);
          }}
          sx={{ mt: 1 }}
        >
          Create Deck
        </Button>
      </Paper>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        message={`Are you sure you want to delete "${note?.name ?? 'this note'}"? This action cannot be undone.`}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          if (!note) return;
          deleteContent.mutate(
            { id: note.id, parentId: note.parentId },
            {
              onSuccess: () => {
                setDeleteDialogOpen(false);
                navigate('/');
              },
              onError: err => {
                showError(getErrorMessageOr(err, 'Failed to delete note'));
                setDeleteDialogOpen(false);
              },
            }
          );
        }}
        loading={deleteContent.isPending}
      />

      {/* ── Create Deck Dialog ────────────────────────────────── */}
      <Dialog open={createDeckOpen} onClose={() => setCreateDeckOpen(false)}>
        <DialogTitle>Create Deck</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin='dense'
            label='Deck Name'
            fullWidth
            value={newDeckName}
            onChange={e => setNewDeckName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newDeckName.trim()) {
                if (!note) return;
                createNote.mutate(
                  { name: newDeckName.trim(), parentId: note.id, type: 'deck' },
                  {
                    onSuccess: () => {
                      setCreateDeckOpen(false);
                      setNewDeckName('');
                    },
                  }
                );
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDeckOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!note || !newDeckName.trim()) return;
              createNote.mutate(
                { name: newDeckName.trim(), parentId: note.id, type: 'deck' },
                {
                  onSuccess: () => {
                    setCreateDeckOpen(false);
                    setNewDeckName('');
                  },
                }
              );
            }}
            disabled={!newDeckName.trim() || createNote.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Deck Confirmation ──────────────────────────── */}
      <ConfirmDeleteDialog
        open={deckDeleteTarget !== null}
        message={`Are you sure you want to delete the deck "${deckDeleteTarget?.name ?? ''}"? All cards in this deck will be lost.`}
        onCancel={() => setDeckDeleteTarget(null)}
        onConfirm={() => {
          if (!deckDeleteTarget) return;
          deleteContent.mutate(
            {
              id: deckDeleteTarget.id,
              parentId: deckDeleteTarget.parentId,
              cascade: true,
            },
            {
              onSuccess: () => setDeckDeleteTarget(null),
              onError: err => {
                showError(getErrorMessageOr(err, 'Failed to delete deck'));
                setDeckDeleteTarget(null);
              },
            }
          );
        }}
        loading={deleteContent.isPending}
      />
    </Box>
  );
};

export default NoteEditorPage;
