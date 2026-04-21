type SapieNoteEditorGlobal = typeof globalThis & {
  __SAPie_VITE_NOTE_EDITOR__?: string;
};

/**
 * Copies `VITE_NOTE_EDITOR` from Vite into `globalThis` so modules that must not use
 * `import.meta` (Jest-transpiled tests pull those in) can still read the flag at runtime.
 */
export function installViteNoteEditorEnvShim(
  env: { VITE_NOTE_EDITOR?: string } | undefined
): void {
  const g = globalThis as SapieNoteEditorGlobal;
  const v = env?.VITE_NOTE_EDITOR;
  if (v === 'plain' || v === 'rich') {
    g.__SAPie_VITE_NOTE_EDITOR__ = v;
  } else {
    delete g.__SAPie_VITE_NOTE_EDITOR__;
  }
}
