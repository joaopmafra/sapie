/// <reference types="vite/client" />

// https://vite.dev/guide/env-and-mode#intellisense-for-typescript

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Set to `plain` to use the textarea note body editor (tests default; dev troubleshooting). */
  readonly VITE_NOTE_EDITOR?: 'plain' | 'rich';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
