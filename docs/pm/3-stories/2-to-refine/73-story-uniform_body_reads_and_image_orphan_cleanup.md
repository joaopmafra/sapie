# Story 73: Uniform body reads and image orphan cleanup

## Description

As a platform, we want one body read path for **note markdown** and **attachment image bytes** with consistent caching
behaviour. Attachment orphan cleanup on save is implemented in [Story 74](../1-ready/74-story-dedicated_attachment_storage_model.md);
this story focuses on **uniform reads** and delete cascade integration with [Story 64](../1-ready/64-story-content_deletion.md).

## Details

This story implements **research Phase F**: migrate **note markdown** loads off client signed URLs to `GET …/body`
through the Service Worker + IndexedDB registry + versioned
cache ([Story 72](../2-to-refine/72-story-content_body_read_via_service_worker.md)),
and extend note/folder deletion to cascade **attachment** subcollection docs (building on Story 64).

**Orphan cleanup on save** (parse markdown, reconcile attachment subcollection) is **Story 74**, not this story.

**Research:**

- [Phase F](../../../research/note_editor/note_image_embedding.md#phase-f--uniform-body-reads-deprecate-client-signed-urls-story-73)
- [Delete semantics](../../../research/note_editor/note_image_embedding.md#delete-semantics-settled)

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## Dependencies

- [ ] [Story 72](../2-to-refine/72-story-content_body_read_via_service_worker.md) — SW auth proxy, versioned cache, IDB registry.
- [ ] [Story 74](../1-ready/74-story-dedicated_attachment_storage_model.md) — attachment subcollection model and reconcile on save.
- [ ] [Story 64](../1-ready/64-story-content_deletion.md) — soft-delete fields, filtered GET queries, cascade.

## Acceptance Criteria

- [ ] Opening a note loads markdown via `GET …/body` through the SW (not `GET …/body/signed-url` + direct GCS fetch).
- [ ] Embedded images load via `GET …/attachments/:attachmentId/body` through the SW (not blob URLs).
- [ ] Rename-only metadata refetch does not force redundant note body download (same `body.updatedAt` → cache hit or 304).
- [ ] Deleting a note soft-deletes its **attachment** subcollection documents (Story 64 integration).
- [ ] Deleting a folder soft-deletes all descendant notes, their attachments, and content children after user confirmation.
- [ ] Client no longer calls `GET …/body/signed-url` for note body loads.
- [ ] [ADR 0002](../../../adr/0002-note-body-storage-and-api.md) amended to document the unified client read path.

## Out of scope

- Attachment reconcile on save ([Story 74](../1-ready/74-story-dedicated_attachment_storage_model.md))
- Content versioning / Trash UI ([content_versioning.md](../../../research/content_versioning.md))
- Permanent Cloud Storage deletion of soft-deleted bodies
- Workbox migration (optional follow-up from Story 72 Phase G)
- MIME/type pairing validation on image uploads (deferred from Story 71)
- Separate upload size limits for note bodies vs inline images (deferred from Story 71)
- `GET /api/config` for client-visible limits (deferred from Story 71)
- Deck delete guard UX on note delete (Story 64)

## Technical Requirements

- [ ] Remove signed-url flow from `useNoteBody` / `NoteEditorPage`; use `GET …/body` via SW for notes.
- [ ] SW intercepts note `GET …/body` and attachment `GET …/attachments/:id/body`.
- [ ] Story 64 cascade: deleting a note soft-deletes all documents in `content/{noteId}/attachments/`.
- [ ] Amend ADR 0002; regenerate OpenAPI/client if needed.

## Risks

- Story 73 cannot fully close until Story 64 soft-delete foundation ships.
- SW must register attachment URL pattern alongside note body URLs.

## Tasks

### Backend

- [ ] **[BE] Extend note/folder deletion cascade**
    - Soft-delete attachment subcollection documents when a note is deleted (Story 64 integration).
    - Folder recursive delete includes attachments under all descendant notes.

### Frontend

- [ ] **[FE] Migrate note body load to uniform path**
    - Remove signed-url + `fetch(signedUrl)` from note editor load path.
    - Remove blob URL resolver for images; rely on SW + bare markdown URLs from Story 72.

### Testing

- [ ] **[BE] Tests** for attachment cascade on note/folder delete.
- [ ] **[FE] Tests** for rename-only load does not re-fetch body bytes.

### Documentation

- [ ] **[DOCS]** ADR 0002 amendment.
- [ ] **[DOCS]** Mark Phase F complete in [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md).

## References

- [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md)
- [Story 74 — attachment storage model](../1-ready/74-story-dedicated_attachment_storage_model.md)
- [Story 64 — content deletion](../1-ready/64-story-content_deletion.md)
- [ADR 0002 — note body storage and API](../../../adr/0002-note-body-storage-and-api.md)
- [Story 66 — content body cache policy](../../5-done/66-story-content_body_subdocument_and_client_cache.md)
