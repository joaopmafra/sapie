# Story 81: Content Roots + Tags

## Description

As a user, I want to tag folders as study content roots so that the study dashboard can aggregate cards from my study domains.

## Details

- Add optional `tags: string[]` field to the Content Firestore document.
- Folders tagged `"content-root"` become visible in the study dashboard (Story 82).
- Tag `"knowledge-area"` exists for future umbrella folders (no special behavior in MVP).
- Tags are managed from the folder detail view (right panel when a folder is clicked in the sidebar).
- Uses existing `PATCH /api/content/:id` endpoint, extended to support `tags` updates alongside `name`.
- `GET /api/content/roots` endpoint returns all content roots with due card counts for the dashboard.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [x] Story 75 — blob storage model
- [x] Story 76 — flashcard deck CRUD (denormalized `folderId`)
- [x] Story 77 — flashcard card CRUD (card subcollections with `dueDate`)

## Acceptance Criteria

- [ ] `tags: string[]` is stored on Content documents in Firestore.
- [ ] `PATCH /api/content/:id` accepts `tags` alongside `name`; at least one field must be provided.
- [ ] `GET /api/content/roots` returns folders tagged `"content-root"` with `dueCardCount`.
- [ ] Folder detail view shows tag chips (e.g. "content-root" badge with × button).
- [ ] Folder detail view has an "Add tag" field with autocomplete for known tags.
- [ ] Tag changes are persisted immediately via the PATCH endpoint.
- [ ] Non-folder content types ignore tags (PATCH returns 400 if `tags` sent for note/deck).

## Technical Requirements

### Backend

- [ ] Add `tags?: string[]` to `Content` entity and `ContentDocument` interface.
- [ ] Add `tags` field to `UpdateContentRequest` DTO with `@IsOptional()` and `@IsArray()` validators.
- [ ] Update `ContentService.patchContent()` to accept optional `tags` alongside `name`:
  - Require at least one of `name` or `tags` in the request (return 400 if both undefined/null).
  - Return 400 if `tags` is sent for non-folder content (note/deck).
  - Update Firestore document with the new tags array.
- [ ] Update `ContentRepository`:
  - `addDirectory()` — accepts optional `tags` for initial creation (not used yet but consistent).
  - `updateContentTags(id, tags, updatedAt)` — new method for tag updates.
  - `findRootsByOwnerId(ownerId)` — new method: query `content` where `type == 'directory'`, `tags` array-contains `"content-root"`, `ownerId == ownerId`, `deleted != true`.
- [ ] Create `GET /api/content/roots` endpoint in `ContentController`:
  - Returns `{ roots: [{ id, name, dueCardCount }] }`.
  - `dueCardCount` computed server-side: for each root, find all descendant folder IDs, find decks with `folderId` in those IDs, count cards with `dueDate <= now` and `deleted != true`.
  - This is a read-heavy query — accept that it may be slow for large hierarchies in MVP.
- [ ] Unit tests for the roots endpoint and tag update logic.

### Frontend

- [ ] Add `tags` to `ContentResponse` type in `packages/web/src/lib/content/types.ts`.
- [ ] Create `useContentRoots()` hook in `packages/web/src/lib/content/content-hooks.ts`:
  - `useQuery` for `GET /api/content/roots`.
- [ ] Create `useUpdateContentTags()` hook or extend `useRenameContent()` to support tags updates.
- [ ] Update `FolderPage.tsx`:
  - Show tag chips below folder name in the detail panel.
  - Each chip has label + × (remove) button.
  - "Add tag" text field with autocomplete for known tags: `content-root`, `knowledge-area`.
  - Uses `PATCH /api/content/:id` with `{ tags: [...] }`.
- [ ] Tags UI is only shown on folder-type content (not notes or decks).
- [ ] Unit tests for FolderPage tag UI.

### Documentation

- [ ] Update `content_naming.md` to document the `tags` field.
- [ ] API Swagger docs auto-generated from decorators.

## Out of scope

- Tag validation (any folder can have any tag for MVP).
- Nesting rules (content-root under knowledge-area).
- Tag creation UI for non-folders.
