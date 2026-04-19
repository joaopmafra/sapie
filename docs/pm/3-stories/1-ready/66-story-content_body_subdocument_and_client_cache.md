# Story 66: Content body subdocument and client cache policy

## Description

Firestore/API should use a **nested `body` object** (including **`body.updatedAt`** as the canonical signal that note
**bytes** changed, distinct from rename-only metadata updates). The web app should use **TanStack Query** for metadata and
body loading: **fresh metadata** when opening a note from the tree, **conditional** reload of body bytes when
`body.updatedAt` advances, and **signed URLs used once per “need body” cycle** — no long-lived persistence of signed
URLs in `localStorage`. **In-memory** cache via TanStack Query; **no** hand-rolled IndexedDB for MVP unless offline is
explicitly required later.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## Problem statement

- Flat `bodyUri` / `size` / `bodyMimeType` / top-level `updatedAt` makes it **ambiguous** whether the note **body bytes**
  changed vs a **rename-only** metadata change.
- Product goal: **fresh metadata** when navigating from the tree, but **avoid** signed URL + Storage download when the
  **body version** is unchanged.

## Dependencies

- [Story 55](../../4-in-progress/55-story-note_content_editor.md) — Phases 0–5 (note editor with autosave, load/save path)
  should be complete or in progress so hooks and mutations exist to extend.
- **Preferred order:** ship after Story 55 core editor behavior is stable; **before**
  [Story 67: Rich note content editor (MDXEditor)](./67-story-rich_note_content_editor_mdx.md) so DTO and cache policy do not
  change underneath MDXEditor wiring.

## Proposed API / Firestore shape (contract)

Nested object on content (field names should match backend conventions):

- **`Content.updatedAt`** — changes on rename and other metadata updates.
- **`body.updatedAt`** (and optionally `body.createdAt`) — **only** signal for “re-fetch body bytes.” Document whether
  top-level `updatedAt` still changes on rename and how the client uses each field.
- **Directories:** `body` absent or `null`; same for notes with no Storage object yet.
- **Public HTTP DTO:** do not expose internal storage `uri` / `bodyUri` on the wire if that invariant is kept; expose a
  public summary (e.g. `mimeType`, `size`, `createdAt`, `updatedAt` under `body`).

## Engineering checklist (indicative)

### Backend

- [ ] Entity + Firestore mapper: read/write nested `body`.
- [ ] **Migration:** script or one-time transform for existing documents (dev/staging wipe acceptable if documented).
- [ ] `GET /api/content/:id` — return nested shape (or a flattened DTO that maps 1:1 from nested storage — pick one and
      stick to it for OpenAPI).
- [ ] `PUT /api/content/:id/body` — update nested `body` fields + timestamps consistently.
- [ ] `GET /api/content/:id/body/signed-url` — unchanged route shape or aligned with the new model.
- [ ] Tests: repository, controller, edge cases (no body, first save, replace body).

### Web

- [ ] Types: `Content` / hooks match the new DTO.
- [ ] **Metadata queries** (`useContentItem`, folder children, root as applicable): **`staleTime: 0`** and/or
      **`refetchOnMount: 'always'`** so opening a note from the tree triggers **fresh metadata**.
- [ ] **After metadata success** for a note id: compare **previous** `body.updatedAt` to **new**:
  - If **unchanged** and body bytes already in cache — **skip** unnecessary signed-URL / markdown refetch.
  - If **newer** or first load — **`invalidateQueries` / `removeQueries`** for `bodySignedUrl` + `noteMarkdown` prefixes
    for that id, then let existing hooks refetch.
- [ ] **Signed URL:** fetch once per “need body” cycle; **do not** persist signed URLs to `localStorage`.
- [ ] **Signed URL expiry / errors:** if `fetch(signedUrl)` fails with **403** (or similar) while `body.updatedAt` is
      unchanged, obtain a **new** signed URL and retry the bytes fetch (URL can expire even when the body did not change).
- [ ] **Editor save path:** after successful `PUT`, do **not** replace the editor from the server unless explicitly
      desired; align with [Story 65](../2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md) later.
- [ ] **Tests:** unit tests for comparison / invalidation policy (pure functions + `QueryClient` where helpful).

### Out of scope (unless expanded)

- IndexedDB / `persistQueryClient` (only with an explicit offline or cold-start requirement).
- Full Story 65 concurrency protocol.

### Documentation

- [ ] `docs/adr/0002-note-body-storage-and-api.md` (or successor) — nested `body`, timestamp semantics.
- [ ] OpenAPI + regenerate `packages/web` API client if applicable.

## Acceptance Criteria

- [ ] Notes persist body metadata in the agreed nested shape; rename updates top-level metadata without falsely indicating
      a body change when the body did not change.
- [ ] `GET` metadata responses and OpenAPI describe the public `body` summary (no internal URI on the wire).
- [ ] Client avoids redundant Storage downloads when `body.updatedAt` is unchanged after a metadata refetch.
- [ ] Opening a note from the tree still yields correct body bytes when another client or tab changed the body (body
      version advances → body reload).
- [ ] Automated tests cover repository/controller behavior and the client invalidation policy at an appropriate level.

## Risks and decisions (log during implementation)

- **Rename vs body:** Prefer **rename** to bump top-level `updatedAt` (or name-only fields) **without** advancing
  `body.updatedAt` when the Storage object did not change — requires backend discipline.
- **Multi-tab / multi-surface:** Until [Story 65](../2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md),
  acceptable policy is **last writer wins** for the body; document any UX caveats in release notes if needed.

## References

- [Story 65: Note Body Concurrency…](../2-to-refine/65-story-note_body_concurrency_and_conflict_resolution.md) — update
  cross-references if the version field name changes (`body.updatedAt` vs other).
