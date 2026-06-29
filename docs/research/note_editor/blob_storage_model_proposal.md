# Blob storage model proposal

**Status:** Draft — pending review.

**Related**

- [Note image embedding research](./note_image_embedding.md) — current spec and iterative phases A–G
- [Attachment storage model critique](./attachment_storage_model_critique.md) — analysis of Story 74 model
- [MVP objective](../../plans/mvp_objective.md) — settled design decisions for attachments vs decks
- [Story 74 — Dedicated attachment storage model](../../pm/3-stories/1-ready/74-story-dedicated_attachment_storage_model.md)
- [Content naming](../../dev/content_naming.md)

## Summary

Replace the Story 74 attachment storage model (Firestore subcollection + multi-step upload + regex reconcile) with a simpler blob storage model: **GCS-only, directory-per-content, no Firestore, no reconcile**. Image blobs are stored under `{ownerId}/content/{contentId}/blobs/{blobId}` in Cloud Storage. The Firestore `content/{noteId}/attachments/{attachmentId}` subcollection and its associated API routes are removed. Note deletion lists the GCS prefix and deletes all objects — no cascade logic, no reference counting.

## Motivation

### Current model (Story 74) — what's wrong

The Story 74 attachment model was identified as over-engineered for immutable image blobs. Six concrete problems:

1. **Firestore subcollection is dead weight.** Every image upload creates a Firestore document (`content/{noteId}/attachments/{id}`) storing `mimeType`, `size`, `createdAt`, `updatedAt` — all derivable from GCS object metadata. The subcollection is queried exactly once per note: to list all IDs during the reconcile step on `PUT /body`. No pagination, sorting, filtering, or multi-note query use case exists.

2. **Regex-based reconcile is fragile.** `parseReferencedAttachmentIds` scans markdown for `/api/content/{noteId}/attachments/{id}/body` patterns to decide which attachments are alive. This breaks on URL-encoded characters, code blocks containing lookalike paths, and future API path changes. The attachment set should be derived deterministically, not from a text scan.

3. **Three-step upload creates failure modes.** POST (create metadata) → PUT (upload bytes) → PUT (save markdown) is three serial round-trips per image. Each step can fail independently, creating partial state: Firestore doc without GCS object, GCS object without markdown reference, browser crash leaving permanent orphans.

4. **URL couples images to note identity.** `/api/content/{noteId}/attachments/{id}/body` bakes `noteId` into every image URL. Since `attachmentId` is already globally unique, the `noteId` is redundant for resolution but harms portability: note move/copy requires rewriting all image markdown.

5. **Blob URL preview is a caching dead-end.** Every image display triggers `GET .../body` → `createObjectURL(blob)`. Full re-fetches on every page load until Service Worker lands (Phases B–F).

6. **Upload-before-save contradicts immutability.** Images are declared immutable and tightly coupled to note lifecycle. The upload-split-from-save flow creates a window where the image exists in storage but the note doesn't reference it — a self-inflicted inconsistency patched by staged attachment tracking and best-effort cleanup.

Full analysis: [attachment_storage_model_critique.md](./attachment_storage_model_critique.md).

### Design principles driving this change

- **Simplicity is the key.** Prefer fewer moving parts. If a Firestore document exists only to duplicate GCS metadata, remove it. If a regex step exists only because we split upload from save, remove the split.
- **Easy to change.** Image URLs in markdown must survive content model evolution. If we change note ID schemes, rename API paths, or restructure content hierarchy, no image markdown should need migration.
- **Immutable blobs don't need metadata.** An image is bytes. Its type, size, and existence are properties of the bytes themselves (GCS object metadata). A separate Firestore document adds nothing.
- **Per-note copies, not shared blobs.** In a single-user study tool, image deduplication across notes is not a design driver. Per-note copies eliminate the need for reference counting and make deletion trivial: list the GCS prefix, delete everything.
- **Storage is cheap, correctness is not.** A leaked orphan blob (image removed from markdown but not deleted from GCS) costs bytes, not data loss. A wrongly deleted blob costs user content. Default to keeping blobs until their owning note is deleted.

## New model

### Storage

```
GCS: {ownerId}/content/{contentId}/blobs/{blobId}
```

- One GCS "directory" (key prefix) per content item that can own blobs.
- `blobId` is a 12-character nanoid, unique within the content's blob directory (not globally unique).
- No Firestore documents for blobs. No subcollection. No metadata table.

### API

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/content/:contentId/blobs` | Upload image bytes. Server generates `blobId`, stores to GCS, returns `{ blobId, url }`. Validates `:contentId` is a note (not directory), owned by caller. |
| `GET` | `/api/content/:contentId/blobs/:blobId` | Stream image bytes. Ownership check via `:contentId` → note → ownerId. Returns 404 if blob doesn't exist. |

### Upload flow

```
Client                                Server
  │                                      │
  │  POST /api/content/:contentId/blobs  │
  │  Content-Type: image/png             │
  │  Body: <bytes>                       │
  │─────────────────────────────────────→│
  │                                      │ 1. Validate contentId is a note, owned by caller
  │                                      │ 2. Generate blobId (12-char nanoid)
  │                                      │ 3. Store GCS: {ownerId}/content/{contentId}/blobs/{blobId}
  │                                      │    with Content-Type + Cache-Control metadata
  │                                      │ 4. Return 201
  │  201 { blobId, url }                 │
  │←─────────────────────────────────────│
  │                                      │
  │  Insert into markdown editor:        │
  │  ![alt](/api/content/{contentId}/    │
  │         blobs/{blobId})              │
  │                                      │
  │  ... autosave persists markdown ...  │
  │  PUT /api/content/:contentId/body    │
  │─────────────────────────────────────→│
```

- One round-trip per image (POST only), not three.
- No Firestore write on upload — GCS only.
- No `expectedRevision` / reconcile step on note body save.
- If autosave fails after upload: blob exists in GCS under the note's prefix but has no markdown reference. It's cleaned up when the note is deleted. Storage leak until then — negligible for MVP.

### Display flow

```
Browser                               Server
  │                                      │
  │  GET /api/content/:contentId/        │
  │      blobs/:blobId                   │
  │─────────────────────────────────────→│
  │                                      │ 1. Validate contentId is owned by caller
  │                                      │ 2. Read GCS object
  │                                      │ 3. Stream with Content-Type from object metadata
  │  200 image/png                       │
  │←─────────────────────────────────────│
```

- Authenticated read (same bearer token as all API calls).
- Service Worker (Phase C+) injects auth token, enabling browser cache.
- No Firestore lookup needed — `contentId` and `blobId` are in the URL.

### Delete flow

When a note is soft-deleted:

```
1. List GCS prefix: {ownerId}/content/{contentId}/blobs/
2. Delete all listed objects (Firebase Admin Storage deleteFiles)
3. Soft-delete the note document (deleted: true, deletedAt: timestamp)
```

- No subcollection cascade — no subcollection exists.
- No reference counting — blobs are per-content copies.
- No markdown parsing — the GCS prefix IS the authoritative list of blobs for this content.
- If GCS delete fails (network error): blob leaks. Note deletion succeeds. Acceptable — storage cost only, no data loss.
- If note delete fails: blobs are already deleted. Unacceptable. **Order matters:** soft-delete the note FIRST, then delete GCS blobs. If GCS deletion fails, blobs leak but the note is recoverable (un-delete).

### What's removed vs Story 74

| Removed | Why |
|---|---|
| `content/{noteId}/attachments/{id}` Firestore subcollection | No blob metadata needed |
| `POST /api/content/:noteId/attachments` (create step) | No create-before-upload |
| `PUT /api/content/:noteId/attachments/:id/body` (upload step) | Replaced by single `POST /api/content/:contentId/blobs` |
| `GET /api/content/:noteId/attachments/:id/body` (display) | Replaced by `GET /api/content/:contentId/blobs/:blobId` |
| `parseReferencedAttachmentIds()` regex reconcile | No reconcile needed |
| `expectedRevision` on `PUT /:id/body` for attachment purposes | No attachment set to version |
| `NoteImageUploadContext` + staged attachment tracking | No partial state — upload is atomic |
| `blobCacheForSession` WeakMap + `inflightDedup` map | Browser cache handles dedup naturally |
| `ContentType.IMAGE` enum value (already removed in Story 74) | Confirmed removed |
| `GET /api/content/:id/children?attachments=true` (already removed) | Confirmed removed |

### Model comparison

| Dimension | Story 74 model | Proposed model |
|---|---|---|
| Upload steps per image | 3 (POST → PUT body → PUT markdown) | 1 (POST) |
| Firestore docs per image | 1 (`content/{noteId}/attachments/{id}`) | 0 |
| Reconcile on note save | Regex parse markdown → diff → delete unreferenced | None |
| Orphan risk | High (3 partial-state windows) | Low (blob always under note's prefix) |
| Orphan from failed save | Blob exists, no markdown reference | Same, but cleaned up on note delete |
| NoteId in display URL | Yes (`/api/content/{noteId}/attachments/{id}/body`) | Yes (`/api/content/{contentId}/blobs/{blobId}`) |
| URL length | ~65 chars | ~55 chars (12-char blobId) |
| Note move impact | Rewrite all image markdown | None (contentId is immutable) |
| Delete cascade | Subcollection query + delete | GCS prefix list + delete |
| Firestore writes per note save | 1 (body) + N (reconcile deletes) | 1 (body only) |
| Server complexity | Medium (reconcile logic, subcollection CRUD) | Low (GCS read/write, prefix list) |
| Client complexity | Medium (staged refs, cleanup-on-409, blob cache) | Low (single POST, browser cache) |

## URL stability

Content IDs in Firestore are immutable — they never change when a note is moved to a different folder. The URL `/api/content/{contentId}/blobs/{blobId}` is therefore stable for the lifetime of the note.

Risk: if the content ID scheme ever changes (e.g., migration to slug-based IDs), all image markdown would need migration. Mitigation: this is a schema migration that would affect all content references, not just images — it would be a deliberate, planned change with a migration script. The current Firestore auto-generated ID scheme is the standard long-term choice.

A compressed alias (`/api/ct/:contentId/b/:blobId`) is deferred. It can be added later as a non-breaking change (both patterns resolve to the same blob) if URL length becomes a pain point.

## Impact on other stories

- **Story 64 (Content deletion):** Simplified — no attachment subcollection cascade. Delete flow is: soft-delete note → list GCS prefix → delete blobs. No blocking for deck children (unchanged from current spec — decks are content children, not blobs).
- **Story 65 (Concurrency):** `expectedRevision` on `PUT /:id/body` becomes a pure concurrency concern — no attachment reconcile tied to it. Can ship independently.
- **Stories 72–73 (Service Worker, uniform reads):** Unchanged. Blob display still goes through authenticated `GET`, which the SW intercepts for auth injection and caching.
- **Flashcard decks (future):** Unaffected. Decks are content children (`parentId = noteId`), not blobs. Blob storage is for immutable image bytes only.
- **MCP server (future):** The blob upload endpoint (`POST /api/content/:contentId/blobs`) provides a clean surface for MCP tools. No multi-step orchestration needed.

## Implementation tasks (Story 75 — TBD)

### Backend

- Add `POST /api/content/:contentId/blobs` endpoint
  - Validate `:contentId` is type `note`, owned by caller
  - Generate 12-char nanoid, check uniqueness within prefix
  - Store to GCS: `{ownerId}/content/{contentId}/blobs/{blobId}`
  - Set `Content-Type` and `Cache-Control` on GCS object
  - Return `{ blobId, url }`
  - Controller tests (Storage emulator)

- Add `GET /api/content/:contentId/blobs/:blobId` endpoint
  - Validate ownership via `:contentId`
  - Stream GCS object → 200, or 404 if not found
  - Controller tests

- Update note delete flow in `ContentService`
  - List GCS prefix `{ownerId}/content/{contentId}/blobs/`
  - Delete all listed objects (after soft-deleting note)
  - Tests for delete cascade

- Remove attachment subcollection code
  - Delete `AttachmentRepository`, `AttachmentService` (or reduce to deck-only concerns)
  - Remove `POST/PUT/GET /api/content/:noteId/attachments/*` routes
  - Remove `parseReferencedAttachmentIds` reconcile from `PUT /:id/body`
  - Remove `expectedRevision` from `PUT /:id/body` (or keep for concurrency, decoupled from attachments)
  - Remove `ContentType.IMAGE` if still referenced
  - Update `ContentModule` providers

- Regenerate OpenAPI client

### Frontend

- Rewire `imageUploadHandler` in `use-note-image-handlers.ts`
  - Replace `POST /api/content/:noteId/attachments` + `PUT .../body` with single `POST /api/content/:noteId/blobs`
  - Remove `NoteImageUploadContext` and staged attachment tracking
  - Remove `blobCacheForSession` and `inflightDedup`
  - Update markdown URL shape to `/api/content/{contentId}/blobs/{blobId}`

- Update `NoteImageInsertDialog` if it references attachment routes

- Remove interim image content code
  - `generate-image-content-name`
  - `sanitize-image-content-name`
  - Any content-type image create paths

- Update `assertImageUploadWithinSizeLimit` if needed (2 MB limit stays)

- Update tests
  - Rewrite `use-note-image-handlers` tests for new upload shape
  - Rewrite `NoteEditorPage` tests that reference attachment routes
  - Add tests for blob URL construction

### Documentation

- Update `note_image_embedding.md` — replace Story 71/74 model with blob model
- Update `content_naming.md` — blob vocabulary
- Update `attachment_storage_model_critique.md` — mark as resolved, link to this proposal
- Update `mvp_objective.md` — attachment model section (if still references Firestore subcollection)
- Regenerate OpenAPI spec and client

### Cleanup

- Delete `AttachmentRepository`, `AttachmentService` (or scope down to deck management)
- Delete `AttachmentDto`, `AttachmentEntity` if only used by removed code
- Delete `parse-attachment-urls-from-markdown.ts` and its test
- Remove `FakeStorageModule` attachment routes if any
- Drop `content/{noteId}/attachments/{id}` data in dev environment (no production migration needed)

## Open questions

1. Should `POST /api/content/:contentId/blobs` accept multipart/form-data (for future file metadata fields) or raw body with Content-Type header? Raw body is simpler for MVP — the Content-Type header directly becomes the GCS object's Content-Type.

2. What `Cache-Control` header on GCS objects? `private, max-age=31536000, immutable` makes sense for content-addressed blobs but current blobs are per-note (not content-addressed). However, blobs are never modified — `immutable` is correct. Browser cache benefits from long max-age even without Service Worker.

3. Should the note delete endpoint (`DELETE /api/content/:id`) also delete blobs, or should blob deletion be a separate operation? Coupling them in one endpoint is simpler — delete note AND its blobs. But the ordering concern (note delete should succeed even if blob delete fails) means they shouldn't be in a batch. Sequential is fine.

## Change log

- **2026-06-29** — Initial proposal based on [attachment_storage_model_critique.md](./attachment_storage_model_critique.md) and design discussion.
