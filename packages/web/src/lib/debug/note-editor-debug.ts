type NoteEditorDebugPayload = Record<string, unknown>;

type SapieNoteEditorDebugGlobal = typeof globalThis & {
  __SAPIE_VITE_DEV__?: boolean;
  __SAPIE_VITE_NOTE_EDITOR_DEBUG__?: string;
  __SAPIE_NOTE_EDITOR_DEBUG__?: {
    events: Array<{ t: number; event: string; data?: NoteEditorDebugPayload }>;
  };
};

function noteEditorDebugEnabled(): boolean {
  const g = globalThis as SapieNoteEditorDebugGlobal;
  if (g.__SAPIE_VITE_DEV__ !== true) {
    return false;
  }
  const flag = g.__SAPIE_VITE_NOTE_EDITOR_DEBUG__;
  return flag !== '0' && flag !== 'false';
}

/** Structured dev-only logging for note editor load/save diagnostics. */
export function noteEditorDebug(
  event: string,
  data?: NoteEditorDebugPayload
): void {
  if (!noteEditorDebugEnabled()) {
    return;
  }

  const entry = { t: Date.now(), event, data };
  const g = globalThis as SapieNoteEditorDebugGlobal;
  const ring = g.__SAPIE_NOTE_EDITOR_DEBUG__ ?? { events: [] };
  ring.events = [...ring.events.slice(-199), entry];
  g.__SAPIE_NOTE_EDITOR_DEBUG__ = ring;

  if (data != null) {
    console.info('[note-editor]', event, data);
  } else {
    console.info('[note-editor]', event);
  }
}

/** Last N debug events (dev tools / Playwright `page.evaluate`). */
export function readNoteEditorDebugEvents(): Array<{
  t: number;
  event: string;
  data?: NoteEditorDebugPayload;
}> {
  return (
    (globalThis as SapieNoteEditorDebugGlobal).__SAPIE_NOTE_EDITOR_DEBUG__
      ?.events ?? []
  );
}
