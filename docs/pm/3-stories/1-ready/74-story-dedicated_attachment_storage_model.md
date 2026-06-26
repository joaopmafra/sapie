# Story 74: Dedicated attachment storage model

## Description

As a platform, we want inline note images stored as **note attachments** (whole–part composition), not as tree
**content**, so the domain model matches how users actually use embedded images and we stop overloading `content.name`
and sibling rules meant for folders, notes, and named children like decks.

## Details

[Story 71](../../5-done/71-story-inline_images_in_notes.md) shipped Phase A using an **interim** model (`ContentType.IMAGE`
content children). Implementation showed that model is awkward: meaningless names, sibling uniqueness, and the wrong
lifecycle (images are immutable parts of the note, not navigable content).

**Settled design** (2026-06-26) — full spec in [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md):

- **Images:** Firestore subcollection `content/{noteId}/attachments/{attachmentId}`; GCS bytes; **composition** with note.
- **Decks:** remain **`content`** children (`parentId = noteId`); **aggregation** — independent lifecycle, block or confirm cascade on note delete.
- **API:** `/api/content/:noteId/attachments`, `/api/content/:noteId/attachments/:attachmentId/body`, markdown URLs
  `/api/content/{noteId}/attachments/{attachmentId}/body`.
- **`PUT /api/content/:noteId/body`:** requires **`expectedRevision`** (`body.updatedAt`); atomically saves markdown and **reconciles** attachments (server parses markdown; deletes unreferenced subcollection docs).
- **Upload-before-save:** `POST` + `PUT` attachment body, then note save; on **409** client deletes staged attachment.
- **No** server `pending`/orphan flag for MVP.

Pre-production — drop interim `ContentType.IMAGE` records in dev/staging; no user migration.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## Dependencies

- [x] [Story 71](../../5-done/71-story-inline_images_in_notes.md) — interim inline images (editor flow to rewire).
- [x] [Story 67](../../5-done/67-story-rich_note_content_editor_mdx.md) — MDXEditor surface.
- [x] [Story 66](../../5-done/66-story-content_body_subdocument_and_client_cache.md) — nested `body` metadata.

## Acceptance Criteria

- [ ] Inline images are **not** stored as `type: image` **content** records (`ContentType.IMAGE` removed from API and web).
- [ ] Attachment metadata lives in **`content/{noteId}/attachments/{attachmentId}`** subcollection with documented fields.
- [ ] `POST /api/content/:noteId/attachments` + `PUT …/attachments/:attachmentId/body` upload flow works; size limit enforced.
- [ ] `GET /api/content/:noteId/attachments/:attachmentId/body` streams bytes with ownership checks.
- [ ] Markdown persists `/api/content/{noteId}/attachments/{attachmentId}/body` (respect `VITE_API_BASE_URL` when not same-origin).
- [ ] After note autosave and reload, embedded images still display (blob preview path unchanged until Story 72).
- [ ] `PUT /api/content/:noteId/body` requires **`expectedRevision`**; returns **409** when stale; saves markdown and reconciles attachments in one operation.
- [ ] Removing an image from markdown and autosaving deletes unreferenced attachment subcollection docs (and GCS objects per current delete policy).
- [ ] On **409**, client deletes any attachment uploaded in the failed save attempt.
- [ ] `GET …/children?attachments=true` removed; tree listing unchanged (folders + notes only).
- [ ] Sidebar tree unchanged — no attachment nodes.

## Out of scope

- Service Worker, ETag/304, IndexedDB registry ([Story 72](../2-to-refine/72-story-content_body_read_via_service_worker.md))
- Uniform note body reads off signed URLs ([Story 73](../2-to-refine/73-story-uniform_body_reads_and_image_orphan_cleanup.md))
- Full conflict UX — reload vs overwrite ([Story 65](../2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md)); MVP snackbar on 409 only
- Note/folder delete UI and cascade ([Story 64](../1-ready/64-story-content_deletion.md))
- Content versioning, trash, MCP, `GET /api/config`, MIME byte validation, separate size limits per type
- Flashcard decks
- Server-side orphan TTL / `pending` flag on attachments

## Technical Requirements

- [ ] Firestore subcollection schema + GCS path `{ownerId}/content/{noteId}/attachments/{attachmentId}` (or amend in PR with ADR note).
- [ ] Remove `ContentType.IMAGE`, image create via `POST /api/content`, and `GET …/children?attachments=true`.
- [ ] `PUT /api/content/:noteId/body` request body includes markdown bytes + **`expectedRevision`**; server reconciles attachments from parsed markdown.
- [ ] Attachment reconcile: only ids under `content/{noteId}/attachments/` owned by caller; idempotent on retry.
- [ ] Regenerate OpenAPI client; update web upload/display handlers and tests.
- [ ] Amend [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md) change log when complete.

## Risks

- Rewiring Story 71 touches API, web, and tests in one vertical slice — keep scope to attachment model + save contract only.
- 409 during autosave may drop unstaged attachment uploads — acceptable for MVP; document in UX copy.

## Tasks

### Backend

- [ ] **[BE] Attachment subcollection + storage**
    - Repository/service for `content/{noteId}/attachments/{attachmentId}` CRUD and GCS read/write.
    - `POST /api/content/:noteId/attachments`, `PUT/GET …/attachments/:attachmentId/body`.
    - Validate `:noteId` is type `note`, owned by caller.
    - Classical controller tests (Storage emulator).

- [ ] **[BE] Note body save with revision + reconcile**
    - Extend `PUT /api/content/:noteId/body` with `expectedRevision` (match `body.updatedAt`).
    - 409 on stale revision; on success update GCS markdown + reconcile attachment subcollection from markdown URLs.
    - Tests: happy path, stale revision, reconcile deletes unreferenced attachment.

- [ ] **[BE] Remove interim image content model**
    - Delete `ContentType.IMAGE`, image branch on `POST /api/content`, `attachments` query param on `GET …/children`.
    - Remove related tests; update OpenAPI descriptions.

### Frontend

- [ ] **[FE] Rewire image upload and display**
    - Point `imageUploadHandler` at `POST …/attachments` + `PUT …/body`; new markdown URL shape.
    - Pass `expectedRevision` on note body autosave from current `body.updatedAt`.
    - On 409: snackbar + delete staged attachment(s) from failed save.
    - Keep blob preview for Phase A display.

- [ ] **[FE] Remove interim client code**
    - Remove `generate-image-content-name`, content-type `image` create path, attachments children query usage.

### Testing

- [ ] **[BE] Tests** for attachment CRUD, revision conflict, reconcile, removal of image content type.
- [ ] **[FE] Tests** for upload handler URL shape, save payload includes revision, 409 cleanup path where practical.

### Documentation

- [ ] **[DOCS]** OpenAPI + generated client for attachment routes and `expectedRevision` on note body PUT.
- [ ] **[DOCS]** [content_naming.md](../../../dev/content_naming.md) attachment vocabulary.
- [ ] **[DOCS]** Mark Story 74 complete in research doc; note Story 71 interim superseded.

## References

- [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md)
- [Story 71 — interim Phase A](../../5-done/71-story-inline_images_in_notes.md)
- [content_naming.md](../../../dev/content_naming.md)
- [MVP objective — attachment model](../../../plans/mvp_objective.md)
