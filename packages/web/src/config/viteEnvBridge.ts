type SapieViteEnvGlobal = typeof globalThis & {
  __SAPIE_VITE_NOTE_EDITOR__?: string;
  __SAPIE_VITE_NOTE_EDITOR_DEBUG__?: string;
  __SAPIE_VITE_DEV__?: boolean;
  __SAPIE_VITE_API_BASE_URL__?: string;
};

/**
 * Copies selected Vite `import.meta.env` fields into `globalThis` so modules that must
 * not use `import.meta` (Jest-transpiled tests pull those in) can read them at runtime.
 */
export function bridgeViteEnvToGlobal(
  env:
    | {
        VITE_NOTE_EDITOR?: string;
        VITE_NOTE_EDITOR_DEBUG?: string;
        DEV?: boolean;
        VITE_API_BASE_URL?: string;
      }
    | undefined
): void {
  const g = globalThis as SapieViteEnvGlobal;

  const viteNoteEditor = env?.VITE_NOTE_EDITOR;
  if (viteNoteEditor === 'plain' || viteNoteEditor === 'rich') {
    g.__SAPIE_VITE_NOTE_EDITOR__ = viteNoteEditor;
  } else {
    delete g.__SAPIE_VITE_NOTE_EDITOR__;
  }

  const noteEditorDebug = env?.VITE_NOTE_EDITOR_DEBUG;
  if (typeof noteEditorDebug === 'string') {
    g.__SAPIE_VITE_NOTE_EDITOR_DEBUG__ = noteEditorDebug;
  } else {
    delete g.__SAPIE_VITE_NOTE_EDITOR_DEBUG__;
  }

  if (env?.DEV === true) {
    g.__SAPIE_VITE_DEV__ = true;
  } else {
    delete g.__SAPIE_VITE_DEV__;
  }

  const apiBaseUrl = env?.VITE_API_BASE_URL;
  if (typeof apiBaseUrl === 'string') {
    g.__SAPIE_VITE_API_BASE_URL__ = apiBaseUrl;
  } else {
    delete g.__SAPIE_VITE_API_BASE_URL__;
  }
}
