# Story 75: Blob storage model refactor

## Epic Reference

- [Epic 45: Content Management Foundation](../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../2-features/1-ready/47-feature-note_editing_and_management.md)

## Description

Replace the Story 74 attachment storage model (Firestore subcollection + multi-step upload + regex reconcile) with a simpler blob storage model: GCS-only, directory-per-content, no Firestore, no reconcile.

## Details

The Story 74 attachment model is over-engineered for immutable image blobs. Images are uploaded in 3 serial steps (POST create → PUT body → PUT markdown), stored with a Firestore subcollection that duplicates GCS metadata, and reconciled via fragile regex parsing on every note save. A simpler model exists: one GCS directory per content, one-step upload, no Firestore, no reconcile.

Full design rationale and trade-off analysis: [blob_storage_model_proposal.md](../../research/note_editor/blob_storage_model_proposal.md).

### New model

```
Storage: GCS {ownerId}/content/{contentId}/blobs/{blobId}

Upload:  POST /api/content/:contentId/blobs → 201 { blobId, url }
Display: GET  /api/content/:contentId/blobs/:blobId → 200 image/png | 404
Delete:  On note delete: list GCS prefix → delete all objects → soft-delete note
```

- `blobId` is a 12-character nanoid, unique within the content's GCS prefix.
- No Firestore documents for blobs. No reconcile step on note save.
- Delete: list the GCS prefix, delete all objects. Soft-delete the note first (so blob deletion failure doesn't block note deletion).
- Orphan on failed save: blob stays under note's prefix until note deletion. Acceptable for MVP.

### What's removed

- `content/{noteId}/attachments/{id}` Firestore subcollection
- `POST /api/content/:noteId/attachments` (create step)
- `PUT /api/content/:noteId/attachments/:id/body` (upload step)
- `GET /api/content/:noteId/attachments/:id/body` (display)
- `parseReferencedAttachmentIds()` regex reconcile
- `expectedRevision` on `PUT /:id/body` for attachment purposes (keep only for concurrency if needed by Story 65)
- `NoteImageUploadContext` + staged attachment tracking on client
- `blobCacheForSession` WeakMap + `inflightDedup` map on client

## Dependencies

- [x] [Story 71](../../5-done/71-story-inline_images_in_notes.md) — interim inline images (to rewire)
- [x] [Story 74](../../5-done/74-story-dedicated_attachment_storage_model.md) — current model (to replace)
- [x] [Story 67](../../5-done/67-story-rich_note_content_editor_mdx.md) — MDXEditor surface
- [x] [Story 66](../../5-done/66-story-content_body_subdocument_and_client_cache.md) — nested `body` metadata

## Acceptance Criteria

- [ ] `POST /api/content/:contentId/blobs` stores image bytes to GCS `{ownerId}/content/{contentId}/blobs/{blobId}` with correct Content-Type and Cache-Control.
- [ ] `POST /api/content/:contentId/blobs` returns 404 if `:contentId` is not a note (e.g. directory), 403 if not owner.
- [ ] `GET /api/content/:contentId/blobs/:blobId` streams image bytes; 404 if blob doesn't exist.
- [ ] Note deletion lists GCS prefix and deletes all blobs (after soft-deleting the note).
- [ ] Markdown embeds `/api/content/{contentId}/blobs/{blobId}` URLs (not attachment URLs).
- [ ] Images display correctly after upload → insert → save → reload.
- [ ] All attachment subcollection code is removed: `AttachmentService`, `AttachmentRepository`, `AttachmentEntity`, `AttachmentDto`, `parse-attachment-urls-from-markdown`, attachment routes.
- [ ] `expectedRevision` removed from `PUT /:id/body` (or kept only for concurrency, decoupled from attachments).
- [ ] No `ContentType.IMAGE` references remain.
- [ ] OpenAPI client regenerated.

## Out of scope

- Service Worker caching (Stories 72–73)
- ETag / 304 (Story 72 Phase B)
- `GET /api/config` (separate story)
- MIME byte validation
- Compressed URL alias (`/api/ct/...`)
- Orphan sweep for blobs uploaded but never referenced in markdown (deferred — cleaned on note delete)

## Technical Requirements

### Backend

- [ ] Add `POST /api/content/:contentId/blobs` to `ContentController`
  - Validate `:contentId` is note type, owned by caller
  - Generate 12-char nanoid blobId
  - Store to GCS at `{ownerId}/content/{contentId}/blobs/{blobId}`
  - Set `Content-Type` from request header; `Cache-Control: private, max-age=31536000, immutable`
  - Return `{ blobId, url }`

- [ ] Add `GET /api/content/:contentId/blobs/:blobId` to `ContentController`
  - Validate ownership via `:contentId`
  - Stream GCS object; 404 if not found

- [ ] Update note delete in `ContentService.deleteContent()`
  - List GCS prefix `{ownerId}/content/{contentId}/blobs/`
  - Delete all listed objects
  - (Soft-delete the note first — blob delete failure shouldn't block note delete)

- [ ] Remove all attachment code
  - Delete `AttachmentService`, `AttachmentRepository`, `Attachment`, `AttachmentDocument`, `AttachmentResponse`
  - Remove attachment routes from `ContentController`
  - Remove attachment fixture methods from `ContentControllerFixture`
  - Remove `parseReferencedAttachmentIds` and its test
  - Remove attachment bodyParser route from `ContentModule`
  - Remove attachment providers from `ContentModule`

- [ ] Clean up `PUT /api/content/:id/body`
  - Remove `expectedRevision` parameter and validation (or keep for concurrency, decoupled from attachments)
  - Remove `reconcileAttachmentsFromMarkdown` call

- [ ] Regenerate OpenAPI client

### Frontend

- [ ] Rewire `imageUploadHandler` in `use-note-image-handlers.ts`
  - Replace `POST /api/content/:noteId/attachments` + `PUT .../body` with single `POST /api/content/:noteId/blobs`
  - Remove `NoteImageUploadContext`, `StagedAttachment`, `stagedAttachmentsRef`, `clearStagedAttachments`
  - Remove `blobCacheForSession` / `blobUrlCacheRef` / `inflightDedup` (browser cache handles dedup)
  - Update `seedPreviewCache` to work with blob URL shape
  - Update markdown URL to `/api/content/{contentId}/blobs/{blobId}`

- [ ] Update `imagePreviewHandler` in `use-note-image-handlers.ts`
  - Update URL parsing to match new blob URL shape
  - Keep main-thread authenticated `fetch` → `blob:` URL for MVP (SW caching in Stories 72–73)

- [ ] Remove interim image code
  - `generate-image-content-name` — if still present
  - `sanitize-image-content-name` — if still present
  - Any remaining `ContentType.IMAGE` references

- [ ] Update `contentService` frontend
  - Replace `createAttachment`/`putAttachmentBody` with `uploadBlob(contentId, file)`
  - Remove `deleteAttachment` if present

### Testing

- [ ] **[BE] Controller tests** for `POST /api/content/:contentId/blobs`
  - Happy path: upload → 201 with blobId and url
  - Validates content type is note (not directory)
  - 403 if not owner; 404 if content not found
  - 415 if unsupported media type

- [ ] **[BE] Controller tests** for `GET /api/content/:contentId/blobs/:blobId`
  - Happy path: stream bytes with correct Content-Type
  - 404 if blob doesn't exist
  - 403 if not owner

- [ ] **[BE] Controller tests** for note delete cascade
  - Note with blobs: blobs deleted from GCS, note soft-deleted
  - Note with no blobs: note soft-deleted, no errors

- [ ] **[FE] Tests** for `useNoteImageHandlers`
  - `imageUploadHandler` calls `POST /api/content/:noteId/blobs`
  - Returns correct markdown URL shape
  - Removes staged attachment tracking

- [ ] **[FE] Tests** for `NoteEditorPage`
  - Update tests that reference attachment routes
  - Image display after upload → save → reload

### Documentation

- [ ] Update `note_image_embedding.md` — replace Story 71/74 model with blob model
- [ ] Update `content_naming.md` — replace attachment vocabulary with blob vocabulary
- [ ] Update `mvp_objective.md` — attachment model section
- [ ] Update `ADR 0002` if it references attachment subcollection routes
- [ ] Mark `attachment_storage_model_critique.md` as resolved
- [ ] Update `blob_storage_model_proposal.md` status to accepted
- [ ] Update `blob_storage_model_review_and_road_ahead.md` with decision note

### Cleanup

- [ ] Drop `content/{noteId}/attachments/{id}` data in dev environment (no production migration)
- [ ] Remove `AttachmentService`, `AttachmentRepository`, `AttachmentEntity`, `AttachmentDto`
- [ ] Remove `parse-attachment-urls-from-markdown.ts` and its spec
- [ ] Remove `attachment-body-url.ts` frontend utility (or reduce to blob URL parsing)
- [ ] Remove `FakeStorageModule` attachment helpers if any
- [ ] Remove `NoteImageUploadContext` and `StagedAttachment` type

## References

- [Blob storage model proposal](../../research/note_editor/blob_storage_model_proposal.md)
- [Attachment storage model critique](../../research/note_editor/attachment_storage_model_critique.md)
- [Blob storage model — review and road ahead](../../research/note_editor/blob_storage_model_review_and_road_ahead.md)
- [Note image embedding research](../../research/note_editor/note_image_embedding.md)
- [MVP objective](../../plans/mvp_objective.md)
