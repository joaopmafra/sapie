# Story 72: Content body read via Service Worker

## Description

As a platform, we need authenticated, cache-friendly reads of **note markdown** and **attachment image bytes** so
embedded images can use bare `<img src="…">` URLs without blob URLs and repeat loads avoid unnecessary API→GCS streams.

## Details

This story implements **research Phases B–E**: server revalidation (304), Service Worker auth proxy, versioned Cache
Storage, and an IndexedDB metadata registry. **Note markdown** may optionally migrate to `GET …/body` through the SW in
Phase D; full deprecation of client signed URLs is **[Story 73](73-story-uniform_body_reads_and_image_orphan_cleanup.md)**.

Attachment URLs (after [Story 74](../1-ready/74-story-dedicated_attachment_storage_model.md)):

```text
GET /api/content/:noteId/body
GET /api/content/:noteId/attachments/:attachmentId/body
```

**Research:**

- [Phases B–E](../../../research/note_editor/note_image_embedding.md#iterative-phases-simple--final)
- [Target architecture](../../../research/note_editor/note_image_embedding.md#target-architecture-phases-bf)
- [Service Worker (Phase C+)](../../../research/note_editor/note_image_embedding.md#service-worker-phase-c)

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## Dependencies

- [ ] [Story 74](../1-ready/74-story-dedicated_attachment_storage_model.md) — attachment subcollection routes and markdown URL shape.

## Implementation approach (phased)

Deliver in order; each sub-phase should remain demonstrable.

### Phase B — Server revalidation

- `ETag` from `body.updatedAt` on `GET …/body` and `GET …/attachments/:attachmentId/body`.
- `If-None-Match` → **304 Not Modified** without GCS read.
- `Cache-Control: private, no-cache` (SW owns client caching).

### Phase C — Service Worker auth proxy

- Register minimal SW: intercept both body route patterns above; inject Bearer token via `postMessage` (login, token refresh, SW `activate`).
- Network-only (no Cache API yet).
- Switch image display from blob URLs to bare markdown URLs in MDXEditor.

### Phase D — Versioned Cache Storage

- Cache API key `{resourceId}:{bodyUpdatedAt}` (from response `ETag`) — note `contentId` or `{noteId}/{attachmentId}` composite as registry key.
- `postMessage` `EVICT_BODY` on successful body `PUT`; update TanStack metadata.
- Optional: migrate note body load to `GET …/body` through SW (may defer to Story 73).

### Phase E — IndexedDB metadata registry

- Database `sapie-content-registry`, store `bodyVersions` (resource key → `{ bodyUpdatedAt, mimeType? }`).
- Write-through from content hooks; on note open parse markdown for attachment URLs and ensure registry entries exist.
- SW reads IDB before body fetch for bare `<img src>` requests.
- Clear registry on logout.

### Phase G (optional, same story)

- Migrate hand-written SW to [Workbox](https://developer.chrome.com/docs/workbox) **only if** maintenance cost warrants it.

## Acceptance Criteria

- [ ] **B:** Reloading a note with unchanged images yields **304** for applicable body GET requests (network tab).
- [ ] **C:** Images render via `/api/content/{noteId}/attachments/{attachmentId}/body` with SW registered; blob URL resolver removed.
- [ ] **C:** SW receives token updates on login and Firebase token refresh.
- [ ] **D:** Reopening a note with unchanged attachment `body.updatedAt` serves bodies from SW cache (no full stream).
- [ ] **E:** Bare attachment URLs resolve cache using IDB `bodyUpdatedAt` without a version in markdown.
- [ ] Dev ergonomics documented (SW registration in dev, stale SW avoidance).
- [ ] Documented fallback if SW is unavailable.

## Out of scope

- Deprecating signed URLs for **note markdown** loads ([Story 73](73-story-uniform_body_reads_and_image_orphan_cleanup.md))
- Attachment reconcile on save ([Story 74](../1-ready/74-story-dedicated_attachment_storage_model.md))
- ADR 0002 amendment ([Story 73](73-story-uniform_body_reads_and_image_orphan_cleanup.md))

## Technical Requirements

- [ ] Server compares `If-None-Match` to Firestore `body.updatedAt` without reading GCS on match (note bodies and attachment docs).
- [ ] SW intercepts `GET /api/content/:id/body` and `GET /api/content/:noteId/attachments/:attachmentId/body`.
- [ ] Cache key `{resourceId}:{bodyUpdatedAt}`; evict stale entries on body update.
- [ ] Use [`idb`](https://github.com/jakearchibald/idb); share registry module between app and ES-module SW (Vite).
- [ ] Do not use Workbox precaching or app-shell defaults.

## Risks

- Firebase token handoff to SW must stay in sync; SW inactive breaks `<img src>` unless fallback exists.
- Two URL patterns must share one cache/eviction policy keyed by `body.updatedAt`.

## Tasks

### Backend (Phase B)

- [ ] **[BE] ETag and 304 on body GET routes**
    - Note `GET …/body` and attachment `GET …/attachments/:id/body`.
    - Set `ETag` from `body.updatedAt`; handle `If-None-Match`.
    - Classical tests for 200 stream vs 304.

### Frontend (Phases C–E)

- [ ] **[FE] Service Worker registration and token handoff**
    - Register after auth; `postMessage` on login/refresh/`activate`.
    - Intercept both body route patterns; inject `Authorization`.

- [ ] **[FE] Remove blob URL image resolver** (Phase C)
    - MDXEditor uses bare attachment URLs in markdown and DOM.

- [ ] **[FE] Versioned Cache API** (Phase D)
    - Cache on `{resourceId}:{etag}`; `EVICT_BODY` on body PUT success.

- [ ] **[FE] IndexedDB metadata registry** (Phase E)
    - Write-through from content hooks; parse attachment URLs on note open; SW read path; clear on logout.

- [ ] **[FE] Optional Workbox migration** (Phase G)
    - Only if hand-written SW becomes hard to maintain.

### Testing

- [ ] **[BE] Tests** for 304 path on note and attachment body routes.
- [ ] **[FE] Tests** for SW/cache where practical; manual checklist for `<img src>` + token refresh.

### Documentation

- [ ] **[DOCS]** Dev guide for SW registration and debugging.
- [ ] **[DOCS]** Update [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md) change log when Phases B–E land.

## References

- [note_image_embedding.md](../../../research/note_editor/note_image_embedding.md)
- [Story 74 — attachment storage model](../1-ready/74-story-dedicated_attachment_storage_model.md)
- [intercept-network-call-replace.md](../../../research/intercept-network-call-replace.md)
- [ADR 0002 — note body storage and API](../../../adr/0002-note-body-storage-and-api.md) (client still uses signed URLs for notes until Story 73)
