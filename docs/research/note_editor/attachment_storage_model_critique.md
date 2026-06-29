# Attachment storage model critique

**Status:** Draft — open for discussion.

**Related**

- [Note image embedding research](./note_image_embedding.md) — current spec and iterative phases
- [ADR 0002 — note body storage and API](../../adr/0002-note-body-storage-and-api.md)
- [Story 74 — Dedicated attachment storage model](../../pm/3-stories/1-ready/74-story-dedicated_attachment_storage_model.md)
- [Content naming](../../dev/content_naming.md)

## Current model (as implemented)

```
Upload:  POST /:noteId/attachments → PUT /:id/body → PUT /:noteId/body (save markdown)
Storage: Firestore doc content/{noteId}/attachments/{id} + GCS object {owner}/content/{noteId}/attachments/{id}
Display: GET /:noteId/attachments/:id/body → blob: URL (no SW, no ETag)
Reconcile: regex-parse markdown on PUT /:noteId/body, delete unreferenced Firestore docs + GCS objects
Locking: expectedRevision (body.updatedAt ISO) on PUT /:noteId/body
```

## Problems

### 1. Firestore subcollection is dead weight for immutable blobs

Images are declared immutable ("no user editing", "no versioning"). Every upload creates a Firestore document that stores `mimeType`, `size`, `createdAt`, `updatedAt` — all derivable from GCS object metadata. The subcollection is queried exactly once per note: list all IDs to diff against referenced URLs during reconcile. There is no pagination, sorting, filtering, or multi-note query use case.

The 1 MB document limit argument (from the research doc) does not apply — an embedded array in the note document was never the alternative being weighed. The real choice is between a Firestore doc per attachment and no document at all.

### 2. Reconcile via regex is fragile

`parseReferencedAttachmentIds` scans markdown text for `/api/content/{noteId}/attachments/{id}/body` patterns to decide which attachments are alive. This breaks on:

- URL-encoded characters in the path (`%2F` vs `/`)
- Code blocks or comment sections containing lookalike paths
- Note IDs containing attachment ID-looking segments
- Hard-coded absolute URLs vs relative paths (handled with effort, but fragile)
- Future API path changes or versioned routes

The attachment set should be derived deterministically from the editor session (what was uploaded, inserted, and persisted), not from a text scan.

### 3. Two-step upload adds latency and failure modes

`POST` (create metadata) → `PUT` (upload bytes) → `PUT` (save markdown) is three serial round-trips per image. Each step can fail independently, creating partial state:

| Failure at | Result |
|-----------|--------|
| POST succeeds, PUT body fails | Firestore doc, no GCS object |
| Both succeed, save fails (409 or network) | GCS + Firestore exist, zero markdown references |
| Browser crash between steps | Same as above |

The client attempts cleanup on 409 by deleting staged attachments, but a tab close or crash leaves permanent orphans. The research doc defers a server-side sweeper indefinitely.

### 4. Markdown URL couples images to note identity

`/api/content/{noteId}/attachments/{attachmentId}/body` bakes `noteId` into every image URL. Since `attachmentId` is already globally unique (UUID), the `noteId` in the path is redundant for resolution. Worse, it means:

- **Note move/copy** requires rewriting markdown to update `noteId` in every image reference
- **Orphan ownership** is ambiguous — the URL implies the note owns the image, but the owner is double-encoded in both the path and the GCS key, creating inconsistency risk
- **Deck/card attachments** (future) would need a different URL pattern, when the same storage mechanism should apply

A content-addressed or attachment-only URL (`/api/attachments/{id}/body`) would be simpler and more portable.

### 5. Blob URL preview is a caching dead-end without SW

Every image display triggers a fresh authenticated `GET /:noteId/attachments/:id/body` → `createObjectURL(blob)`. Without ETag (Phase B) or Service Worker (Phase C), this means full re-fetches on every page load. With multiple images in a note, this compounds latency.

The target architecture (Phases B–F) is the right destination: SW intercept → IndexedDB → versioned cache → 304. But the current intermediate state (blob URL + main-thread fetch) adds code that gets entirely replaced by the SW path — the `imagePreviewHandler` with its `inflightDedup` map, `blobCacheForSession` WeakMap, and legacy content body URL fallback is scaffolding destined for removal.

### 6. Upload-before-save contradicts the "immutable blob" premise

If images are immutable and only live/die with the note, they should be stored atomically with the note body. The current flow splits upload from save, creating a window where the image exists in storage but the note doesn't reference it yet — a temporary inconsistency that must be patched over (staged attachment tracking, cleanup on 409, best-effort delete on tab close).

The implementation acknowledges this by tracking "staged" attachments in a ref and attempting cleanup, which is a workaround for a self-inflicted problem.

## Design tensions

The current model treats images as:

- **Immutable content** (no editing, no versioning)
- **Stored independently** (separate Firestore docs, separate GCS objects, separate API routes)
- **Tightly coupled to note lifecycle** (cascade on delete, reconcile on save)
- **Referenced by URL in markdown** (like a remote image)

These four properties conflict. If images are just URL-embedded blobs that die with the note, they don't need independent storage — they can be embedded in the note body (base64 data URIs for small images) or stored as a single compressed bundle. If they need independent storage (for size, performance, future features), then the URL coupling to note identity is wrong, and the lifecycle coupling should be explicit (not regex-derived).

## Paths worth exploring

### A. Embedded model (simplest)

Store small images as data URIs directly in markdown. For larger images, store as opaque blobs in GCS with content-addressed keys (hash-derived), referenced by hash in markdown. No Firestore documents. No subcollections. No reconcile step. GCS lifecycle policies handle orphan cleanup.

```
Upload:  PUT /api/attachments (multipart or stream, returns hash-based ID)
Markdown: ![alt](/api/attachments/{contentHash}/body)
Display: GET /api/attachments/{contentHash}/body (immutable, long-lived cache headers)
Storage: GCS only — {ownerId}/attachments/{contentHash}
Reconcile: none (content-addressed, immutable, can deduplicate)
```

Trade-offs: no per-note lifecycle (orphan cleanup is TTL-based, not note-delete-triggered); duplicate images across notes share the same blob; harder to audit "what images does this note own" without scanning markdown.

### B. Inline-only model (editor-level)

Images exist only within the editor session and are bundled into the note body on save. The server receives a single `multipart/related` or MIME bundle containing markdown + referenced images. No separate attachment API. No subcollection. No orphan cleanup.

```
Upload:  Editor stores images in local state (IndexedDB or memory)
Save:    PUT /:id/body sends markdown + images as a single bundle
Display: Editor resolves images from local state or from parsed bundle on load
Storage: Single GCS object (the bundle)
```

Trade-offs: large notes with many images hit the 2 MB limit sooner; re-fetching a large note for a small edit is wasteful; no caching granularity per image.

### C. Content-addressed model (hash-based, no note coupling)

Images stored by content hash. Markdown references hash. Note ownership is tracked via markdown parse (stateless). No Firestore. No lifecycle coupling — GCS object lifecycle (e.g., delete after 30 days of no references) handles cleanup.

```
Upload:  PUT /api/attachments (returns contentHash)
Markdown: ![alt](/api/attachments/{contentHash}/body)
Display: GET /api/attachments/{contentHash}/body (immutable, Cache-Control: immutable)
Storage: GCS — {ownerId}/attachments/{contentHash}
```

Trade-offs: no per-note ownership record; cleanup requires periodic markdown scan or TTL-based policy; accidental cross-note image sharing possible (could be a feature, not a bug).

### D. Session-atomic model (single-save)

Images uploaded during editing sit in a temporary staging area (e.g., `{ownerId}/staging/{sessionId}/`). On save, the server moves staged blobs to permanent storage and rewrites markdown URLs. No separate create step. No Firestore for images.

```
Upload:  PUT /api/staging/attachments (returns temporaryId, blob at {ownerId}/staging/{sessionId}/{tempId})
         Editor uses temporary blob URLs for preview
Save:    PUT /:id/body sends markdown with temporary URLs + sessionId
         Server: moves blobs from staging → permanent, rewrites URLs in markdown,
                 stores final markdown + permanent URLs
Display: Markdown has permanent URLs pointing to {ownerId}/attachments/{id}
Storage: GCS only (staging + permanent locations)
Reconcile: none (server rewrites atomically on save)
```

Trade-offs: staging area needs TTL cleanup for abandoned sessions; slightly more complex server-side save logic; resolves most orphan and inconsistency problems.

## Open questions

1. What is the maximum image size and count per note we need to support?
2. Does image deduplication across notes matter (e.g., pasting the same screenshot in two notes)?
3. Do we need to know "which images belong to this note" independent of markdown parsing (audit, export, migration)?
4. Should images be shareable/copyable between notes without re-uploading?
5. Is the current append-only blog post storage model (signed URLs, two-step create) a constraint we want to keep for images or is it specific to note body text?

## Change log

- **2026-06-29** — Initial critique based on implementation review of Story 71/74.
