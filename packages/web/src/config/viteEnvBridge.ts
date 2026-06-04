type SapieViteEnvGlobal = typeof globalThis & {
  __SAPIE_VITE_NOTE_EDITOR__?: string;
  __SAPIE_VITE_DEV__?: boolean;
};

/**
 * Copies selected Vite `import.meta.env` fields into `globalThis` so modules that must
 * not use `import.meta` (Jest-transpiled tests pull those in) can read them at runtime.
 */
export function bridgeViteEnvToGlobal(
  env: { VITE_NOTE_EDITOR?: string; DEV?: boolean } | undefined
): void {
  const g = globalThis as SapieViteEnvGlobal;

  const viteNoteEditor = env?.VITE_NOTE_EDITOR;
  if (viteNoteEditor === 'plain' || viteNoteEditor === 'rich') {
    g.__SAPIE_VITE_NOTE_EDITOR__ = viteNoteEditor;
  } else {
    delete g.__SAPIE_VITE_NOTE_EDITOR__;
  }

  if (env?.DEV === true) {
    g.__SAPIE_VITE_DEV__ = true;
  } else {
    delete g.__SAPIE_VITE_DEV__;
  }
}
