# Story 73: Uniform body reads and image orphan cleanup

## Description

As a user, I want inline images I remove from a note to be cleaned up when the note is saved. As a platform, we want one
body read path for notes and attachments with consistent caching behaviour.

## Details

This story implements **research Phase F**: migrate **note markdown** loads off client signed URLs to `GET …/body`
through the Service Worker + IndexedDB registry + versioned
cache ([Story 72](72-story-content_body_read_via_service_worker.md)),
soft-delete **orphan image** attachments when no longer referenced in note markdown, and extend note deletion cascade
for
image children (building on [Story 64](../1-ready/64-story-content_deletion.md)).

**Research:**

- [Phase F](../../../research/note_editor/note_image_embedding.md#phase-f--uniform-body-reads-deprecate-client-signed-urls)
- [Orphan cleanup](../../../research/note_editor/note_image_embedding.md#orphan-cleanup)

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## Dependencies

- [ ] [Story 72](72-story-content_body_read_via_service_worker.md) — SW auth proxy, versioned cache, IDB registry.
- [ ] [Story 64](../1-ready/64-story-content_deletion.md) — soft-delete fields, filtered GET queries, cascade (required
  before orphan cleanup and attachment cascade can close).

## Acceptance Criteria

- [ ] Opening a note loads markdown via `GET …/body` through the SW (not `GET …/body/signed-url` + direct GCS fetch).
- [ ] Rename-only metadata refetch does not force redundant note body download (same `body.updatedAt` → cache hit or
  304).
- [ ] Removing an embedded image from the editor and autosaving soft-deletes the orphaned `image` content record.
- [ ] Deleting a note soft-deletes its `image` attachment children (when Story 64 is complete).
- [ ] Client no longer calls `GET …/body/signed-url` for note body loads.
- [ ] [ADR 0002](../../../adr/0002-note-body-storage-and-api.md) amended to document the unified client read path.

## Out of scope

- Content versioning / Trash UI ([content_versioning.md](../../../research/content_versioning.md))
- Permanent Cloud Storage deletion of soft-deleted bodies
- Workbox migration (optional follow-up from Story 72 Phase G)
- MIME/type pairing validation on image uploads (deferred from Story 71)
- Separate upload size limits for note bodies vs inline images (deferred from Story 71)
- `GET /api/config` for client-visible limits (deferred from Story 71)

## Technical Requirements

- [ ] Remove signed-url flow from `useNoteBody` / `NoteEditorPage`; use `GET …/body` via SW.
- [ ] On note body save, parse markdown for `/api/content/{id}/body` references; soft-delete unreferenced **image**
  children owned by the user (API shape TBD):
    - Extend `PUT /api/content/:noteId/body` with optional `deleteChildIds` / `retainedChildIds`, **or**
    - Dedicated route (e.g. `PATCH …/attachments`) in the same autosave turn.
- [ ] Orphan API: only ids that are **children of the note**; idempotent on autosave retry; Story 64 soft-delete fields.
- [ ] Story 64 cascade: deleting a note includes attachment `image` children.
- [ ] Amend ADR 0002; regenerate OpenAPI/client if request shape changes.

## Risks

- Autosave retry must not double-delete or fail on already-deleted orphans.
- Story 73 cannot fully close until Story 64 soft-delete foundation ships.

## Tasks

### Backend

- [ ] **[BE] Orphan cleanup API**
    - Implement chosen contract (`deleteChildIds` on body save or attachments patch).
    - Validate parent/ownership; soft-delete via Story 64 mechanism.

- [ ] **[BE] Extend note/folder deletion cascade**
    - Soft-delete `image` attachment children when a note is deleted (Story 64 integration).

- [ ] **[BE] Revisit the "attachments" option of the content API**
    - When implementing story 71, we implemented a new `attachments` option on the content API. Later on we decided to
      change the implementation in a way that the option would no longer be needed, but we decided to keep it because it
      could be useful in this story.
    - Remove the `attachments` option from the content API if it is not useful for this story.

### Frontend

- [ ] **[FE] Migrate note body load to uniform path**
    - Remove signed-url + `fetch(signedUrl)` from note editor load path.
    - Rely on SW + cache + IDB from Story 72.

- [ ] **[FE] Send orphan ids on note body save**
    - Parse markdown; compute removed image child ids; include in save payload.

### Testing

- [ ] **[BE] Tests** for orphan soft-delete rules and cascade with images.
- [ ] **[FE] Tests** for save payload including orphan ids; rename-only load does not re-fetch body bytes.

### Documentation

- [ ] **[DOCS]** ADR 0002 amendment.
- [ ] **[DOCS]** OpenAPI update for orphan cleanup contract.
- [ ] **[DOCS]** Mark Phase F complete
  in [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md).

## References

- [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md)
- [Story 64 — content deletion](../1-ready/64-story-content_deletion.md)
- [ADR 0002 — note body storage and API](../../../adr/0002-note-body-storage-and-api.md)
- [Story 66 — content body cache policy](../../5-done/66-story-content_body_subdocument_and_client_cache.md)
