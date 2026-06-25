# Story 70: URL-Driven Sidebar Selection and Folder View

## Description

As a user, I want the sidebar tree selection to always match the content shown in the main area, so that I can see
which note or folder I am viewing — including after creating content, clicking a folder, or reloading the page.

## Details

Today the sidebar highlight (`selectedNodeId` in `ContentContext`) and the content body are driven by separate
mechanisms. They stay in sync only when the user clicks a note in the tree. This causes visible mismatches:

- **Create note:** navigation goes to `/notes/:id`, but the previously selected tree node stays highlighted.
- **Reload on a note URL:** the content body loads the note, but the sidebar does not reflect it (often showing the
  root or nothing selected).
- **Create or select a folder:** folder selection updates in context, but there is no folder route or folder view — the
  body may still show the previous note.

**Decision:** the **URL is the single source of truth** for which content is active. The sidebar derives its selection
from the URL; it does not maintain an independent `selectedNodeId` store. Do **not** introduce Zustand or another
global state library for this — TanStack Query already owns server data; React Router owns navigation state.

**Folder behaviour (MVP scope):**

- Clicking a folder in the tree navigates to `/folders/:folderId`.
- After creating a folder, navigate to `/folders/:newFolderId` (replace direct `setSelectedNodeId` on success).
- The content body shows a minimal **folder view**: folder name and creation date only. Rename and child listing are
  deferred.

**Root / home:**

- Landing on `/` is unchanged — no new route or selection behaviour required for the home page.

**Tree expansion:**

- Auto-expand **only the ancestor path** to the item in the current URL so the selected node is visible.
- Expansion is session-scoped; persisting expanded nodes across reloads is out of scope.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 46: Content Navigation & Organization](../../5-done/46-feature-content_navigation_and_organization.md)

## Dependencies

- [x] [Story 62](../../5-done/62-story-tanstack_query_refactor.md) — TanStack Query and `useContentItem` must be in
  place so note and folder pages fetch independently of the tree.
- [x] [Story 63](../../5-done/63-story-folder_creation.md) — Folder creation flow exists; this story wires it to the
  new folder route and view.

## Related

- [Story 51](../../5-done/51-story-highlight_selected_node.md) — Original highlight behaviour; superseded in practice
  by URL-driven selection in this story.
- [Client state management — Phase 1: TanStack Query](../../../research/client_state_management/phase_1_tanstack_query.md)
  — Documents the server-state vs UI-state split and why Zustand is not needed here.

## Acceptance Criteria

- [ ] On `/notes/:noteId`, the sidebar highlights that note after the tree loads (including after a full page reload
  or direct navigation to the URL).
- [ ] On `/folders/:folderId`, the sidebar highlights that folder and the content body shows the folder name and
  creation date.
- [ ] Clicking a note in the sidebar navigates to `/notes/:id`; clicking a folder navigates to `/folders/:id`.
- [ ] Creating a note navigates to `/notes/:newId` and the sidebar highlights the new note (no stale selection).
- [ ] Creating a folder navigates to `/folders/:newId` and the sidebar highlights the new folder; the folder view is
  shown in the content body.
- [ ] When the URL points to a nested note or folder, ancestor folders on the path are expanded so the selected node
  is visible in the tree.
- [ ] Landing on `/` behaves as today — no regression to the home/workspace view.
- [ ] The "New note" and "New folder" actions derive the target parent folder from the current URL (folder route → that
  folder; note route → the note's parent folder), not from a separate selection store.

## Technical Requirements

- [ ] Add route `/folders/:folderId` rendering a `FolderPage` (or equivalent) in `packages/web`.
- [ ] Derive sidebar `selectedItems` from URL params (`noteId` or `folderId`) — remove `selectedNodeId` /
  `setSelectedNodeId` from `ContentContext` and update all call sites.
- [ ] Keep `expandedNodeIds` in `ContentContext` (or a small hook) as UI-only state; update it when the URL changes to
  include the ancestor chain of the active item (using `parentId` from cached `useContentItem` data or equivalent).
- [ ] Do not add Zustand; do not duplicate server data outside TanStack Query.
- [ ] `NavigationDrawer` "New" menu parent resolution reads from URL + `useContentItem`, not from `selectedNodeId`.

## Tasks

### Frontend — routing and folder view

- [ ] **[FE] Add `/folders/:folderId` route and `FolderPage`**
    - Register route in `App.tsx` (inside the same protected layout as notes).
    - Fetch folder via `useContentItem(folderId)`; handle loading, error, and not-found states consistently with
      `NoteEditorPage`.
    - Render folder name and formatted creation date (minimal MVP view).

### Frontend — URL-driven sidebar sync

- [ ] **[FE] Derive tree selection from URL in `ContentExplorer`**
    - Replace `selectedNodeId` from context with a value derived from `useParams()` / `useLocation()`.
    - On folder click: `navigate('/folders/:id')` instead of only updating context.
    - On note click: keep `navigate('/notes/:id')`; remove redundant `setSelectedNodeId` calls.

- [ ] **[FE] Auto-expand ancestor path on URL change**
    - When `noteId` or `folderId` is present, merge ancestor folder ids into `expandedNodeIds`.
    - Ensure root folder remains expanded when needed for visibility.

- [ ] **[FE] Slim down `ContentContext`**
    - Remove `selectedNodeId` and `setSelectedNodeId`.
    - Update `NavigationDrawer`, `ContentExplorer`, and any other consumers.

- [ ] **[FE] Align create flows with URL navigation**
    - Note create success: navigate only (already mostly true); verify sidebar follows.
    - Folder create success: `navigate('/folders/:newId')` instead of `setSelectedNodeId`.

- [ ] **[FE] Derive "New content" parent from URL**
    - On `/folders/:id`: parent is that folder.
    - On `/notes/:id`: parent is the note's `parentId` (via `useContentItem`).
    - On `/`: keep existing fallback (e.g. root directory).

### Testing

- [ ] **[FE] Unit/integration tests for URL → sidebar selection**
    - Render layout at `/notes/:id` with mocked tree data; assert the note node is selected and ancestors expanded.
    - Same for `/folders/:id`.
    - Assert folder click navigates to `/folders/:id` and note click to `/notes/:id`.

### Documentation

- [ ] **[DOCS]** Note in `packages/web/README.md` (or a short comment in routing code) that URL is canonical for active
  content and sidebar selection is derived — no separate selection store.

## Notes

- Future stories may add folder rename, folder child listing, and richer folder metadata in the content body; this
  story intentionally scopes the folder view to name + creation date.
- [Story 64](../../1-ready/64-story-content_deletion.md) assumes navigating to the parent folder after deleting a
  note; implementing `/folders/:folderId` here unblocks that navigation target.
