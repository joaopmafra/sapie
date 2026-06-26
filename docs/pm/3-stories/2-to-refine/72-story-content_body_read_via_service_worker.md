# Story 72: Content body read via Service Worker

## Description

As a platform, we need authenticated, cache-friendly reads of content bodies so that embedded images can use
`<img src="/api/content/:id/body">` without blob URLs and repeat loads avoid unnecessary API→GCS streams.

## Details

This story implements **research Phases B–E**: server revalidation (304), Service Worker auth proxy, versioned Cache
Storage, and an IndexedDB metadata registry. **Note markdown** may optionally migrate to `GET …/body` through the SW in
Phase D; full deprecation of client signed URLs is **[Story 73](73-story-uniform_body_reads_and_image_orphan_cleanup.md)**.

**Research:**

- [Phases B–E](../../../research/note_editor/note_image_embedding.md#iterative-phases-simple--final)
- [Target architecture](../../../research/note_editor/note_image_embedding.md#target-architecture-phases-bf)
- [Metadata registry (IndexedDB)](../../../research/note_editor/note_image_embedding.md#metadata-registry-indexeddb)

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## Dependencies

- [ ] [Story 71](../../4-in-progress/71-story-inline_images_in_notes.md) — images already use `GET …/body` and stable markdown URLs.

## Implementation approach (phased)

Deliver in order; each sub-phase should remain demonstrable.

### Phase B — Server revalidation

- `ETag` from `body.updatedAt` on `GET …/body`.
- `If-None-Match` → **304 Not Modified** without GCS read.
- `Cache-Control: private, no-cache` (SW owns client caching).

### Phase C — Service Worker auth proxy

- Register minimal SW: intercept `GET …/body`, inject Bearer token via `postMessage` (login, token refresh, SW `activate`).
- Network-only (no Cache API yet).
- Switch image display from blob URLs to bare markdown URLs in MDXEditor.

### Phase D — Versioned Cache Storage

- Cache API key `{contentId}:{bodyUpdatedAt}` (from response `ETag`).
- `postMessage` `EVICT_BODY` on successful `PUT …/body`; update TanStack metadata.
- Optional: migrate note body load to `GET …/body` through SW (may defer to Story 73).

### Phase E — IndexedDB metadata registry

- Database `sapie-content-registry`, store `bodyVersions` (`contentId` → `{ bodyUpdatedAt, mimeType? }`).
- Write-through from content hooks; parse note markdown for image ids on note open.
- SW reads IDB before body fetch for bare `<img src>` requests.
- Clear registry on logout.

### Phase G (optional, same story)

- Migrate hand-written SW to [Workbox](https://developer.chrome.com/docs/workbox) **only if** maintenance cost warrants it.

## Acceptance Criteria

- [ ] **B:** Reloading a note with unchanged images yields **304** for applicable `GET …/body` requests (network tab).
- [ ] **C:** Images render via `<img src="/api/content/:id/body">` with SW registered; blob URL resolver removed.
- [ ] **C:** SW receives token updates on login and Firebase token refresh.
- [ ] **D:** Reopening a note with unchanged image `body.updatedAt` serves bodies from SW cache (no full stream).
- [ ] **E:** Bare image URLs resolve cache using IDB `bodyUpdatedAt` without a version in markdown.
- [ ] Dev ergonomics documented (SW registration in dev, stale SW avoidance).
- [ ] Documented fallback if SW is unavailable.

## Out of scope

- Deprecating signed URLs for **note markdown** loads ([Story 73](73-story-uniform_body_reads_and_image_orphan_cleanup.md))
- Orphan image cleanup on note save ([Story 73](73-story-uniform_body_reads_and_image_orphan_cleanup.md))
- ADR 0002 amendment ([Story 73](73-story-uniform_body_reads_and_image_orphan_cleanup.md))

## Technical Requirements

- [ ] Server compares `If-None-Match` to Firestore `body.updatedAt` without reading GCS on match.
- [ ] SW intercepts **all** `GET /api/content/:id/body` (single route for note markdown and images — no image-only hack).
- [ ] Cache key `{contentId}:{bodyUpdatedAt}`; evict stale entries per content id on body update.
- [ ] Use [`idb`](https://github.com/jakearchibald/idb); share registry module between app and ES-module SW (Vite).
- [ ] Do not use Workbox precaching or app-shell defaults.

## Risks

- Firebase token handoff to SW must stay in sync; SW inactive breaks `<img src>` unless fallback exists.
- Same URL for note markdown and images — one cache policy versioned by `updatedAt`, not by `Content-Type` alone.

## Tasks

### Backend (Phase B)

- [ ] **[BE] ETag and 304 on `GET …/body`**
    - Set `ETag` from `body.updatedAt`; handle `If-None-Match`.
    - Classical tests for 200 stream vs 304.

### Frontend (Phases C–E)

- [ ] **[FE] Service Worker registration and token handoff**
    - Register after auth; `postMessage` on login/refresh/`activate`.
    - Intercept `GET …/body`; inject `Authorization`.

- [ ] **[FE] Remove blob URL image resolver** (Phase C)
    - MDXEditor uses bare `/api/content/{id}/body` in markdown and DOM.

- [ ] **[FE] Versioned Cache API** (Phase D)
    - Cache on `{contentId}:{etag}`; `EVICT_BODY` on `PUT …/body` success.

- [ ] **[FE] IndexedDB metadata registry** (Phase E)
    - Write-through from content hooks; SW read path; clear on logout.

- [ ] **[FE] Optional Workbox migration** (Phase G)
    - Only if hand-written SW becomes hard to maintain.

### Testing

- [ ] **[BE] Tests** for 304 path.
- [ ] **[FE] Tests** for SW/cache where practical; manual checklist for `<img src>` + token refresh.

### Documentation

- [ ] **[DOCS]** Dev guide for SW registration and debugging.
- [ ] **[DOCS]** Update [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md) change log when Phases B–E land.

## References

- [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md)
- [intercept-network-call-replace.md](../../../research/intercept-network-call-replace.md)
- [ADR 0002 — note body storage and API](../../../adr/0002-note-body-storage-and-api.md) (client still uses signed URLs for notes until Story 73)
