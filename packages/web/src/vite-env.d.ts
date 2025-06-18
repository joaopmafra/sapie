/// <reference types="vite/client" />

// https://vite.dev/guide/env-and-mode#intellisense-for-typescript

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
