# Note image embedding (research)

**Status:** **Agreed** — domain model and API shape settled (2026-06-26). Implementation via [iterative phases A–G](#iterative-phases-simple--final).

**Stories:**

- [71 — Inline images in notes](../../pm/5-done/71-story-inline_images_in_notes.md) — Phase A skateboard (interim `ContentType.IMAGE`; superseded by Story 74)
- [74 — Dedicated attachment storage model](../../pm/3-stories/1-ready/74-story-dedicated_attachment_storage_model.md) — refactor to subcollection + note-scoped API (**done**)
- [72 — Content body read via SW](../../pm/3-stories/2-to-refine/72-story-content_body_read_via_service_worker.md) (Phases B–E)
- [73 — Uniform reads and orphan cleanup](../../pm/3-stories/2-to-refine/73-story-uniform_body_reads_and_image_orphan_cleanup.md) (Phase F)
- [65 — Note body concurrency](../../pm/3-stories/2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md) — full conflict UX (may overlap revision token with Story 74)

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
- Store each image as a **note attachment** (whole–part with the note), not as tree **content**
- Keep the **sidebar tree unchanged** — note nodes stay leaves (no expand chevron)

## Domain model: composition vs aggregation

Notes relate to two different kinds of children:

| Child | Relationship | User edits? | Versioning | On note delete |
|-------|-------------|-------------|------------|----------------|
| **Image attachment** | **Composition** (whole–part) | No — immutable blob | None | Cascade silently (no extra prompt) |
| **Deck (content child)** | **Aggregation** (container) | Yes — cards change constantly | Note versions do **not** version decks | Block until no deck children, **or** user confirms cascade in delete dialog |

Inline images are **non-editable parts** of the note aggregate. Flashcard decks are **named content children** the user maintains independently. Do not model both the same way.

**Deferred (out of scope for attachment refactor):** trash UI, content versioning snapshots, MCP write paths, physical GCS delete. “Delete” below means whatever mechanism we implement later (soft-delete, trash, or hard delete).

## Content hierarchy rules

Only some types may have **content** children (tree / named children). **Attachments** are a separate Firestore subcollection under notes.

### Who can be a parent (content tree)

| Parent type | Allowed **content** child types | Notes |
|-------------|--------------------------------|-------|
| `directory` | `directory`, `note` | Tree navigation only |
| `note` | `deck` (future), other named types | **Content** children — Attachments section in note editor, not sidebar |
| `deck` (future) | `card` (future) | Attachment subtree; not in sidebar tree |

### Attachments (not content)

- **Inline images** — Firestore subcollection `content/{noteId}/attachments/{attachmentId}`; bytes in Cloud Storage.
- **Not** `ContentType.IMAGE` in the `content` collection.
- **Not** listed via `GET …/children`.

### Who cannot be a parent

- `card` (future) — leaf
- Attachment records — leaf (body is image bytes only)

### Tree vs attachment vs content children

- **Tree children** (sidebar): `directory`, `note` only — `GET /api/content/:id/children`.
- **Content children** (note-owned, named): e.g. `deck` — `GET /api/content/:id/children` when deck ships (same query, filtered by type).
- **Attachments** (note-owned, immutable blobs): subcollection; loaded by note editor / reconcile on save — **not** the children API.

### Explicit non-goals for tree shape

- **No note-under-note** in the folder tree (`POST type: note` → parent must be `directory`).
- **No folder-under-note** (already enforced).

## Attachment storage (settled)

### Firestore

Subcollection under the note document:

```text
content/{noteId}/attachments/{attachmentId}
```

**Attachment document fields (draft):**

- `mimeType`, `size`, `createdAt`, `updatedAt`
- `uri` — internal GCS object key (not exposed on HTTP metadata DTO)

**Attachment id:** globally unique UUID (within owner scope). Markdown references `{noteId}` + `{attachmentId}`.

### Cloud Storage

Object path (draft, amend in Story 74 if needed):

```text
{ownerId}/content/{noteId}/attachments/{attachmentId}
```

Same default bucket as note bodies; provider-agnostic `uri` in Firestore.

### Why subcollection (not embedded array)

- Avoids Firestore 1 MB document limit as attachment count grows.
- Slightly more work than an embedded array, but no migration if metadata grows (dimensions, alt text, future types).
- Pre-production — no migration programme; Story 71 interim `ContentType.IMAGE` records can be dropped.

## API (settled)

All routes live under the **`/api/content`** namespace.

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/content/:noteId/attachments` | Create attachment metadata (`:noteId` must be type `note`, owned by caller) |
| `PUT` | `/api/content/:noteId/attachments/:attachmentId/body` | Upload image bytes; size/MIME limits |
| `GET` | `/api/content/:noteId/attachments/:attachmentId/body` | Authenticated stream (200 + `Content-Type`; ETag/304 in Phase B) |
| `PUT` | `/api/content/:noteId/body` | Save note markdown + **revision check** + **attachment reconcile** (same request) |

**Remove** (Story 74): `ContentType.IMAGE`, `POST /api/content` with `type: image`, `GET …/children?attachments=true`.

### Persisted markdown

After upload, `imageUploadHandler` returns a stable URL embedded in markdown:

```markdown
![alt text](/api/content/{noteId}/attachments/{attachmentId}/body)
```

Respect `VITE_API_BASE_URL` when not same-origin. Never persist signed URLs in markdown.

### Upload-before-save

1. Client `POST …/attachments` then `PUT …/attachments/:id/body` → receives `attachmentId`; user sees preview via blob URL (Phase A) or bare URL (Phase C+).
2. Client autosaves note markdown (references attachment URL) via `PUT …/body` with **`expectedRevision`**.
3. Server atomically: verify revision, write markdown to GCS, update note `body` metadata, **reconcile** attachment subcollection (delete docs — and eventually GCS — not referenced in markdown).

If step 3 returns **409** (stale revision), client deletes the attachment it just uploaded (GCS + subcollection doc). No server `pending` / orphan flag for MVP; add only if production failures warrant it.

### Optimistic locking (`PUT …/body`)

- Client sends **`expectedRevision`** — the `body.updatedAt` ISO string from metadata at load time or last successful save (exact header/body field shape decided in Story 74; align with [Story 65](../../pm/3-stories/2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md) for full conflict UX).
- Server rejects with **409** when stored `body.updatedAt` differs.
- Attachment reconcile runs in the **same** operation as markdown save so body and attachment set stay consistent.

**MVP on conflict:** short autosave debounce limits lost work; surface a snackbar that save failed (full reload/overwrite UX deferred to Story 65).

### Orphan cleanup on save

Server parses markdown for `/api/content/{noteId}/attachments/{attachmentId}/body` (and same-origin absolute variants). Deletes attachment subcollection documents under that note that are **not** referenced. Runs inside the conditional `PUT …/body` — client does **not** send explicit `deleteChildIds` lists.

Idempotent on autosave retry. Unreferenced attachments from failed saves (409) are primarily cleaned by **client** after conflict; reconcile on next successful save catches stragglers.

## Delete semantics (settled)

| Action | Attachments (images) | Content children (e.g. decks) |
|--------|---------------------|------------------------------|
| Delete **note** | Cascade with note (no extra prompt) | Block if deck children exist, **or** confirm cascade in dialog |
| Delete **folder** | Cascade with all descendant notes | Cascade entire subtree after user confirms folder delete (includes notes, decks, attachments) |

Cloud Storage cleanup timing follows Story 64 / versioning (soft-delete first; permanent delete deferred).

## Cross-cutting decisions

- **MIME types:** Allow-list on `Content-Type`; byte/MIME pairing validation deferred.
- **Size limits:** 1–2 MB via backend constant on attachment `PUT …/body`; expose via `GET /api/config` deferred.
- **Sidebar safety:** Notes remain non-expandable leaves; tree `GET …/children` returns `directory` + `note` only (and later named content types like `deck` — **not** attachments).
- **Story 71 interim:** Phase A used `ContentType.IMAGE` and `/api/content/{imageId}/body` — replace in Story 74.

### Out of scope

- Content versioning / trash UI ([content_versioning.md](../content_versioning.md))
- MCP attachment write paths
- Server-side orphan TTL sweeper (`pending` flag)

## What Story 71 shipped (interim — to remove in Story 74)

Story 71 proved the editor flow using **`type: image` content** children (`parentId = noteId`), opaque `content.name`, `GET …/children?attachments=true`, and `/api/content/{imageId}/body`. That implementation is **technical debt**; Story 74 refactors to this document’s model. Dev/staging data may be dropped.

## Iterative phases (simple → final)

Notes keep **signed URLs** until **Phase F** (Story 73) migrates note markdown off them.

### Phase A — Images work without Service Worker (skateboard)

**Status:** **Implemented** (Story 74, 2026-06-26). Subcollection model + revision/reconcile on note save.

**Goal:** User can upload/paste an image; it persists and displays after reload.

**Target behaviour after Story 74:**

- Attachment subcollection + routes above; no `ContentType.IMAGE`.
- `PUT …/body` with `expectedRevision` + attachment reconcile.
- Display: main-thread authenticated `fetch` → **`blob:` URL** for MDXEditor (no Service Worker).
- Upload errors: global snackbar above insert dialog.

**Not in Phase A / 74:** Service Worker, IndexedDB registry, 304, full conflict UX (Story 65), Workbox, versioning, MCP.

### Phase B — Cheap revalidation on the server

- **`ETag`** from `body.updatedAt` and **`If-None-Match` → 304** on `GET …/body` (note bodies and attachment bodies).

### Phase C — Service Worker auth proxy only

- Minimal SW: intercept `GET …/body` and `GET …/attachments/…/body`, inject Bearer token, network-only.

### Phase D — Versioned body cache in Cache Storage

- Cache key `{resourceId}:{bodyUpdatedAt}`; `EVICT_BODY` on successful `PUT`.

### Phase E — Metadata registry in IndexedDB

- Registry keys for note `contentId` and attachment ids (or note-scoped attachment metadata fetch on open).

### Phase F — Uniform body reads; deprecate client signed URLs (Story 73)

- Notes and attachments use one read path through SW + registry + versioned cache.
- Orphan cleanup already on save (Story 74); Story 73 adds uniform **read** path and note-delete attachment cascade with Story 64.

### Phase G — Workbox (optional hardening)

Introduce Workbox only when Phase C–D logic outgrows a maintainable hand-written SW.

## Target architecture (Phases B–F)

### Uniform read path and cost

One route pattern family serves note markdown and attachment bytes. Repeat reads must hit SW cache or **304**. Cache key: **`{id}:{body.updatedAt}`**.

### Service Worker (Phase C+)

Intercept **`GET /api/content/:id/body`** and **`GET /api/content/:noteId/attachments/:attachmentId/body`**; inject **`Authorization`** via `postMessage`.

### Metadata registry (IndexedDB) — Phase E

Extend registry to attachment `body.updatedAt` values. When a note opens, parse markdown for attachment URLs and ensure registry entries exist.

## Backend and frontend work (reference)

| Item | Phase / Story |
|------|----------------|
| Attachment subcollection + API; remove `ContentType.IMAGE` | 74 |
| `PUT …/body` revision + attachment reconcile | 74 |
| Size limit on attachment body upload | 74 |
| `GET …/body` ETag + 304 | B / 72 |
| MDXEditor `imagePlugin` + upload handler | 71 (rewire in 74) |
| Service Worker auth proxy | C / 72 |
| Versioned Cache API | D / 72 |
| IndexedDB metadata registry | E / 72 |
| Uniform note reads; deprecate signed URLs | F / 73 |
| Note/folder delete cascade (attachments + content children rules) | 64 |
| Workbox (optional) | G |

## Risks

- **409 on autosave:** user may lose last edit window; mitigated by short debounce; Story 65 adds explicit recovery UX.
- **Upload succeeds, save conflicts:** client must delete staged attachment; reconcile on next save catches orphans.
- **Function + GCS cost on cache miss (Phase D+):** mitigated by TanStack in-session cache.
- **MDXEditor normalization:** may interact with save-loop concerns ([save_loop observation](./save_loop_after_note_switch_observation.md)).

## Change log

- **2026-06-25:** Initial research; hierarchy rules; cross-cutting decisions.
- **2026-06-25:** Stable body URLs in markdown; uniform read path with SW + versioned cache + 304; iterative phases A–G.
- **2026-06-26:** Phase A implemented (Story 71) with interim `ContentType.IMAGE` model.
- **2026-06-26:** **Story 74 implemented:** attachment subcollection + API; `PUT …/body` with `expectedRevision` + reconcile; removed interim `ContentType.IMAGE`.
