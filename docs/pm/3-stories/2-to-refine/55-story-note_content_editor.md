# Story 55: Note Content Editor

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## User Story

As a user, I want to write and edit the content of my notes and have them saved automatically, so that I can
focus on my study material without worrying about losing changes.

## Details

- The note editor displays an editable rich-text area below the note title.
- The editor supports: headings, bold, italic, lists (ordered and unordered), code blocks with syntax
  highlighting, and links. Math/LaTeX is out of scope for now.
- Content is auto-saved after the user stops typing (debounce of 2 seconds). The user never needs to
  manually trigger a save.
- A save status indicator is displayed in the editor header:
  - **No changes** — no indicator shown (or "Saved" for a few seconds after the last save)
  - **Pending save** — "Saving…" (debounce window active or request in flight)
  - **Saved** — "Saved" (briefly after successful save)
  - **Error** — "Error saving" with a retry option
- Note content is stored in Cloud Storage for Firebase. The Firestore document stores only metadata
  (`contentUrl`, `size`, `updatedAt`). This is the first feature that wires up Cloud Storage in the API.
- A new note with no content yet has `contentUrl: null` in Firestore. The editor treats this as an empty
  document and initialises Cloud Storage on the first save.
- Content is fetched via a signed URL: the API generates a short-lived URL pointing to the Cloud Storage
  object; the client fetches the markdown directly from Cloud Storage (not through the Firebase Function).
  This reduces Function invocation costs and enables browser-level HTTP caching.

> **Note:** This story also covers the save status display (Story 54), which is bundled here since it is
> inseparable from the auto-save implementation.

> **Note:** This story is now ready to be moved to `3-stories/1-ready/`.

## Dependencies

- [ ] [Story 53](../../5-done/53-story-create_notes.md) — Tasks 4–6 must be complete (note editor
  shell and rename endpoint must exist before adding content editing)
- [ ] [Story 62](../../5-done/62-story-tanstack_query_refactor.md) — TanStack Query refactor must be complete
  so `NoteEditorPage` can fetch note metadata independently (direct navigation must work before adding
  content editing)

## Acceptance Criteria

- [ ] Opening a note displays its content in the rich-text editor.
- [ ] Opening a new (empty) note displays an empty editor with a placeholder.
- [ ] The editor supports headings, bold, italic, ordered/unordered lists, code blocks with syntax
  highlighting, and links.
- [ ] Changes are auto-saved 2 seconds after the user stops typing.
- [ ] The save status indicator correctly shows "Saving…" and "Saved" states.
- [ ] Saving fails gracefully: the indicator shows an error and the user can retry.
- [ ] Navigating directly to `/notes/:id` (browser refresh or bookmark) correctly loads the note content.
- [ ] Note content is stored in Cloud Storage; the Firestore document is updated with `contentUrl` and `size`.

## Technical Requirements

- [ ] Cloud Storage object path: `/{ownerId}/content/{contentId}` with `Content-Type: text/markdown` and
  `Cache-Control: private, max-age=3600`.
- [ ] Signed URLs expire in 60 minutes. TanStack Query `staleTime` for content body queries must be lower
  than the URL expiry (recommend 30 minutes).
- [ ] The API must never return the content body inline in the Firestore metadata response — always via
  signed URL.
- [ ] Editor library: `@mdxeditor/editor`. Visual editing only (no raw markdown mode for users).

## Tasks

### Backend

- [ ] **[BE] Add `GET /api/content/:id` endpoint**
    - Returns a single content item by ID (metadata only, no content body).
    - Returns 404 if not found; 403 if the authenticated user is not the owner.
    - Required by the TanStack Query refactor (`useContentItem` hook) so `NoteEditorPage` can load a note
      when navigating directly to its URL.
    - Add `findById` as a public method on `ContentService` (it currently exists as private).

- [ ] **[BE] Configure Cloud Storage in the API module**
    - Add Firebase Admin Storage initialisation to `FirebaseAdminService` (or a new `StorageService`).
    - Ensure the emulator environment uses the Firebase Storage emulator
      (`FIREBASE_STORAGE_EMULATOR_HOST`).

- [ ] **[BE] Add `PUT /api/content/:id/body` endpoint**
    - Accepts `Content-Type: text/plain` request body (raw markdown string).
    - Uploads the content to Cloud Storage at `/{ownerId}/content/{contentId}`.
    - Sets `Cache-Control: private, max-age=3600` and `Content-Type: text/markdown` on the object.
    - Updates the Firestore document with `contentUrl`, `size`, and `updatedAt`.
    - Returns the updated `Content` metadata (no body — client refreshes from signed URL).
    - Returns 403 if the authenticated user is not the owner; 404 if the content item does not exist.
    - Returns 400 if called on a directory (directories have no body).

- [ ] **[BE] Add `GET /api/content/:id/body` endpoint**
    - Generates and returns a short-lived signed URL (60 minutes) for the content's Cloud Storage object.
    - Returns `{ signedUrl: string, expiresAt: string }`.
    - Returns 404 if the note has no content yet (`contentUrl` is null) — the client treats this as an
      empty note.
    - Returns 403 if the authenticated user is not the owner.

### Frontend

- [ ] **[FE] Install and configure `@mdxeditor/editor`**
    - Install the package.
    - Configure with plugins for: headings, bold/italic, lists, code blocks (with syntax highlighting),
      links. Do not enable raw markdown mode.

- [ ] **[FE] Content loading with two-query pattern**
    - Add `useNoteBody(signedUrl)` hook using `useQuery`. Fetches markdown text directly from the signed
      URL (Cloud Storage). `staleTime: 30 * 60 * 1000` (30 minutes).
    - Add `getContentBody(noteId)` to `ContentService` which calls `GET /api/content/:id/body` and returns
      the signed URL.
    - Add `useContentBody(noteId)` hook which calls `getContentBody` and returns `{ signedUrl, expiresAt }`.
    - In `NoteEditorPage`: first query metadata via `useContentItem(noteId)` (from TanStack Query refactor),
      then fetch signed URL via `useContentBody(noteId)`, then fetch markdown via `useNoteBody(signedUrl)`.
    - Treat a 404 from `GET /api/content/:id/body` as an empty note (no error shown to user).

- [ ] **[FE] Auto-save with debounce**
    - On every editor change, reset a 2-second debounce timer.
    - When the timer fires, call `PUT /api/content/:id/body` with the current markdown.
    - Manage save state: `idle | saving | saved | error`.

- [ ] **[FE] Save status indicator**
    - Display in the note editor header.
    - `saving` → "Saving…" (spinner or muted text).
    - `saved` → "Saved" (shown for 3 seconds, then hides).
    - `error` → "Error saving" with a "Retry" button that triggers the save immediately.
    - No indicator shown in `idle` state.

### Testing

- [ ] **[E2E] Note content editing flow**
    - Open a new note, type content, wait for auto-save, reload the page, verify content persists.
    - Verify save status transitions correctly.

### Documentation

- [ ] **[DOCS] Update API documentation** for the three new endpoints (`GET /:id`, `PUT /:id/body`,
  `GET /:id/body`).
- [ ] **[DOCS] Update `packages/api/README.md`** with Cloud Storage configuration instructions for local
  development and emulator setup.
