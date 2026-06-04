const NOTE_BODY_AUTOSAVE_DEBOUNCE_MS_DEV = 2000;
const NOTE_BODY_AUTOSAVE_DEBOUNCE_MS_PROD = 5000;

function resolveNoteBodyAutosaveDebounceMs(): number {
  if (
    typeof process !== 'undefined' &&
    process.env.JEST_WORKER_ID !== undefined
  ) {
    return NOTE_BODY_AUTOSAVE_DEBOUNCE_MS_PROD;
  }

  const isDev = (globalThis as { __SAPIE_VITE_DEV__?: boolean })
    .__SAPIE_VITE_DEV__;
  return isDev
    ? NOTE_BODY_AUTOSAVE_DEBOUNCE_MS_DEV
    : NOTE_BODY_AUTOSAVE_DEBOUNCE_MS_PROD;
}

/** Debounce after last body edit before auto-save (Story 55 Phase 3). */
export const NOTE_BODY_AUTOSAVE_DEBOUNCE_MS = resolveNoteBodyAutosaveDebounceMs();

/** How long the header shows “Saved” before returning to idle. */
export const NOTE_BODY_SAVED_HEADER_MS = 3000;

export type NoteEditorSavePhase =
  | 'idle'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'error';

/**
 * Accessible header text for the note body save phase. `idle` means no indicator.
 */
export function noteEditorSaveHeaderText(
  phase: NoteEditorSavePhase
): string | null {
  switch (phase) {
    case 'idle':
      return null;
    case 'pending':
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Error saving';
  }
}
