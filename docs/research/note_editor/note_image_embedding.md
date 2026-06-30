# Note image embedding (research)

**Status:** **Agreed** — domain model and API shape settled (2026-06-26). Storage model simplified to **blobs** (Story 75, 2026-06-29). Implementation via [iterative phases A–G](#iterative-phases-simple--final).

**Stories:**

- [71 — Inline images in notes](../../pm/5-done/71-story-inline_images_in_notes.md) — Phase A skateboard (interim `ContentType.IMAGE`; superseded)
- [74 — Dedicated attachment storage model](../../pm/5-done/74-story-dedicated_attachment_storage_model.md) — subcollection + note-scoped API (**superseded by Story 75**)
- [75 — Blob storage model refactor](../../pm/5-done/75-story-blob_storage_model_refactor.md) — GCS-only, directory-per-content, single-step upload (**current model**)
- [72 — Content body read via SW](../../pm/3-stories/2-to-refine/72-story-content_body_read_via_service_worker.md) (Phases B–E)
- [73 — Uniform reads and orphan cleanup](../../pm/3-stories/2-to-refine/73-story-uniform_body_reads_and_image_orphan_cleanup.md) (Phase F)
- [65 — Note body concurrency](../../pm/3-stories/2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md) — full conflict UX

**Related**

- [MVP objective — attachment model](../../plans/mvp_objective.md) (decks as content children; images as note attachments)
- [Content naming](../../dev/content_naming.md) (content vs attachment vs body)
- [ADR 0002 — note body storage and API](../../adr/0002-note-body-storage-and-api.md) (two-step create, signed read URLs, Storage layout)
- [Story 64 — content deletion](../../pm/3-stories/1-ready/64-story-content_deletion.md) (soft-delete, cascade)
- [Iterative development](../../dev/iterative_development.md)

## Goal

Support **inline images** in the note editor (MDXEditor):

- Pick an image from the device (file picker)
- Paste from clipboard (e.g. screenshots)
- Store each image as a **blob** (whole–part with the note), not as tree **content**
- Keep the **sidebar tree unchanged** — note nodes stay leaves (no expand chevron)

## Domain model: composition vs aggregation

Notes relate to two different kinds of children:

| Child | Relationship | User edits? | Versioning | On note delete |
|-------|-------------|-------------|------------|----------------|
| **Image blob** | **Composition** (whole–part) | No — immutable blob | None | Cascade silently (no extra prompt) |
| **Deck (content child)** | **Aggregation** (container) | Yes — cards change constantly | Note versions do **not** version decks | Block until no deck children, **or** user confirms cascade in delete dialog |

Inline images are **non-editable parts** of the note aggregate. Flashcard decks are **named content children** the user maintains independently. Do not model both the same way.

**Deferred (out of scope for blob refactor):** trash UI, content versioning snapshots, MCP write paths, physical GCS delete. "Delete" below means whatever mechanism we implement later (soft-delete, trash, or hard delete).

## Content hierarchy rules

Only some types may have **content** children (tree / named children). **Blobs** are GCS-only — no Firestore documents, no subcollection.

### Who can be a parent (content tree)

| Parent type | Allowed **content** child types | Notes |
|-------------|--------------------------------|-------|
| `directory` | `directory`, `note` | Tree navigation only |
| `note` | `deck` (future), other named types | **Content** children — Attachments section in note editor, not sidebar |
| `deck` (future) | `card` (future) | Attachment subtree; not in sidebar tree |

### Blobs (not content)

- **Inline images** — GCS objects at `{ownerId}/content/{contentId}/blobs/{blobId}` (12-char nanoid). No Firestore document.
- **Not** `ContentType.IMAGE` in the `content` collection.
- **Not** listed via `GET …/children`.
### Who cannot be a parent

- `card` (future) — leaf
- Blob records — leaf (stored as GCS object only)

### Tree vs blob vs content children

- **Tree children** (sidebar): `directory`, `note` only — `GET /api/content/:id/children`.
- **Content children** (note-owned, named): e.g. `deck` — `GET /api/content/:id/children` when deck ships (same query, filtered by type).
- **Blobs** (note-owned, immutable): GCS-only, no Firestore; loaded by note editor via blob URLs — **not** the children API.
### Explicit non-goals for tree shape

- **No note-under-note** in the folder tree (`POST type: note` → parent must be `directory`).
- **No folder-under-note** (already enforced).

## Blob storage (settled)

### Cloud Storage only — no Firestore

Blobs are stored as immutable objects in GCS, one directory per content:

```text
{ownerId}/content/{contentId}/blobs/{blobId}
```

- **`blobId`** — 12-character nanoid, unique within the content's GCS prefix.
- **`contentId`** — immutable Firestore document ID of the parent note.
- **No Firestore documents** for blobs — no subcollection, no metadata docs, no reconcile.
- **Content-Type** and **Cache-Control** (`private, max-age=31536000, immutable`) set on upload.
- **No reference counting** — blobs removed from markdown leak until note deletion (storage cost only; acceptable for MVP).

### Why GCS-only (not subcollection)

- Single-step upload (POST → 201 with blobId + URL) vs three-step (create → upload → reconcile).
- No Firestore subcollection to sync with GCS state.
- No regex-based markdown parsing on every note save.
- Pre-production — no migration from attachment subcollection needed.
## API (settled)

All routes live under the **`/api/content`** namespace.

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/content/:contentId/blobs` | Upload image bytes → `201 { blobId, url }`. `:contentId` must be type `note`, owned by caller. |
| `GET` | `/api/content/:contentId/blobs/:blobId` | Stream image bytes (200 + `Content-Type`; 404 if not found). Ownership checked via `:contentId`. |
| `DELETE` | `/api/content/:id` | Soft-delete note + cascade-delete all blobs under its GCS prefix. |

**Removed** (Story 75): `POST …/attachments`, `PUT …/attachments/:id/body`, `GET …/attachments/:id/body`, attachment reconcile on `PUT …/body`. `expectedRevision` is **kept** for concurrency control.

### Persisted markdown

After upload, `imageUploadHandler` returns a stable URL embedded in markdown:

```markdown
![alt text](/api/content/{contentId}/blobs/{blobId})
```

Respect `VITE_API_BASE_URL` when not same-origin. Never persist signed URLs in markdown.

### Upload flow

1. Client calls `POST /api/content/:contentId/blobs` with image bytes → receives `{ blobId, url }`.
2. Client inserts the blob markdown URL into the editor; user sees preview via authenticated `fetch` → `blob:` URL.
3. Client autosaves note markdown (which references blob URLs) via `PUT /api/content/:id/body?expectedRevision=...`.

No attachment reconcile step. `expectedRevision` is still sent for concurrency — only the reconcile was removed.
### Orphan handling

Blobs removed from markdown leak until the note is deleted. For MVP, storage cost is negligible. A future orphan sweep (e.g. list GCS prefix, diff against markdown references on save) can be added without schema migration.
## Delete semantics (settled)

| Action | Blobs (images) | Content children (e.g. decks) |
|--------|---------------------|------------------------------|
| Delete **note** | Cascade with note (no extra prompt; GCS prefix deleted after soft-delete) | Block if deck children exist, **or** confirm cascade in dialog |
| Delete **folder** | Cascade with all descendant notes | Cascade entire subtree after user confirms folder delete (includes notes, decks, blobs) |

Cloud Storage cleanup timing follows Story 64 / versioning (soft-delete first; permanent delete deferred).

## Cross-cutting decisions

- **MIME types:** Allow-list on `Content-Type`; byte/MIME pairing validation deferred.
- **Size limits:** 1–2 MB via backend constant on `POST …/blobs`; expose via `GET /api/config` deferred.
- **Sidebar safety:** Notes remain non-expandable leaves; tree `GET …/children` returns `directory` + `note` only (and later named content types like `deck` — **not** blobs).
- **Story 71 interim:** Phase A used `ContentType.IMAGE` and `/api/content/{imageId}/body` — removed in Story 74, replaced by blob model in Story 75.

### Out of scope

- Content versioning / trash UI ([content_versioning.md](../content_versioning.md))
- MCP blob write paths
- Server-side orphan TTL sweeper (`pending` flag)

## What Story 75 replaced

Story 74 introduced an attachment subcollection + 3-step upload + regex reconcile model. Story 75 replaced it with GCS-only blobs: single `POST` upload, no Firestore documents, no reconcile. The domain model (composition vs aggregation, hierarchy rules) is unchanged — only the storage and API mechanism changed.

Story 71's interim `ContentType.IMAGE` model was removed in Story 74. All dev/staging data from both models may be dropped.

## Iterative phases (simple → final)

Notes keep **signed URLs** until **Phase F** (Story 73) migrates note markdown off them.

### Phase A — Images work without Service Worker (skateboard)

**Status:** **Implemented** (Story 75, 2026-06-29). GCS-only blob model + single-step upload.

**Goal:** User can upload/paste an image; it persists and displays after reload.

**Target behaviour after Story 75:**

- `POST /api/content/:contentId/blobs` — single-step upload; `GET …/blobs/:blobId` — stream.
- `PUT /api/content/:id/body` with `expectedRevision` — no attachment reconcile.
- Display: main-thread authenticated `fetch` → **`blob:` URL** for MDXEditor (no Service Worker).
- Upload errors: global snackbar above insert dialog.

**Not in Phase A / 75:** Service Worker, IndexedDB registry, 304, full conflict UX (Story 65), Workbox, versioning, MCP.
### Phase B — Cheap revalidation on the server
- **`ETag`** from `body.updatedAt` and **`If-None-Match` → 304** on `GET …/body` (note bodies and blob bodies).

### Phase C — Service Worker auth proxy only

- Minimal SW: intercept `GET …/body` and `GET …/blobs/…`, inject Bearer token, network-only.

### Phase D — Versioned body cache in Cache Storage

- Cache key `{resourceId}:{bodyUpdatedAt}`; `EVICT_BODY` on successful `PUT`.

### Phase E — Metadata registry in IndexedDB

- Registry keys for note `contentId` and blob ids (or note-scoped blob URL list on open).

### Phase F — Uniform body reads; deprecate client signed URLs (Story 73)

- Notes and blobs use one read path through SW + registry + versioned cache.
- Orphan cleanup already on save (Story 75); Story 73 adds uniform **read** path and note-delete blob cascade with Story 64.

### Phase G — Workbox (optional hardening)

Introduce Workbox only when Phase C–D logic outgrows a maintainable hand-written SW.

## Target architecture (Phases B–F)

### Uniform read path and cost

One route pattern family serves note markdown and blob bytes. Repeat reads must hit SW cache or **304**. Cache key: **`{id}:{body.updatedAt}`**.

### Service Worker (Phase C+)

Intercept **`GET /api/content/:id/body`** and **`GET /api/content/:contentId/blobs/:blobId`**; inject **`Authorization`** via `postMessage`.

### Metadata registry (IndexedDB) — Phase E

- Extend registry to blob URLs. When a note opens, parse markdown for blob URLs and ensure registry entries exist.

## Backend and frontend work (reference)

| Item | Phase / Story |
|------|----------------|
| Blob storage model (GCS-only, single POST, no Firestore) | 75 |
| `expectedRevision` concurrency on `PUT …/body` (no reconcile) | 75 |
| Delete cascade: GCS prefix listing + soft-delete | 75 |
| MDXEditor `imagePlugin` + upload handler (rewire to blob URLs) | 75 |
| `GET …/body` ETag + 304 | B / 72 |
| Service Worker auth proxy (intercept blob URLs) | C / 72 |
| Versioned Cache API | D / 72 |
| IndexedDB metadata registry | E / 72 |
| Uniform note reads; deprecate signed URLs | F / 73 |
| Note/folder delete cascade (blobs + content children rules) | 64 |
| Workbox (optional) | G |
## Risks

- **409 on autosave:** user may lose last edit window; mitigated by short debounce; Story 65 adds explicit recovery UX.
- **Blob upload succeeds, save fails:** blob stays under note GCS prefix until note deletion (cleaned on delete cascade). No client-side cleanup needed.
- **Orphan blobs:** blobs removed from markdown leak until note deletion. For MVP, storage cost is negligible.
- **Function + GCS cost on cache miss (Phase D+):** mitigated by TanStack in-session cache.
- **MDXEditor normalization:** may interact with save-loop concerns ([save_loop observation](./save_loop_after_note_switch_observation.md)).
## Change log

- **2026-06-29:** **Story 75 implemented:** GCS-only blob model; removed attachment subcollection + 3-step upload + regex reconcile; single `POST /api/content/:contentId/blobs`; blob delete cascade on note deletion.

- **2026-06-25:** Initial research; hierarchy rules; cross-cutting decisions.
- **2026-06-25:** Stable body URLs in markdown; uniform read path with SW + versioned cache + 304; iterative phases A–G.
- **2026-06-26:** Phase A implemented (Story 71) with interim `ContentType.IMAGE` model.
- **2026-06-26:** **Story 74 implemented:** attachment subcollection + API; `PUT …/body` with `expectedRevision` + reconcile; removed interim `ContentType.IMAGE`.
