# Note image embedding (research)

**Status:** **Agreed** for implementation via [iterative phases A–G](#iterative-phases-simple--final). **Phase A** scope confirmed (2026-06-25).

**Stories:** [71 — Inline images in notes](../../pm/4-in-progress/71-story-inline_images_in_notes.md) (Phase A) · [72 — Content body read via SW](../../pm/3-stories/2-to-refine/72-story-content_body_read_via_service_worker.md) (Phases B–E) · [73 — Uniform reads and orphan cleanup](../../pm/3-stories/2-to-refine/73-story-uniform_body_reads_and_image_orphan_cleanup.md) (Phase F)

**Related**

- [MVP objective — attachment model](../../plans/mvp_objective.md) (decks/images as children of notes; sidebar folders + notes only)
- [Content naming](../../dev/content_naming.md) (metadata vs content body)
- [ADR 0002 — note body storage and API](../../adr/0002-note-body-storage-and-api.md) (two-step create, signed read URLs, Storage layout)
- [Story 64 — content deletion](../../pm/3-stories/1-ready/64-story-content_deletion.md) (soft-delete, cascade)
- [Iterative development](../../dev/iterative_development.md)

## Goal

Support **inline images** in the note editor (MDXEditor):

- Pick an image from the device (file picker)
- Paste from clipboard (e.g. screenshots)
- Store each image as its own **content** record in Firestore, with **`parentId = noteId`**
- Keep the **sidebar tree unchanged** — note nodes stay leaves (no expand chevron)

## Feasibility

**Yes.** The existing content model (`parentId`, `PUT …/body` for binary payloads, Cloud Storage at `{ownerId}/content/{contentId}`) already supports this. The sidebar already treats notes as leaves regardless of Firestore children. Main work: new `image` content type, parent-type rules, editor upload/render plumbing, upload limits, and (later) orphan cleanup on save.

## Content hierarchy rules

Only some types may have children. This extends the current rule that **folders cannot be created under notes**.

### Who can be a parent

| Parent type | Allowed child types | Notes |
|-------------|---------------------|-------|
| `directory` | `directory`, `note` | Tree navigation only |
| `note` | `image` (now); `deck` and others later | Attachments — **not** shown in sidebar tree |
| `deck` (future) | `card` (future) | Attachment subtree; not in sidebar tree |

### Who cannot be a parent

- `image` — leaf; body is image bytes only
- `card` (future) — leaf

### Tree vs attachment children

- **Tree children** (sidebar): `directory`, `note` only — queried when building the explorer.
- **Attachment children** (note-owned): `image`, future `deck`, etc. — loaded by the note editor, not the sidebar.

### Explicit non-goals for tree shape

- **No note-under-note** in the folder tree. Notes are created only under `directory` parents (enforce on `POST` when `type: note`).
- **No folder-under-note** (already enforced).

## What already exists in the codebase

- **Storage:** `PUT /api/content/:id/body` accepts raw bytes; OpenAPI lists `image/png`, `image/jpeg`; object path `{ownerId}/content/{contentId}` ([`ContentBodyStorageService`](../../../packages/api/src/content/services/content-body-storage.service.ts)).
- **Children query:** `GET /api/content/:id/children` returns all children by `parentId` — no type filter yet.
- **Sidebar:** [`build-content-tree.ts`](../../../packages/web/src/lib/content/build-content-tree.ts) sets `children: undefined` for non-directories; [`ContentExplorer`](../../../packages/web/src/components/ContentExplorer.tsx) only fetches children for expanded **directory** IDs.
- **Editor:** [`RichNoteBodyEditor`](../../../packages/web/src/pages/note-body-editor/RichNoteBodyEditor.tsx) uses MDXEditor without `imagePlugin` yet. `@mdxeditor/editor` supports `imagePlugin` + `imageUploadHandler` for file pick, paste, and drag-and-drop.

## Cross-cutting decisions

- **Deletion:** When [Story 64](../../pm/3-stories/1-ready/64-story-content_deletion.md) lands, deleting a note must soft-delete its attachment children; folder cascade must include descendants’ attachments. Cloud Storage cleanup remains deferred with versioning.
- **MIME types:** Extend server allow-list (e.g. `image/webp`) and/or normalize on client.
- **Size limits:** 1–2 MB via backend constant; expose to client via a config endpoint when the UI needs to validate before upload.
- **Orphans:** Do **not** soft-delete removed images on every keystroke. On **note body save**, the client sends child IDs to remove; the server soft-deletes them in the same operation (see [Orphan cleanup](#orphan-cleanup)). **Deferred to Phase F** (with Story 64); Phase A may leave orphan image records if upload succeeds but note save fails.
- **Sidebar safety:** Keep notes as non-expandable leaves in `build-content-tree`; do not add note IDs to `expandedNodeIds`; filter tree child queries to `directory` + `note` (API or client). Can land with Phase A backend work.

### Out of scope

- **Content versioning** / trash UI ([content_versioning.md](../content_versioning.md)) — design should not block it, but no implementation now.
- **MCP** — attachment model aligns with future `createImage(parentId: noteId)`; details later.

## Iterative phases (simple → final)

Delivery follows [iterative_development.md](../../dev/iterative_development.md) and the [note editor phased example](../../dev/iterative_development_example_note_editor.md): **each phase is a vertical slice**, not a layer that sits unused until the end.

Notes keep **signed URLs** until **Phase F** explicitly migrates them.

### Phase A — Images work without Service Worker (skateboard)

**Status:** **Implemented** (Phase A — Story 71, 2026-06-26).

**Goal:** User can upload/paste an image in a note; it persists and displays after reload.

**Backend**

- `ContentType.IMAGE`; parent validation (`image` under `note`; `note` under `directory` only).
- Upload size limit constant on `PUT …/body`.
- `POST` image metadata + `PUT` image bytes.
- `GET /api/content/:id/body` — **stream only** (200 + `Content-Type`; **no ETag / 304 yet**).

**Frontend**

- `imagePlugin` + upload handler; persist `/api/content/{imageId}/body` in markdown (respect `VITE_API_BASE_URL` when not same-origin).
- **Display:** main-thread authenticated `fetch` to `GET …/body` → **`blob:` URL** for MDXEditor. **No Service Worker.**
- **Notes:** unchanged (signed URL load path).

**Not in Phase A:** Service Worker, IndexedDB registry, 304, orphan cleanup, Workbox, migrating note body off signed URLs.

**Demonstrable:** paste screenshot, save note, reload, image visible; sidebar tree unchanged.

### Phase B — Cheap revalidation on the server

- Add **`ETag`** from `body.updatedAt` and **`If-None-Match` → 304** on `GET …/body` (no GCS read on 304).
- Image display still via main-thread fetch (send `If-None-Match` from TanStack metadata when opening the note).

**Demonstrable:** reload note with images; network tab shows 304s instead of full body streams.

### Phase C — Service Worker auth proxy only

- Minimal SW: intercept `GET …/body`, inject Bearer token, **network-only** (no Cache API).
- Switch MDXEditor to bare markdown URLs (remove blob resolver).
- **Notes:** still signed URLs.

**Demonstrable:** images load via `<img src>` with SW.

### Phase D — Versioned body cache in Cache Storage

- Cache API key: **`{contentId}:{bodyUpdatedAt}`** (from response `ETag`).
- On `PUT …/body` success: **`postMessage` `EVICT_BODY`** + update TanStack metadata.
- Optional: migrate note body load from signed URL to `GET …/body` through SW.

**Demonstrable:** reopen note/images; cache hits for unchanged `body.updatedAt`.

### Phase E — Metadata registry in IndexedDB

- SW reads **`body.updatedAt`** from IDB before body fetch (for bare `<img src>` without `If-None-Match`).
- See [Metadata registry](#metadata-registry-indexeddb).

**Demonstrable:** bare image URLs hit cache using registry without an extra body round-trip.

### Phase F — Uniform body reads; deprecate client signed URLs

- Notes and images use one read path through SW + registry + versioned cache.
- Remove signed-url client flow from `useNoteBody` / `NoteEditorPage`; amend [ADR 0002](../../adr/0002-note-body-storage-and-api.md).
- Orphan cleanup on note save (Story 64 soft-delete when available).

### Phase G — Workbox (optional hardening)

Introduce [Workbox](https://developer.chrome.com/docs/workbox) **only when** Phase C–D logic outgrows a maintainable hand-written SW. See [Workbox vs hand-written SW](#workbox-vs-hand-written-sw).

**Tests:** backend classical tests per phase; frontend tests when SW/cache behaviour is non-trivial.

## Target architecture (Phases B–F)

Phase A uses a subset of this. The sections below describe the **end state** after later phases.

### Persisted markdown

After image upload, `imageUploadHandler` returns a stable URL embedded in markdown:

```markdown
![alt text](/api/content/{imageId}/body)
```

Never persist signed URLs in markdown.

### `GET /api/content/:id/body`

Authenticated read for **any** content body (note markdown or image bytes).

| Phase | Behaviour |
|-------|-----------|
| A | Stream from GCS (200) |
| B+ | **`ETag`** from `body.updatedAt`; **`If-None-Match` → 304** without GCS read; **`Cache-Control: private, no-cache`** (SW owns caching) |

Eventually replaces client **`GET …/body/signed-url`** for all body loads (Phase F). Signed URLs may remain a **server-internal** optimization.

### Uniform read path and cost

One route serves note markdown and images — the SW cannot know the type before fetch. **Do not** use separate “image-only” interception.

Repeat reads must hit the SW cache or return **304**; otherwise streaming every body through Firebase Functions is costlier than today’s note path (signed-url API call + direct GCS fetch). Cache key: **`{contentId}:{bodyUpdatedAt}`**.

### Service Worker (Phase C+)

- Intercept all **`GET /api/content/:id/body`**; inject **`Authorization`** from token via `postMessage` (on login, refresh, and SW `activate`).
- Phase C: network-only. Phase D+: versioned Cache API. Phase E+: IDB lookup before fetch.
- `<img src>` subresource requests do not send Bearer tokens — that is why the SW exists ([intercept-network-call-replace.md](../intercept-network-call-replace.md) `fetch` patching is **not** sufficient).

**Token / cache flow (Phase E+):**

```text
Main thread                          Service Worker / IDB
───────────                          ───────────────────
metadata fetch / PUT success  ──►    IDB bodyVersions upsert
onAuthStateChanged            ──►    postMessage SET_TOKEN
PUT …/body success            ──►    postMessage EVICT_BODY + IDB update
GET …/body                    ──►    IDB lookup → cache[id:etag] or fetch+Authorization
```

No Service Worker exists in the project today — net-new, scoped to `GET …/body`.

**Post-MVP:** server or SW may switch upstream to signed GCS URLs without changing markdown or client URL paths.

## Metadata registry (IndexedDB)

Phase E. Minimal records for SW cache resolution — not a full duplicate of TanStack.

```text
Database: sapie-content-registry (IndexedDB)
Store:    bodyVersions
Key:      contentId
Value:    { bodyUpdatedAt: string | null, mimeType?: string }
```

**Writers (main thread):** write-through from content hooks on metadata fetch/update; when a note opens, parse markdown for `/api/content/{id}/body` and ensure those ids are registered (batch metadata fetch if missing).

**Reader (SW):**

1. Read `bodyUpdatedAt` from IDB for `contentId`.
2. Cache hit on `{contentId}:{bodyUpdatedAt}` → return body.
3. Else fetch with `If-None-Match`; store on 200.
4. **Registry miss:** `GET /api/content/:id` (metadata only) to populate IDB, then retry.

Use **[`idb`](https://github.com/jakearchibald/idb)**; share one module between app and ES-module SW (Vite). Clear IDB on logout (same auth boundary as Story 55 cache invalidation).

## Workbox vs hand-written SW

Use the browser **Cache API** in all cases; Workbox wraps it.

- **Phase A–B:** no SW
- **Phase C:** hand-written SW (~30–50 lines: route match, token, `fetch`)
- **Phase D–E:** evaluate Workbox if cache + IDB logic is hard to test
- **Phase G:** Workbox with custom strategy/plugins **if** the hand-written SW becomes a maintenance burden

[Workbox](https://developer.chrome.com/docs/workbox) helps with routing, strategy plugins, quota, and logging — but auth injection and IDB-backed cache keys still need custom code. Do **not** use precaching or app-shell defaults.

## Orphan cleanup

Deferred to **Phase F** (depends on Story 64 soft-delete).

On note body save, parse markdown for `/api/content/{id}/body` references. Soft-delete attachment child IDs no longer referenced. API shape TBD:

- Extend **`PUT /api/content/:noteId/body`** with optional `deleteChildIds` / `retainedChildIds`, **or**
- Dedicated route (e.g. `PATCH …/attachments`) in the same autosave turn.

Requirements: only ids that are **children of the note** and **owned by the user**; idempotent on autosave retry; align with Story 64 fields (`deleted`, `deletedAt`, `deletedBy`).

## Backend and frontend work (reference)

Summary of work items; **phase column** is the first phase that needs each item.

| Item | Phase |
|------|-------|
| `ContentType.IMAGE`, parent validation, repository | A |
| Size limit constant on `PUT …/body` | A |
| `GET …/body` stream | A |
| `GET …/body` ETag + 304 | B |
| Sidebar `GET …/children` filter (`directory` + `note`) | A |
| MDXEditor `imagePlugin` + upload handler | A |
| Service Worker auth proxy | C |
| Versioned Cache API | D |
| IndexedDB metadata registry | E |
| Uniform reads; deprecate client signed URLs | F |
| Orphan cleanup API | F |
| Workbox (optional) | G |

## Risks

- **Phase A without orphan cleanup:** upload succeeds but note save fails → orphan image record until Phase F.
- **Function + GCS cost on cache miss (Phase D+):** each new `body.updatedAt` streams once; mitigated by TanStack in-session note cache.
- **Auth + SW:** token must stay in sync with Firebase refresh; fallback needed if SW inactive.
- **304:** server must compare `If-None-Match` to Firestore `body.updatedAt` without reading GCS on match.
- **MDXEditor normalization:** image syntax may interact with save-loop concerns ([save_loop observation](./save_loop_after_note_switch_observation.md)).

## Change log

- **2026-06-25:** Initial research; hierarchy rules; cross-cutting decisions.
- **2026-06-25:** Stable `/api/content/:id/body` in markdown; uniform read path with SW + versioned cache + 304; IndexedDB registry; iterative phases A–G; Phase A confirmed (blob display, notes on signed URLs, no SW).
- **2026-06-25:** Doc consolidation — removed duplicate sections, fixed deck hierarchy, aligned all sections with phased delivery.
- **2026-06-26:** Phase A implemented (Story 71): `ContentType.IMAGE`, `GET …/body` stream, 2 MB upload limit, tree children filter, MDXEditor upload + blob preview.
