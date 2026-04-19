/** Debounce after last body edit before auto-save (Story 55 Phase 3). */
export const NOTE_BODY_AUTOSAVE_DEBOUNCE_MS = 5000;

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
