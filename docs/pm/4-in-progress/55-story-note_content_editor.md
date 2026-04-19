# Story 55: Note Content Editor

## Epic Reference

- [Epic 45: Content Management Foundation](../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../2-features/1-ready/47-feature-note_editing_and_management.md)

## User Story

As a user, I want to write and edit the content of my notes and have them saved automatically, so that I can
focus on my study material without worrying about losing changes.

## Scope

**MVP for this story (what “done” means here)**

- **Plain multiline note body** below the title (e.g. `<textarea>` or equivalent) with autosave and the save-status
  behavior described below — **not** a rich-text/visual markdown editor. That ships in
  [Story 67: Rich note content editor (MDXEditor)](../3-stories/2-to-refine/67-story-rich_note_content_editor_mdx.md).
- Auto-save after the user stops typing (**debounce: 5 seconds**).
- Save status in the note editor header (bundled from [Story 54](../3-stories/2-to-refine/54-story-save_status_display.md); no
  separate story).
- Note body stored in **Firebase Cloud Storage**; Firestore holds **metadata only** (`bodyUri`, `size`, `updatedAt`
  alongside existing fields — or the nested **`body`** shape introduced in
  [Story 66](../3-stories/1-ready/66-story-content_body_subdocument_and_client_cache.md) when that story lands).
  **`bodyUri` is internal** (object path in the bucket); the **public `GET /api/content/:id` metadata DTO does not
  expose it** so clients are not tied to storage layout. Until Story 66, the client infers “body already saved” from
  **`size`** (and related fields): **`size` is null (or omitted) until the first successful `PUT …/body`**, then reflects
  byte length after each save.
- Load body via **signed URL**: API returns a short-lived URL; the **browser fetches markdown directly from Cloud
  Storage** (not via repeated Cloud Function proxying for the bytes).
- **Direct navigation** to `/notes/:id` loads metadata (existing TanStack Query hook) **and** body content end-to-end.

**Long-term product vision** (not required to close Story 55)

- Rich-text editing with headings, lists, code blocks, links, etc. — **Story 67**.
- Clearer body-vs-metadata versioning and TanStack cache policy — **Story 66**.

**Out of scope**

- Math / LaTeX in the editor.
- `beforeunload` / “unsaved changes” browser dialog (optional later).
- E2E tests for this story (**deferred for MVP**; see [Testing](#testing)).
- **Concurrent editing** across multiple browser windows or devices (detect stale version, reload vs overwrite):
  [Story 65: Note Body Concurrency and Conflict Resolution](../3-stories/2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md).
- **Rich MDXEditor UI** — [Story 67](../3-stories/2-to-refine/67-story-rich_note_content_editor_mdx.md).
- **Nested `body` subdocument + client cache policy** — [Story 66](../3-stories/1-ready/66-story-content_body_subdocument_and_client_cache.md).

## Dependencies (satisfied)

| Dependency                                                                                                                | Status  |
| ------------------------------------------------------------------------------------------------------------------------- | ------- |
| [Story 53](../5-done/53-story-create_notes.md) — note editor shell, rename API                                            | Shipped |
| [Story 62](../5-done/62-story-tanstack_query_refactor.md) — TanStack Query, `useContentItem`, no tree thrash on mutations | Shipped |

**Ordering (follow-on stories)**

- [Story 66](../3-stories/1-ready/66-story-content_body_subdocument_and_client_cache.md) — body model + TanStack cache;
  scheduled **after** Story 55 (Phases 0–5) and **before** [Story 67](../3-stories/2-to-refine/67-story-rich_note_content_editor_mdx.md)
  (preferred).
- [Story 67](../3-stories/2-to-refine/67-story-rich_note_content_editor_mdx.md) — rich editor; depends on Story 55
  (Phases 0–5) and is **scheduled after** Story 66 when possible.

**Already delivered (do not re-implement as part of this story)**

- `GET /api/content/:id` — single content item **metadata only** (404 / 403 as appropriate). Required for
  `useContentItem` and shipped with Story 62.
- Backend `ContentService` / repository already model `bodyUri`, `size`, `updatedAt` on content entities (initially
  `null` for new notes). Only **`size` / `updatedAt` / `bodyMimeType`** (as applicable) appear on the **HTTP metadata**
  response; **`bodyUri` stays server-side** (shape may evolve in Story 66).

## Details

### Editor

- **Story 55:** plain **textarea** (or equivalent) for wiring, autosave, and save status — **not** `@mdxeditor/editor`
  (that is [Story 67](../3-stories/2-to-refine/67-story-rich_note_content_editor_mdx.md)).
- New or never-saved notes: **`size` is null** (no body in Storage yet; Firestore still has `bodyUri` null server-side
  until the first save). The UI shows an **empty editor** with a sensible placeholder. The first successful save creates
  the Storage object and sets **`bodyUri` (persisted only server-side)**, **`size`**, and **`updatedAt`** on the
  entity; the metadata response exposes **`size`** / **`updatedAt`** / **`bodyMimeType`** as today (until Story 66
  refines the DTO).

### Save status (single, consistent behavior)

Save state machine: **`idle` | `pending` | `saving` | `saved` | `error`**.

| State     | When                                                                                | Header UI                                                                 |
| --------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
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
  local changes, perform one immediate save** (same payload as debounced save) so up to ~5 seconds of typing is not
  silently discarded. No `beforeunload` requirement for this story.

### Storage and security

- GCS object path: `/{ownerId}/content/{contentId}` where **`contentId` is the Firestore document ID** of the `Content`
  item (the note).
- Object metadata: `Content-Type: text/markdown`, `Cache-Control: private, max-age=3600`.
- Signed read URLs: **10 minutes** expiry; response includes `signedUrl` and `expiresAt` (**ISO-8601** string).
- API must **never** return the note body bytes inline on generic content metadata endpoints — only via `GET .../body/signed-url` (
  signed URL) and the subsequent browser fetch to Storage.

## Implementation approach (phased)

Work is delivered in **small vertical slices** (each phase should be demonstrable end-to-end where possible), following
[iterative development](../../dev/iterative_development.md), [TDD baby steps](../../dev/tdd_baby_steps.md), and
[simplicity (XP)](../../dev/xp_simplicity_is_the_key.md). Frontend **technical requirements and tasks are merged below**
by phase—there is no separate “requirements vs tasks” list for the web app.

**Caching:** default app `QueryClient` options from [Story 62](../5-done/62-story-tanstack_query_refactor.md) remain in
force (`staleTime`, `refetchOnWindowFocus`, etc.). Body-specific `staleTime` overrides apply to body / signed-URL /
markdown queries as called out in Phase 0. **Metadata vs body cache policy** (e.g. `staleTime: 0` for item queries,
conditional invalidation when `body.updatedAt` advances) is **Story 66** — do not block Story 55 on it unless trivial.

**Frontend unit tests (classical TDD):** Add or extend **React unit tests in the same phase** as the behavior they
protect—**red–green–refactor** with each slice, not a single test pass at the end of the story. Follow
[Unit Testing (React) — Sapie](../../dev/unit_testing_react_sapie.md) (default **page- or route-level**, **HTTP fakes** at
the boundary). Use **UI drivers / component objects** to reduce brittle selectors when it helps—see the **draft**
[React test component objects](../../dev/draft_unit_testing_react_component_objects.md).

### Phase 0 — Load path, query layer, simple surface, dev-only seed

- [x] **Query keys** — extend `packages/web/src/lib/content/query-keys.ts` (factory pattern, consistent with Story 62):
  `bodySignedUrl(id)`; `noteMarkdown(id)` with **`signedUrl`** in the key **or** a short comment documenting note-only 
  key plus invalidation rules so cache stays correct when URLs rotate or content updates.
- [x] **Content service + hooks** — API methods for `getContentBody`, `putContentBody`, and markdown `fetch`; colocate
      or split files as needed, **one import surface** for callers (e.g. `content-hooks.ts`).
- [x] **Three-step loading on `NoteEditorPage`**
  1. `useContentItem(noteId)` — metadata (existing).
  2. `useContentBody(noteId)` — `GET /api/content/:id/body/signed-url`; **404 → treat as empty body**, not `isError` for the page.
  3. `useNoteBody(...)` — `fetch` markdown from `signedUrl` with `useQuery`; **`enabled: Boolean(signedUrl)`**; when
     there is no body yet, **skip** the bytes fetch and show an empty editor with placeholder.
- [x] **Simple editor** — plain `<textarea>` (or equivalent) for layout and wiring **before** `@mdxeditor/editor` (see **Story 67** for MDXEditor).
- [x] **`staleTime`** for the markdown query: **5 minutes** (strictly less than signed URL **10 minutes**). Refetch
      signed URL + markdown when stale/expired as needed; rely on **invalidation after save** where applicable.
- [x] **Dev-only “Seed body” control** — **retired** (explicit **Save** in Phase 1 replaced it). Historically: dev-gated
      `PUT` with sample markdown to validate load/display before real persistence.
- [x] **OpenAPI / generated client** — regenerate as needed; document that **`bodyUri` is not** on the public metadata
      response; **`size`** (nullable for notes) signals “body exists in Storage.” Align generated typings with the API.
- [x] **React tests** — cover load path, empty body (`404` / no markdown fetch) (per [Frontend unit tests](#implementation-approach-phased) above).

### Phase 1 — Explicit save

- [x] **`PUT` mutation** — `useMutation` (or equivalent) calling `PUT /api/content/:id/body`; **Save** always visible
      while this is the primary persistence path; show **success or error** on save; **clear** the message when the user makes
      new edits.
- [x] **After successful `PUT /body`** — update or invalidate **`contentQueryKeys.item(id)`** for **`size`**,
      **`updatedAt`**, **`bodyMimeType`** (not `bodyUri`); invalidate or update **signed-URL** and **markdown** queries (or
      set markdown cache from the saved string) so the editor does not show stale data.
- [x] **React tests** — explicit save, success/error feedback, cache updates after `PUT` (per [Frontend unit tests](#implementation-approach-phased)).

### Phase 2 — Correctness and dirty state

- [x] **Regression checks** — user can **continue editing after save** and **load a note after save** (bookmark/refresh /
      direct navigation); metadata and body stay consistent with the server.
- [x] **Save enabled only when dirty** (optional refinement once explicit save is stable).
- [x] **React tests** — continue editing after save, reload / direct navigation, dirty-only save if implemented (per
      [Frontend unit tests](#implementation-approach-phased)).

### Phase 3 — Auto-save, unmount flush, save status UI

- [x] **Debounced auto-save** — **5 seconds** after the last change; integrate with the save-state machine below.
- [x] **Unmount / navigation** — cancel debounce; if there are **unsaved local changes**, issue **one immediate save**
      with the same payload as the debounced save.
- [x] **Header save status** — state machine **`idle` | `pending` | `saving` | `saved` | `error`** per the table in
      [Save status](#save-status-single-consistent-behavior); **Retry** on error (immediate `PUT` of current editor content).
- [x] **React tests** — debounce, unmount flush, save-state machine, error + retry; add **fast unit tests** for pure
      helpers where non-trivial (e.g. debounce / save-state logic); not required for thin wrappers (per
      [Frontend unit tests](#implementation-approach-phased)).

### Phase 4 — In-flight saves (single editor)

- [ ] **Serialize or queue** debounced/automatic saves when a `PUT` is already in flight so edits made while saving are
      not lost and the server is not left in an ambiguous state. (This is **not** multi-tab conflict handling; that is
      [Story 65](../3-stories/2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md).)
- [ ] **React tests** — overlapping edits while a save is in flight; no dropped updates (per [Frontend unit tests](#implementation-approach-phased)).

### Phase 5 — Auth boundaries

- [ ] **After login and logout** — invalidate TanStack Query cache so the user sees data for the current session only and
      metadata/bodies are up to date.
- [ ] **React tests** — cache invalidation on auth transitions does not show another user’s data (per [Frontend unit tests](#implementation-approach-phased)).

### Deferred / superseded

- **Rich editor (`@mdxeditor/editor`)** — moved to
  [Story 67: Rich note content editor (MDXEditor)](../3-stories/2-to-refine/67-story-rich_note_content_editor_mdx.md)
  (former “Phase 6” in this file).
- **Nested `body` metadata + TanStack cache policy** —
  [Story 66: Content body subdocument and client cache policy](../3-stories/1-ready/66-story-content_body_subdocument_and_client_cache.md).
- **Concurrent editing / optimistic locking** — follow
  [Story 65: Note Body Concurrency and Conflict Resolution](../3-stories/2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md).

## Acceptance Criteria (Story 55 — textarea + autosave MVP)

- [ ] Opening a note shows its body in the **multiline text editor** (loaded via signed URL → fetch markdown when a body exists).
- [ ] Opening a note with **no body yet** (metadata has **`size` null** and/or **`GET …/body/signed-url` returns 404**) shows an
      empty editor with a placeholder; no error surfaced for “missing body.”
- [ ] Edits auto-save **5 seconds** after the last change (debounce resets on each keystroke/edit).
- [ ] Save status matches the table above (`idle` / `pending` / `saving` / `saved` / `error`).
- [ ] Failed save shows error + Retry; retry issues `PUT` with current content.
- [ ] Direct navigation to `/notes/:id` (refresh or bookmark) loads title/metadata and body correctly.
- [ ] After save, Firestore reflects updated **`bodyUri`** (server-only), **`size`**, and **`updatedAt`**; the API
      metadata response reflects **`size`** / **`updatedAt`** (and **`bodyMimeType`** as applicable); object exists at the
      defined path with correct headers.
- [ ] On unmount/navigation away, pending changes are flushed as specified (no silent drop of dirty state).

**Rich-text editing** (headings, toolbar, code highlighting in the editor UI, etc.) — see
[Story 67](../3-stories/2-to-refine/67-story-rich_note_content_editor_mdx.md).

## Technical Requirements

### Backend

- [x] **Cloud Storage** integrated in the API (Firebase Admin Storage or dedicated wrapper). Local/dev uses the \*
      \*Storage emulator\*\* when configured (`FIREBASE_STORAGE_EMULATOR_HOST`).
- [x] **`PUT /api/content/:id/body`**
  - Request: raw body; **`Content-Type`** sets stored media type (e.g. `text/plain` / `text/markdown` for markdown;
    story originally said `text/plain` only — **shipped** with broader allowed types per `ContentController` /
    `normalizeBodyMimeType`; `multipart/*` → **415**).
  - Validates content exists, user owns it, and item is a **note** (or at least not a directory); **400** if body
    storage is not applicable (e.g. directory).
  - Upload/replace object at `/{ownerId}/content/{contentId}` with **declared** `Content-Type` and
    `Cache-Control: private, max-age=3600`.
  - Update Firestore: `bodyUri` (provider-agnostic object path in the default bucket, e.g. `ownerId/content/noteId`), `size`, `updatedAt`.
  - Response: updated **metadata** DTO only (no inline body).
  - **403** if not owner; **404** if content missing.
- [x] **`GET /api/content/:id/body/signed-url`**
  - Returns **`{ signedUrl: string, expiresAt: string }`** (ISO-8601).
  - **404** if the note has no stored body yet (server: `bodyUri` unset) — client treats as empty document (same
    signal as **`size` null** on metadata).
  - **403** if not owner.
  - Signed URL lifetime **10 minutes**.

## Tasks

Frontend implementation is broken down by **phase** under [Implementation approach](#implementation-approach-phased).

### Backend

- [x] **[BE] Cloud Storage** — wire Admin SDK + emulator support; document env vars in `packages/api/README.md`.
- [x] **[BE] `PUT /api/content/:id/body`** — upload, Firestore update, status codes as above.
- [x] **[BE] `GET /api/content/:id/body/signed-url`** — signed URL + `expiresAt`.
- [x] **[BE] Tests** — classical TDD for new behavior (authz, 404/400 paths, Firestore + storage integration or faked
      storage per project norms).

### Documentation

- [ ] **[DOCS] OpenAPI / API docs** — document `PUT /:id/body` and `GET /:id/body/signed-url` (and clarify `GET /:id` remains
      metadata-only, **without** `bodyUri` on the wire; **already present from Story 62** with the tightened shape above).
- [ ] **[DOCS] `packages/api/README.md`** — Storage emulator and local setup (may overlap Firebase / Storage doc pass).

## Testing

- **API:** unit/integration tests for new endpoints and storage behavior (required per project standards).
- **Web / React:** **classical** unit tests **with each frontend phase** (see [Implementation approach](#implementation-approach-phased) and
  [Unit Testing (React) — Sapie](../../dev/unit_testing_react_sapie.md)); optional [UI drivers (draft)](../../dev/draft_unit_testing_react_component_objects.md).
- **E2E:** **not required** for this story during the MVP
  push ([contributing guidelines](../../dev/contributing_guidelines.md)); optional follow-up later.

## References

- TanStack Query plan and body-vs-metadata split: [
  `docs/research/client_state_management/phase_1_tanstack_query.md`](../../research/client_state_management/phase_1_tanstack_query.md)
- MVP ordering: [`docs/research/mvp_objective.md`](../../research/mvp_objective.md)
- [Story 66 — body subdocument + cache](../3-stories/1-ready/66-story-content_body_subdocument_and_client_cache.md) ·
  [Story 67 — Rich editor (MDXEditor)](../3-stories/2-to-refine/67-story-rich_note_content_editor_mdx.md)
