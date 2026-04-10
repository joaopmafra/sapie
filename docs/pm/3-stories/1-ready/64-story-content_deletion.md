# Story 64: Content Deletion

## Description

As a user, I want to delete notes and folders so that I can remove content I no longer need and keep my
workspace clean.

## Details

- The user can delete a note from within the note editor (via a delete button or action).
- The user can delete a folder from a context menu on the folder node in the content tree.
- Deleting a note or folder requires a confirmation dialog before proceeding.
- Deleting a folder deletes all content inside it recursively (with a warning in the confirmation dialog
  indicating how many items will be deleted).
- After deleting a note, the user is navigated away from the editor (to the parent folder or root).
- Deleted content is **soft-deleted** (marked as `deleted: true` with a `deletedAt` timestamp) rather than
  permanently removed from the database. This is intentional:
  - Provides a safety net before the full Trash UI and versioning story is implemented.
  - Required before the MCP server goes live — AI agents must not cause permanent, unrecoverable data loss.
  - A full Trash UI (to view and restore deleted items) will be added as part of the content versioning story
    (`docs/research/content_versioning.md`). Until then, soft-deleted items are invisible but recoverable
    via direct Firestore access if needed.
  - Cloud Storage objects for soft-deleted notes are **not deleted** at this stage. Permanent cleanup of
    Cloud Storage is handled by the versioning story's retention Cloud Function.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [ ] [Story 62](../../5-done/62-story-tanstack_query_refactor.md) — TanStack Query must be in place so deletion
  invalidates only the affected parent's children query rather than re-fetching the whole tree. (Story 62 did not ship
  `useDeleteContent`; a **TODO** in `packages/web/src/lib/content/content-hooks.ts` marks where to add it.)
- [ ] [Story 55](./55-story-note_content_editor.md) — The note editor must exist before
  a delete action can be placed within it.

## Acceptance Criteria

- [ ] A delete action is available in the note editor.
- [ ] A delete action is available on folder nodes in the content tree (via right-click / context menu
  or a button revealed on hover).
- [ ] A confirmation dialog is shown before deletion. For folders, the dialog states how many items will
  be deleted.
- [ ] After confirming deletion of a note, the user is navigated to the parent folder.
- [ ] Deleted items no longer appear in the content tree or any content queries.
- [ ] Deleting a folder removes all descendant notes and folders from the tree.
- [ ] Soft-deleted items have `deleted: true` and `deletedAt` set in Firestore; they are excluded from
  all `GET /api/content` queries.

## Technical Requirements

- [ ] Soft-delete: set `deleted: true` and `deletedAt: Timestamp` on the Firestore document. Do not use
  Firestore's delete operation.
- [ ] All existing `GET` queries must filter `where('deleted', '==', false)` (or `where('deleted', 'in',
  [false, null])` to handle legacy documents without the field).
- [ ] Cascade: deleting a folder must soft-delete all descendants. Use a Firestore batch write for
  atomicity. For deep hierarchies, fetch descendants level by level (Firestore does not support recursive
  queries natively).
- [ ] Cloud Storage objects are not touched. Permanent deletion is deferred to the versioning story.
- [ ] The `deletedBy` field must be set (matching the `VersionActor` shape from the versioning design)
  to support the future operation log.

### TanStack Query (recommended cache updates on delete)

When implementing the delete mutation (`useDeleteContent` in `content-hooks.ts`):

- **`invalidateQueries({ queryKey: contentQueryKeys.children(parentId) })`** — refetch the parent folder’s children so the sidebar drops the deleted item (same pattern as create/rename in Story 62).
- **`removeQueries({ queryKey: contentQueryKeys.item(id) })`** — remove the single-item cache entry for the deleted note or folder so stale metadata cannot flash on `/notes/:id` or after prefetch. This is the usual complement to invalidating the children list.

For **folder** deletion with a deep subtree, invalidate **`children`** for the folder’s **parent** at minimum. If the UI ever shows inconsistent descendants, a broader fallback is **`invalidateQueries({ queryKey: contentQueryKeys.allChildren() })`**; prefer targeted keys when the tree state is clear enough to compute them.

## Tasks

### Backend

- [ ] **[BE] Add `deleted` fields to `ContentDocument` and `Content` entities**
    - Add `deleted?: boolean` and `deletedAt?: Date | null` and `deletedBy?: object` to both interfaces.

- [ ] **[BE] Update all `GET` queries to filter out soft-deleted items**
    - `ContentService.findByParentIdAndOwnerId()`: add `.where('deleted', 'in', [false, null])`.
    - `ContentService.findById()`: return `null` (→ 404) if `deleted === true`.
    - `RootDirectoryService.findRootDirectory()`: add the same filter.

- [ ] **[BE] Add `DELETE /api/content/:id` endpoint**
    - Returns 404 if not found or already deleted; 403 if not the owner.
    - For a note: sets `deleted: true`, `deletedAt`, `deletedBy` on the single Firestore document.
    - For a directory: fetches all descendants recursively, soft-deletes all in a Firestore batch write,
      then soft-deletes the directory itself.
    - Returns 204 No Content on success.

### Frontend

- [ ] **[FE] Add `useDeleteContent()` and `contentService.deleteContent()`**
    - `useMutation` calling the new DELETE API; **`onSuccess`**: `invalidateQueries` for
      `contentQueryKeys.children(parentId)` **and** `removeQueries` for
      `contentQueryKeys.item(id)` (see **TanStack Query** subsection above).
    - Regenerate the OpenAPI client after the backend route exists.

- [ ] **[FE] Add delete action to note editor**
    - Add a "Delete note" button or menu item in the note editor header/toolbar.
    - On click, show a `ConfirmDeleteDialog` ("Are you sure you want to delete this note?").
    - On confirm, call `useDeleteContent()` mutation. On success, navigate to the parent folder
      (use `parentId` from the note's metadata).

- [ ] **[FE] Add delete action to content tree nodes**
    - On right-click (or hover reveal) of a folder or note node, show a small action menu with a
      "Delete" option.
    - On click, show `ConfirmDeleteDialog`. For folders, include a count of items that will be deleted
      (use the folder's known children from the TanStack Query cache for an approximate count; note the
      dialog text should say "and all its contents").
    - On confirm, call `useDeleteContent()` mutation (invalidate parent **`children`**, remove **`item(id)`** from cache).

- [ ] **[FE] `ConfirmDeleteDialog` component**
    - Reusable MUI Dialog with "Cancel" and "Delete" buttons.
    - "Delete" button is red/error colour.
    - Accepts a `message` prop for context-specific text.

- [ ] **[FE] Handle navigating away after note deletion**
    - If the user is on `/notes/:id` and that note is deleted, navigate to `/` (root/home).

### Testing

- [ ] **[E2E] Note deletion flow**
    - Delete a note from the editor; verify it disappears from the tree and the user is navigated away.

- [ ] **[E2E] Folder deletion flow**
    - Create a folder with a note inside; delete the folder; verify both disappear from the tree.

### Documentation

- [ ] **[DOCS]** Update API documentation for `DELETE /api/content/:id`.
- [ ] **[DOCS]** Add a note in `docs/research/content_versioning.md` or its implementation plan that
  soft-delete fields are already present from this story, so the versioning story does not need to
  add them.
