# Story 71: Inline images in notes

## Description

As a user, I want to insert images into my notes (from a file or clipboard paste) so that my study material can include
screenshots and diagrams inline with text.

## Details

- Each embedded image is stored as its own **content** record (`type: image`) with **`parentId = noteId`** — an
  attachment child of the note, not a sibling in the folder tree.
- The sidebar tree continues to show **folders and notes only**; note nodes stay leaves (no expand chevron).
- This story delivers **research Phase A** only: images work end-to-end **without** a Service Worker, without 304/ETag,
  without orphan cleanup on save, and **without** changing how note markdown bodies are loaded (signed URLs unchanged).

**Research:** [note_image_embedding.md — Phase A](../../research/note_editor/note_image_embedding.md#phase-a--images-work-without-service-worker-skateboard)

## Epic Reference

- [Epic 45: Content Management Foundation](../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../2-features/1-ready/47-feature-note_editing_and_management.md)

## Dependencies

- [x] [Story 67](../5-done/67-story-rich_note_content_editor_mdx.md) — MDXEditor is the note body surface.
- [x] [Story 66](../5-done/66-story-content_body_subdocument_and_client_cache.md) — stable nested `body` metadata and
  TanStack cache policy.
- [x] [Story 62](../5-done/62-story-tanstack_query_refactor.md) — targeted query invalidation patterns.

## Acceptance Criteria

- [x] User can pick an image file from the device and see it inline in the rich note editor.
- [x] User can paste a screenshot from the clipboard and see it inline in the rich note editor.
- [x] Each image is stored as `image` content with `parentId = noteId`; bytes persist via `PUT /api/content/:id/body`.
- [x] Markdown persists a stable path `/api/content/{imageId}/body` (respect `VITE_API_BASE_URL` when not same-origin).
- [x] After note autosave and page reload, embedded images still display.
- [x] Sidebar tree is unchanged: no image nodes, notes remain non-expandable leaves.
- [x] Upload over the configured size limit (1–2 MB backend constant) is rejected with a clear error.
- [x] `POST` with `type: image` under a folder (non-note parent) is rejected.
- [x] `POST` with `type: note` under a note parent is rejected (close note-under-note gap).

## Out of scope (later stories)

- Service Worker, IndexedDB metadata registry, ETag/304 ([Story 72](../3-stories/2-to-refine/72-story-content_body_read_via_service_worker.md))
- Uniform note body reads; deprecating client signed URLs ([Story 73](../3-stories/2-to-refine/73-story-uniform_body_reads_and_image_orphan_cleanup.md))
- Orphan image cleanup when removed from markdown ([Story 73](../3-stories/2-to-refine/73-story-uniform_body_reads_and_image_orphan_cleanup.md))
- Workbox, content versioning, MCP

## Technical Requirements

- [x] Add `ContentType.IMAGE` on API and web; extend OpenAPI/client (`image` enum patched; run `pnpm generate:api-client` with API up for full regen including `GET …/body`).
- [x] `POST /api/content` with `type: image`, `parentId: noteId` — parent must be a `note` owned by the caller.
- [x] Enforce `type: note` → parent must be `directory`.
- [x] Upload size limit via backend constant on `PUT …/body`; reject oversize with clear 4xx.
- [x] `GET /api/content/:id/body` — authenticated stream from GCS (200 + `Content-Type`); **no ETag/304 in this story**.
- [x] Filter tree `GET …/children` to `directory` + `note` only (API or client).
- [x] MDXEditor `imagePlugin` + `InsertImage`; upload flow: `POST` image → `PUT` bytes → insert markdown URL → note autosave.
- [x] Display: main-thread authenticated `fetch` to `GET …/body` → `blob:` URL for the editor (**no Service Worker**).

## Risks

- Upload succeeds but note save fails → orphan `image` content until [Story 73](../3-stories/2-to-refine/73-story-uniform_body_reads_and_image_orphan_cleanup.md)
  (accepted for Phase A).
- Image markdown syntax may interact with autosave normalization ([save loop observation](../../research/note_editor/save_loop_after_note_switch_observation.md)).

## Tasks

### Backend

- [x] **[BE] Content type and parent validation**
    - Add `ContentType.IMAGE`; repository helper to create image metadata (`body: null` until first `PUT`).
    - Validate `image` under `note`; validate `note` under `directory` only.
    - Classical controller tests (Storage emulator).

- [x] **[BE] Body read stream and upload limit**
    - Implement `GET /api/content/:id/body` (ownership checks, stream from GCS, `Content-Type` from `body.mimeType`).
    - Size limit constant on `PUT …/body`; extend allowed image MIME types as needed (e.g. `image/webp`).

- [x] **[BE] Tree-safe children listing**
    - Filter `GET …/children` for sidebar to `directory` + `note` (or equivalent query parameter).

### Frontend

- [x] **[FE] Image upload in MDXEditor**
    - Add `imagePlugin`, `InsertImage`, and `imageUploadHandler` in `RichNoteBodyEditor`.
    - Wire create + `PUT` body; insert `/api/content/{imageId}/body` into markdown; existing autosave saves note body.

- [x] **[FE] Image display (Phase A)**
    - Resolve embedded image URLs via authenticated fetch → blob URL when rendering note markdown.
    - Do not register a Service Worker in this story.

### Testing

- [x] **[BE] Tests** for image create, parent rules, size limit, and `GET …/body` stream.
- [x] **[FE] Tests** for upload handler integration where practical (or smoke test on rich editor path).

### Documentation

- [x] **[DOCS]** OpenAPI / generated client for `image` type and `GET …/body`.
- [x] **[DOCS]** Cross-link [note_image_embedding.md](../../research/note_editor/note_image_embedding.md) Phase A as implemented.

## References

- [note_image_embedding.md](../../research/note_editor/note_image_embedding.md)
- [MVP objective — attachment model](../../plans/mvp_objective.md)
- [Content naming](../../dev/content_naming.md)
- [Iterative development](../../dev/iterative_development.md)
