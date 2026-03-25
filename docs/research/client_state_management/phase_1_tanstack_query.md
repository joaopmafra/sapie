# Client State Management — Phase 1: TanStack Query

## Table of Contents

- [Context & Decision](#context--decision)
- [Architecture Overview](#architecture-overview)
- [Query Key Design](#query-key-design)
- [ContentContext After Refactor](#contentcontext-after-refactor)
- [Implementation Plan](#implementation-plan)
- [File-by-File Changes](#file-by-file-changes)
- [Configuration Reference](#configuration-reference)

---

## Context & Decision

### The Problem

The current content state management has three concrete failures that will worsen as features are added:

**1. Direct navigation is broken.** `NoteEditorPage` reads note data exclusively from `nodeMap` in `ContentContext`.
If the user opens `/notes/:id` directly (browser refresh, bookmark, shared link), `nodeMap` is empty and the page
shows "Note not found." There is no mechanism for a page to independently fetch the data it needs.

**2. Any mutation causes a full tree re-fetch.** `triggerRefresh()` increments a counter that forces `ContentExplorer`
to re-fetch from the root directory and rebuild the entire tree. This will become visible flicker in the sidebar once
the note content editor is built with auto-save — every save will thrash the tree.

**3. State is split across two representations that must be manually synchronized.** `tree` (nested, owned by
`ContentExplorer` local state) and `nodeMap` (flat map, owned by `ContentContext`) represent the same data in two
different shapes. `addNoteToMap()` and `triggerRefresh()` are both called on note creation, but they fight each other:
`addNoteToMap` updates the flat map without updating the tree, then `triggerRefresh` discards the optimistic update via
a full re-fetch.

### What Was Considered

**Virtual File System (VFS):** A local-first architecture was considered — client-side cache in IndexedDB,
write-locally-first with background sync, and a persistent search index. This would solve all of the above and also
enable client-side full-text search and true offline support. However, the write-sync path (conflict resolution,
retry strategy, pending-sync UX) adds months of complexity, and offline mode was already explicitly deferred.
See [Phase 2](./phase_2_flexsearch_search.md) for the search component of this proposal.

**Zustand:** Evaluated as a replacement for `ContentContext`. Zustand would tidy up the raw `setNodeMap` dispatch
and make actions more explicit, but it does not address the core problem — it is a UI state library, not a server
state library. It would still require manual cache invalidation, still break direct navigation, and still require a
`triggerRefresh` equivalent.

**SWR:** A viable alternative to TanStack Query with a smaller bundle. TanStack Query is preferred here because its
`queryClient.invalidateQueries()` API gives precise, key-based cache invalidation (only re-fetch the affected folder,
not the whole tree), and its `useMutation` hook handles optimistic updates and rollback in a first-class way.

### The Decision

**Separate server state from UI state using TanStack Query.**

- **Server state** (content from the API) → TanStack Query (`useQuery`, `useMutation`)
- **UI state** (selected node, expanded nodes) → `ContentContext` (kept, but reduced to two fields)

This directly fixes all three failures:

- Direct navigation: any component can call `useQuery(['content', 'item', noteId])` — it hits the cache if the node
  was already loaded through the tree, and fetches from the API otherwise.
- Targeted invalidation: `useCreateNote` invalidates only `['content', 'children', parentId]`, re-fetching just that
  folder's children rather than the whole tree.
- Single representation: TanStack Query owns all server data. `tree` and `nodeMap` as separate local state structures
  are eliminated. `ContentExplorer` derives its rendering data directly from query results.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   React Component Tree               │
│                                                      │
│  ContentExplorer     NoteEditorPage    SearchBar     │
│       │                   │               │          │
│       ▼                   ▼               ▼          │
│  useRootDirectory   useContentItem    (Phase 2)      │
│  useFolderChildren       │                           │
│       │                  │                           │
│       └──────────────────┘                           │
│                    │                                 │
│             TanStack Query Cache                     │
│        (keyed by resource + params)                  │
│                    │                                 │
│             ContentService                           │
│                    │                                 │
│               Backend API                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   ContentContext (UI only)            │
│                                                      │
│   selectedNodeId      expandedNodeIds                │
│   setSelectedNodeId   setExpandedNodeIds             │
└─────────────────────────────────────────────────────┘
```

The TanStack Query cache and `ContentContext` are completely independent. Components read server data from query hooks
and UI state from `ContentContext`. Neither knows about the other.

---

## Query Key Design

Query keys determine cache identity and invalidation scope. A consistent key structure is essential.

```typescript
// packages/web/src/lib/content/query-keys.ts

export const contentQueryKeys = {
  // Root directory for the current user
  root: () => ['content', 'root'] as const,

  // All children queries (used for broad invalidation after moves/deletes)
  allChildren: () => ['content', 'children'] as const,

  // Children of a specific folder
  children: (parentId: string) => ['content', 'children', parentId] as const,

  // A single content item by ID (note or folder)
  item: (id: string) => ['content', 'item', id] as const,
} as const;
```

**Invalidation rules:**

| Event | Keys to invalidate |
|---|---|
| Create note in folder X | `contentQueryKeys.children(X)` |
| Rename content item Y | `contentQueryKeys.item(Y)` |
| Delete content item Y (in folder X) | `contentQueryKeys.children(X)`, `contentQueryKeys.item(Y)` |
| Move content item Y to folder Z | `contentQueryKeys.children(oldParentId)`, `contentQueryKeys.children(Z)` |

---

## ContentContext After Refactor

`ContentContext` is reduced to pure UI state. All server data fields are removed.

```typescript
// packages/web/src/contexts/ContentContext.tsx

interface ContentContextType {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  expandedNodeIds: string[];
  setExpandedNodeIds: (ids: string[]) => void;
}
```

**Removed from context:**

- `nodeMap` and `setNodeMap` — server data, now owned by TanStack Query cache
- `refreshTrigger` and `triggerRefresh` — replaced by `queryClient.invalidateQueries()`
- `addNoteToMap` — replaced by mutation's `onSuccess` invalidation
- `getParentPath` — now a utility function derived from query data
- `EnrichedTreeNode` type — tree shape is now derived inside `ContentExplorer` from query results

---

## Implementation Plan

### Step 1: Install Dependencies

```bash
cd packages/web
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

### Step 2: Set Up QueryClientProvider

Wrap the app in `QueryClientProvider`. Add devtools in development only.

**File:** `packages/web/src/App.tsx`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes — content doesn't change frequently
      gcTime: 10 * 60 * 1000,     // 10 minutes — keep cache longer than stale time
      retry: 2,
      refetchOnWindowFocus: false, // avoid re-fetching on tab switch during editing
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* existing providers */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

> The `QueryClientProvider` should be the outermost provider, wrapping `AuthProvider` and `Router`.

### Step 3: Add `getContentById` to ContentService

`NoteEditorPage` needs to fetch a single content item by ID. This method does not currently exist in the
frontend service, and **the backend endpoint does not exist either** — `GET /api/content/:id` is not yet
implemented in `ContentController`. Adding this endpoint is the first backend task of
[Story 55](../../pm/3-stories/2-to-refine/55-story-note_content_editor.md), which lists it as a prerequisite
for the TanStack Query refactor. Confirm the endpoint exists before implementing this step.

**Important scope note:** `getContentById` returns **content metadata only** (name, type, parentId, etc.). It
does not return the note body text. Note body content is stored in Cloud Storage and accessed via a separate
signed URL flow implemented in Story 55:

- `GET /api/content/:id` → metadata (this step)
- `GET /api/content/:id/body` → signed URL pointing to Cloud Storage (Story 55)
- Client fetches markdown directly from Cloud Storage using the signed URL (Story 55)

This TanStack Query refactor only concerns itself with the metadata query (`useContentItem`). The content body
queries (`useContentBody`, `useNoteBody`) are defined in Story 55 and build on top of the foundation laid here.

**File:** `packages/web/src/lib/content/content-service.ts`

```typescript
async getContentById(currentUser: User, id: string): Promise<Content> {
  const config = await createAuthenticatedApiConfiguration(this.basePath, currentUser);
  const response = await this.contentApi.contentControllerGetContentById(
    { id },
    config.baseOptions
  );
  return this.mapContentDtoToContent(response.data);
}
```

### Step 4: Create Content Query Hooks

Centralize all query and mutation hooks in one file. Components import hooks, not the service directly.

**New file:** `packages/web/src/lib/content/content-hooks.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { contentService } from './content-service';
import { contentQueryKeys } from './query-keys';
import type { Content } from './types';

// ─── Queries ────────────────────────────────────────────────────────────────

export function useRootDirectory() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: contentQueryKeys.root(),
    queryFn: () => contentService.getRootDirectory(currentUser!),
    enabled: !!currentUser,
  });
}

export function useFolderChildren(parentId: string | undefined) {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: contentQueryKeys.children(parentId!),
    queryFn: () => contentService.getContentByParentId(currentUser!, parentId!),
    enabled: !!currentUser && !!parentId,
  });
}

export function useContentItem(id: string | undefined) {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: contentQueryKeys.item(id!),
    queryFn: () => contentService.getContentById(currentUser!, id!),
    enabled: !!currentUser && !!id,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateNote() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string }) =>
      contentService.createNote(currentUser!, name, parentId),
    onSuccess: (_newNote, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.children(parentId) });
    },
  });
}

export function useRenameContent() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string; parentId: string }) =>
      contentService.renameContent(currentUser!, id, name),
    onSuccess: (_updated, { id, parentId }) => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.item(id) });
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.children(parentId) });
    },
  });
}

export function useDeleteContent() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; parentId: string }) =>
      contentService.deleteContent(currentUser!, id),
    onSuccess: (_result, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: contentQueryKeys.children(parentId) });
    },
  });
}
```

### Step 5: Refactor ContentContext

Strip `ContentContext` down to UI state only. Remove all server-related fields.

**File:** `packages/web/src/contexts/ContentContext.tsx` — replace entirely with:

```typescript
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ContentContextType {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  expandedNodeIds: string[];
  setExpandedNodeIds: (ids: string[]) => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([]);

  return (
    <ContentContext.Provider
      value={{ selectedNodeId, setSelectedNodeId, expandedNodeIds, setExpandedNodeIds }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = (): ContentContextType => {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used within a ContentProvider');
  return context;
};
```

### Step 6: Refactor ContentExplorer

Replace the `useEffect`-based fetching with `useRootDirectory` and `useFolderChildren`. The component becomes a
pure renderer of query data. Local `tree` and `nodeMap` state are eliminated — the tree structure is built from
query results as needed.

Key changes:
- Remove `useEffect` for initial data fetch
- Remove local `tree`, `loading`, `error` state (use query state instead)
- Remove `setNodeMap` call — the flat map is no longer needed as a standalone structure
- On folder expand: call `queryClient.prefetchQuery(contentQueryKeys.children(folderId))` to eagerly load children
- Use `expanded` from `ContentContext` (`expandedNodeIds`) instead of local state

The dummy-node pattern for lazy loading can be preserved: check if a folder's children query has been fetched; if not,
show a loading placeholder. This is equivalent to the current `dummy_` node approach but driven by query state.

### Step 7: Refactor NoteEditorPage

Replace the `nodeMap.get(noteId)` lookup with `useContentItem(noteId)`.

```typescript
const { noteId } = useParams<{ noteId: string }>();
const { data: note, isLoading, isError } = useContentItem(noteId);
```

This works regardless of how the user navigated to the page. If the note is already in the TanStack Query cache
(because the user clicked through the sidebar), it renders instantly with no network request. If the user opened the
URL directly, it fetches from the API.

Remove the `useEffect` that reads from `nodeMap` and the "Note not found. Please navigate from the sidebar." error —
this error case no longer exists.

### Step 8: Refactor NavigationDrawer

Replace `addNoteToMap` + `triggerRefresh` with `useCreateNote` mutation.

```typescript
const createNote = useCreateNote();

const handleCreateSuccess = async (name: string, parentId: string) => {
  const newNote = await createNote.mutateAsync({ name, parentId });
  handleModalClose();
  navigate(`/notes/${newNote.id}`);
  // Cache is automatically invalidated by the mutation's onSuccess
};
```

Remove imports of `triggerRefresh` and `addNoteToMap` from `useContent()`.

### Step 9: Clean Up

- Delete the `EnrichedTreeNode` type from `ContentContext` (move to `ContentExplorer` locally if still needed for
  the tree rendering shape, or replace with `Content & { children?: Content[] }`)
- Remove `nodeMap` usages from `CreateNoteModal` (it reads `nodeMap` for path display — replace with a utility
  function that accepts query data)
- Run `pnpm run verify` to catch any remaining references to removed fields

---

## File-by-File Changes Summary

| File | Change |
|---|---|
| `packages/web/package.json` | Add `@tanstack/react-query`, `@tanstack/react-query-devtools` |
| `packages/web/src/App.tsx` | Add `QueryClientProvider` + `ReactQueryDevtools` |
| `packages/web/src/lib/content/query-keys.ts` | **New file** — query key factory |
| `packages/web/src/lib/content/content-hooks.ts` | **New file** — all query and mutation hooks |
| `packages/web/src/lib/content/content-service.ts` | Add `getContentById`, `renameContent`, `deleteContent` methods |
| `packages/web/src/lib/content/index.ts` | Export new files |
| `packages/web/src/contexts/ContentContext.tsx` | Strip to UI state only (selectedNodeId, expandedNodeIds) |
| `packages/web/src/components/ContentExplorer.tsx` | Replace useEffect fetch with useRootDirectory / useFolderChildren |
| `packages/web/src/pages/NoteEditorPage.tsx` | Replace nodeMap lookup with useContentItem |
| `packages/web/src/components/NavigationDrawer.tsx` | Replace addNoteToMap + triggerRefresh with useCreateNote |
| `packages/web/src/components/CreateNoteModal.tsx` | Replace nodeMap path lookup with query data |

---

## Configuration Reference

### Recommended staleTime Values

| Query | staleTime | Rationale |
|---|---|---|
| Root directory | `Infinity` | Never changes for a user |
| Folder children | `5 minutes` | Changes only on create/delete/move |
| Content item (note) | `1 minute` | Can be renamed; editor updates it directly |

Override per-query by passing `staleTime` to `useQuery` options.

### Devtools

`ReactQueryDevtools` is included as a dev dependency and renders a floating panel in development. It shows all active
queries, their cache status, last-fetched time, and data. This is the primary debugging tool for cache issues.
Remove it or guard with `import.meta.env.DEV` if it causes bundle size concerns.
