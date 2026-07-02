# @sapie/web — Agent Instructions

React SPA with Material-UI, TanStack Query, and MDXEditor.
See root [AGENTS.md](../../AGENTS.md) for project-wide context and MVP priorities.

## Architecture

- **Pages** in `src/pages/` — route-level components (NoteEditorPage, FolderPage,
  StudySessionPage, etc.).
- **Components** in `src/components/` — reusable UI pieces (ContentExplorer, NavigationDrawer,
  modals, auth).
- **lib/** — data layer:
  - `api-client/` — generated OpenAPI client (regenerate after API changes:
    `pnpm generate:api-client`)
  - `content/`, `cards/`, `study/` — TanStack Query hooks and mutations
  - `firebase/` — Firebase Auth client setup
  - `queryClient.ts` — shared QueryClient config
- **Contexts** in `src/contexts/` — AuthContext, ContentContext.
- **Hooks** in `src/hooks/` — cross-cutting logic (routing, snackbar, content ancestors).

## Note editor

- **MDXEditor** (`@mdxeditor/editor`) for rich markdown editing.
- **Auto-save**: debounced saves via TanStack Query mutations. `expectedRevision` header
  prevents overwrite conflicts.
- **Inline images**: upload via `POST /api/content/:contentId/blobs`, embed as
  `![alt](/api/content/{contentId}/blobs/{blobId})`.
- The editor variant is configured in `src/config/noteBodyEditorVariant.ts`.

## Data fetching (TanStack Query)

- Query keys follow `[domain, ...params]` convention (e.g. `['content', contentId]`).
- Mutations invalidate related queries on success.
- `staleTime` and `gcTime` are configured in `queryClient.ts`.
- Direct navigation (URL → content) must work without stale sidebar tree data — TanStack Query
  cache is the source of truth.

## Firebase Auth

- Client-side Firebase Auth via `src/lib/firebase/`.
- `AuthContext.tsx` provides the current user and auth state.
- Protected routes redirect unauthenticated users.
- **FirebaseUI login** is two-step in browser tests: email → Next → password → Sign In.

## Testing

- **Jest + Testing Library**. Specs co-located with source or in `__tests__/`.
- **MDXEditor** requires real keyboard events in tests — use `tab.type` (OMP browser) or
  `fireEvent` / `userEvent` (Jest).
- **QueryClient** in tests should use `retry: false` and short `staleTime: 0`.

## Key conventions

- Material-UI v5 (`@mui/material`). Use the `sx` prop for one-off styles, `styled()` for
  reusable.
- Environment-specific config via `src/config/viteEnvBridge.ts` — never hardcode API URLs.
- Snackbar notifications via `useAppSnackbar` hook, not raw MUI snackbar.
