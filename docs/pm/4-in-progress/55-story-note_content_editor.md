# Story 55: Note Content Editor

## Epic Reference

- [Epic 45: Content Management Foundation](../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../2-features/1-ready/47-feature-note_editing_and_management.md)

## User Story

As a user, I want to write and edit the content of my notes and have them saved automatically, so that I can
focus on my study material without worrying about losing changes.

## Scope

**In scope**

- Rich-text note body below the title (visual editing; no raw-markdown mode for users).
- Markdown features: headings, bold, italic, ordered/unordered lists, code blocks with syntax highlighting, links.
- Auto-save after the user stops typing (**debounce: 2 seconds**).
- Save status in the note editor header (bundled from [Story 54](../3-stories/2-to-refine/54-story-save_status_display.md); no
  separate story).
- Note body stored in **Firebase Cloud Storage**; Firestore holds **metadata only** (`bodyUri`, `size`, `updatedAt`
  alongside existing fields). **`bodyUri` is internal** (object path in the bucket); the **public `GET /api/content/:id`
  metadata DTO does not expose it** so clients are not tied to storage layout. The client infers “body already saved”
  from **`size`** (and related fields): **`size` is null (or omitted) until the first successful `PUT …/body`**, then
  reflects byte length after each save.
- Load body via **signed URL**: API returns a short-lived URL; the **browser fetches markdown directly from Cloud
  Storage** (not via repeated Cloud Function proxying for the bytes).
- **Direct navigation** to `/notes/:id` loads metadata (existing TanStack Query hook) **and** body content end-to-end.

**Out of scope**

- Math / LaTeX in the editor.
- `beforeunload` / “unsaved changes” browser dialog (optional later).
- E2E tests for this story (**deferred for MVP**; see [Testing](#testing)).

## Dependencies (satisfied)

| Dependency                                                                                                                   | Status  |
|------------------------------------------------------------------------------------------------------------------------------|---------|
| [Story 53](../5-done/53-story-create_notes.md) — note editor shell, rename API                                            | Shipped |
| [Story 62](../5-done/62-story-tanstack_query_refactor.md) — TanStack Query, `useContentItem`, no tree thrash on mutations | Shipped |

**Already delivered (do not re-implement as part of this story)**

- `GET /api/content/:id` — single content item **metadata only** (404 / 403 as appropriate). Required for
  `useContentItem` and shipped with Story 62.
- Backend `ContentService` / repository already model `bodyUri`, `size`, `updatedAt` on content entities (initially
  `null` for new notes). Only **`size` / `updatedAt` / `bodyMimeType`** (as applicable) appear on the **HTTP metadata**
  response; **`bodyUri` stays server-side**.

## Details

### Editor

- Library: **`@mdxeditor/editor`**, configured for visual editing with plugins for the markdown features listed above.
  Do **not** expose a raw markdown editing mode to users.
- New or never-saved notes: **`size` is null** (no body in Storage yet; Firestore still has `bodyUri` null server-side
  until the first save). The UI shows an **empty editor** with a sensible placeholder. The first successful save creates
  the Storage object and sets **`bodyUri` (persisted only server-side)**, **`size`**, and **`updatedAt`** on the
  entity; the metadata response exposes **`size`** / **`updatedAt`** / **`bodyMimeType`** as today.

### Save status (single, consistent behavior)

Save state machine: **`idle` | `pending` | `saving` | `saved` | `error`**.

| State     | When                                                                                | Header UI                                                                 |
|-----------|-------------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| `idle`    | No local changes since last successful save (initial load or after “Saved” timeout) | **No indicator**                                                          |
| `pending` | User has edited; debounce timer running (not yet fired)                             | **“Saving…”** (user should see that work will be persisted)               |
| `saving`  | Debounced save in flight (`PUT /body`)                                              | **“Saving…”**                                                             |
| `saved`   | Last `PUT` succeeded                                                                | **“Saved”** for **3 seconds**, then transition to `idle`                  |
| `error`   | Last `PUT` failed                                                                   | **“Error saving”** + **Retry** (immediate save of current editor content) |

**Clarifications**

- **“Saving…”** covers both debounce waiting and request in flight so the user is never left wondering if a pause means
  “nothing to save.”
- After a successful save, show **“Saved”** briefly; do **not** show an indicator in `idle`.

### Unmount / navigation

- When the user leaves the note route or the editor unmounts, **cancel the debounce timer and, if there are unsaved
  local changes, perform one immediate save** (same payload as debounced save) so up to ~2 seconds of typing is not
  silently discarded. No `beforeunload` requirement for this story.

### Storage and security

- GCS object path: `/{ownerId}/content/{contentId}` where **`contentId` is the Firestore document ID** of the `Content`
  item (the note).
- Object metadata: `Content-Type: text/markdown`, `Cache-Control: private, max-age=3600`.
- Signed read URLs: **10 minutes** expiry; response includes `signedUrl` and `expiresAt` (**ISO-8601** string).
- API must **never** return the note body bytes inline on generic content metadata endpoints — only via `GET .../body` (
  signed URL) and the subsequent browser fetch to Storage.

## Acceptance Criteria

- [ ] Opening a note shows its body in the rich-text editor (loaded via signed URL → fetch markdown).
- [ ] Opening a note with **no body yet** (metadata has **`size` null** and/or **`GET …/body` returns 404**) shows an
  empty editor with a placeholder; no error surfaced for “missing body.”
- [ ] Editor supports headings, bold, italic, ordered/unordered lists, code blocks with syntax highlighting, and links.
- [ ] Edits auto-save **2 seconds** after the last change (debounce resets on each keystroke/edit).
- [ ] Save status matches the table above (`idle` / `pending` / `saving` / `saved` / `error`).
- [ ] Failed save shows error + Retry; retry issues `PUT` with current content.
- [ ] Direct navigation to `/notes/:id` (refresh or bookmark) loads title/metadata and body correctly.
- [ ] After save, Firestore reflects updated **`bodyUri`** (server-only), **`size`**, and **`updatedAt`**; the API
  metadata response reflects **`size`** / **`updatedAt`** (and **`bodyMimeType`** as applicable); object exists at the
  defined path with correct headers.
- [ ] On unmount/navigation away, pending changes are flushed as specified (no silent drop of dirty state).

## Technical Requirements

### Backend

- [ ] **Cloud Storage** integrated in the API (Firebase Admin Storage or dedicated wrapper). Local/dev uses the *
  *Storage emulator** when configured (`FIREBASE_STORAGE_EMULATOR_HOST`).
- [ ] **`PUT /api/content/:id/body`**
    - Request: `Content-Type: text/plain` (raw markdown string).
    - Validates content exists, user owns it, and item is a **note** (or at least not a directory); **400** if body
      storage is not applicable (e.g. directory).
    - Upload/replace object at `/{ownerId}/content/{contentId}` with `text/markdown` and
      `Cache-Control: private, max-age=3600`.
    - Update Firestore: `bodyUri` (provider-agnostic object path in the default bucket, e.g. `ownerId/content/noteId`), `size`, `updatedAt`.
    - Response: updated **metadata** DTO only (no inline body).
    - **403** if not owner; **404** if content missing.
- [ ] **`GET /api/content/:id/body`**
    - Returns **`{ signedUrl: string, expiresAt: string }`** (ISO-8601).
    - **404** if the note has no stored body yet (server: `bodyUri` unset) — client treats as empty document (same
      signal as **`size` null** on metadata).
    - **403** if not owner.
    - Signed URL lifetime **10 minutes**.

### Frontend

- [ ] **Query keys** — extend `packages/web/src/lib/content/query-keys.ts` (factory pattern, consistent with Story 62),
  e.g.:
    - `bodySignedUrl(id)` for the signed-URL fetch query.
    - `noteMarkdown(id)` (and include `signedUrl` in the key **or** document why the key is note-only plus invalidation
      rules) so cache stays correct when URLs rotate or content updates.
- [ ] **Three-step loading on `NoteEditorPage`**
    1. `useContentItem(noteId)` — metadata (existing).
    2. `useContentBody(noteId)` — `GET /api/content/:id/body`; **404 → treat as empty body**, not `isError` for the
       page.
    3. `useNoteBody(...)` — `fetch` markdown from `signedUrl` with `useQuery`; **`enabled: Boolean(signedUrl)`** when
       proceeding to download bytes; for notes with **no body yet** (`size` null / `GET …/body` → 404), **skip** this
       fetch and show empty editor.
- [ ] **`staleTime`** for the markdown query: **5 minutes** (strictly less than signed URL **10 minutes** expiry). If
  the URL expires while stale, refetch signed URL (and then markdown) — implementers may rely on invalidation after
  save + conservative `staleTime` to avoid broken URLs.
- [ ] **After successful `PUT /body`**
    - Invalidate or update TanStack Query cache so **metadata** (`contentQueryKeys.item(id)`) reflects **`size`** and
      **`updatedAt`** (and **`bodyMimeType`** if returned) as returned by the API — **not** `bodyUri` (not on wire).
    - Invalidate **signed-URL** and **markdown** queries for that `noteId` (or update markdown cache from the saved
      string) so the editor does not show stale data after save.
- [ ] **Auto-save mutation** — `useMutation` (or equivalent) calling `PUT /api/content/:id/body`; debounce in the
  component or a small hook; integrate with save-state machine above.
- [ ] **OpenAPI / generated client** — regenerate after new endpoints; document that **`bodyUri` is not part of the
  public content metadata response**; **`size`** (nullable for notes) is the client signal for “body exists in
  Storage.” Align generated `ContentResponse` (or equivalent) typings with the API.
- [ ] **After login and logout**
    - Invalidate TanStack Query cache to make sure the user sees data that belongs to himself and is up to date.

### Caching and consistency

- Default app `QueryClient` options from Story 62 remain in force (`staleTime`, `refetchOnWindowFocus`, etc.).
  Body-specific `staleTime` overrides apply only to body/signed-url/markdown queries as specified.

## Tasks

### Backend

- [ ] **[BE] Cloud Storage** — wire Admin SDK + emulator support; document env vars in `packages/api/README.md`.
- [ ] **[BE] `PUT /api/content/:id/body`** — upload, Firestore update, status codes as above.
- [ ] **[BE] `GET /api/content/:id/body`** — signed URL + `expiresAt`.
- [ ] **[BE] Tests** — classical TDD for new behavior (authz, 404/400 paths, Firestore + storage integration or faked
  storage per project norms).

### Frontend

- [ ] **[FE] `@mdxeditor/editor`** — install, theme/layout consistent with note shell.
- [ ] **[FE] Content service + hooks** — API methods for `getContentBody`, `putContentBody`, and markdown fetch; hooks
  in `content-hooks.ts` (or colocated files if the file grows too large — prefer one import surface for callers).
- [ ] **[FE] `NoteEditorPage`** — compose metadata + body queries, loading/error boundaries consistent with existing
  page, placeholder for empty body.
- [ ] **[FE] Debounced auto-save + flush on unmount** + header save status UI.
- [ ] **[FE] Tests** — only where non-trivial (e.g. debounce/save state helper); not required for thin wrappers.

### Documentation

- [ ] **[DOCS] OpenAPI / API docs** — document `PUT /:id/body` and `GET /:id/body` (and clarify `GET /:id` remains
  metadata-only, **without** `bodyUri` on the wire; **already present from Story 62** with the tightened shape above).
- [ ] **[DOCS] `packages/api/README.md`** — Storage emulator and local setup.

## Testing

- **API:** unit/integration tests for new endpoints and storage behavior (required per project standards).
- **E2E:** **not required** for this story during the MVP
  push ([contributing guidelines](../../dev/contributing_guidelines.md)); optional follow-up later.

## References

- TanStack Query plan and body-vs-metadata split: [
  `docs/research/client_state_management/phase_1_tanstack_query.md`](../../research/client_state_management/phase_1_tanstack_query.md)
- MVP ordering: [`docs/research/mvp_objective.md`](../../research/mvp_objective.md)
