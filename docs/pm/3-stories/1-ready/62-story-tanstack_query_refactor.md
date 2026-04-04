# Story 62: TanStack Query Refactor

## Description

As a developer, I want to replace the current ad-hoc content state management with TanStack Query, so that
server state is properly cached and invalidated, note pages work when navigated to directly, and auto-save in
the note editor does not cause the sidebar tree to re-fetch.

## Details

The current `ContentContext` mixes server state (content from the API) with UI state (selected node, expanded
nodes). This causes three concrete problems that must be fixed before the note content editor is built:

1. **Direct navigation is broken.** Opening `/notes/:id` from a bookmark or browser refresh fails with "Note
   not found" because `nodeMap` (which `NoteEditorPage` reads from) is only populated by browsing the sidebar.
2. **Any mutation causes a full tree re-fetch.** `triggerRefresh()` re-fetches the entire tree from root.
   Once auto-save is added to the note editor, every save will thrash the sidebar.
3. **`addNoteToMap` and `triggerRefresh` fight each other.** The optimistic update provides no value and is
   immediately overwritten by the full re-fetch.

The fix: separate server state (TanStack Query) from UI state (slim ContentContext with only `selectedNodeId`
and `expandedNodeIds`).

Full implementation plan: `docs/research/client_state_management/phase_1_tanstack_query.md`

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [ ] [Story 53](../../5-done/53-story-create_notes.md) — Tasks 4–6 must be complete. The TanStack
  Query refactor changes how `NoteEditorPage` loads data; the page shell must exist first.

## Acceptance Criteria

- [ ] Navigating directly to `/notes/:id` (browser refresh, bookmark) correctly loads and displays the note.
- [ ] Creating a note re-fetches only the affected folder's children, not the entire tree.
- [ ] The sidebar tree does not flicker or collapse when a note mutation occurs.
- [ ] `ContentContext` exposes only `selectedNodeId`, `setSelectedNodeId`, `expandedNodeIds`,
  `setExpandedNodeIds`. All server-data fields (`nodeMap`, `refreshTrigger`, `addNoteToMap`, etc.) are removed.
- [ ] `ReactQueryDevtools` is available in development builds.

## Technical Requirements

- [ ] Use `@tanstack/react-query` v5.
- [ ] `QueryClientProvider` wraps the entire app (outermost provider).
- [ ] Default `staleTime`: 5 minutes. Default `refetchOnWindowFocus`: false.
- [ ] Query keys follow the factory pattern in `content-query-keys.ts` (see implementation plan).
- [ ] All content query and mutation hooks live in `packages/web/src/lib/content/content-hooks.ts`.
- [ ] The `GET /api/content/:id` backend endpoint must exist before this story can be completed.
  If it does not exist at the start of this story, create it as the first task (or confirm it was added
  as part of Story 55 prerequisites).

## Tasks

### Setup

- [ ] **Install dependencies**
    - `pnpm add @tanstack/react-query` in `packages/web`
    - `pnpm add -D @tanstack/react-query-devtools` in `packages/web`

- [ ] **Add `QueryClientProvider` to `App.tsx`**
    - Create `QueryClient` with default options (staleTime: 5 min, refetchOnWindowFocus: false, retry: 2).
    - Wrap app with `QueryClientProvider` as the outermost provider.
    - Add `<ReactQueryDevtools initialIsOpen={false} />` guarded by `import.meta.env.DEV`.

### API & Service

- [ ] **Verify or add `GET /api/content/:id` endpoint**
    - Returns single content item metadata by ID.
    - Returns 404 if not found; 403 if not the owner.
    - Exposes `findById` as a public method on `ContentService`.

- [ ] **Add `getContentById(user, id)` to `ContentService`** (frontend)
    - Calls `GET /api/content/:id`.
    - Returns `Content`.

### State Layer

- [ ] **Create `packages/web/src/lib/content/query-keys.ts`**
    - Export `contentQueryKeys` factory: `root()`, `allChildren()`, `children(parentId)`, `item(id)`.

- [ ] **Create `packages/web/src/lib/content/content-hooks.ts`**
    - `useRootDirectory()` — `useQuery` on `contentQueryKeys.root()`
    - `useFolderChildren(parentId)` — `useQuery` on `contentQueryKeys.children(parentId)`
    - `useContentItem(id)` — `useQuery` on `contentQueryKeys.item(id)`
    - `useCreateNote()` — `useMutation`, invalidates `contentQueryKeys.children(parentId)` on success
    - `useRenameContent()` — `useMutation`, invalidates `item(id)` and `children(parentId)` on success
    - `useDeleteContent()` — `useMutation`, invalidates `children(parentId)` on success

- [ ] **Refactor `ContentContext`**
    - Remove: `nodeMap`, `setNodeMap`, `refreshTrigger`, `triggerRefresh`, `addNoteToMap`, `getParentPath`,
      `EnrichedTreeNode` export.
    - Keep: `selectedNodeId`, `setSelectedNodeId`, `expandedNodeIds`, `setExpandedNodeIds`.

### Component Refactors

- [ ] **Refactor `ContentExplorer`**
    - Replace `useEffect`-based fetch with `useRootDirectory()` and `useFolderChildren()`.
    - Remove local `tree` state — derive tree shape from query data.
    - Replace local `loading`/`error` state with query `isLoading`/`isError`.
    - Replace `expanded` local state with `expandedNodeIds` from `ContentContext`.
    - On folder expand: call `queryClient.prefetchQuery(contentQueryKeys.children(folderId))`.
    - Remove `setNodeMap` call entirely.

- [ ] **Refactor `NoteEditorPage`**
    - Replace `nodeMap.get(noteId)` with `useContentItem(noteId)`.
    - Remove the "Note not found. Please navigate from the sidebar." error case.
    - Handle `isLoading` and `isError` from the query hook.

- [ ] **Refactor `NavigationDrawer`**
    - Replace `addNoteToMap` + `triggerRefresh` with `useCreateNote()` mutation.
    - Remove `triggerRefresh` and `addNoteToMap` from `useContent()` destructuring.

- [ ] **Refactor `CreateNoteModal`**
    - Replace `nodeMap`-based path display with data from the parent folder query.

### Cleanup

- [ ] Remove `EnrichedTreeNode` from `ContentContext` (keep locally in `ContentExplorer` if needed).
- [ ] Run `pnpm run verify` and fix all TypeScript errors and linting warnings.

### Documentation

- [ ] **[DOCS]** Update `packages/web/README.md` to document TanStack Query setup and the query key
  convention.
