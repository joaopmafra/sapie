# Story 65: Note Body Concurrency and Conflict Resolution

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Feature Reference

- [Feature 47: Note Editing & Management](../../2-features/1-ready/47-feature-note_editing_and_management.md)

## User Story

As a user who sometimes edits the same note in more than one browser window or device, I want the app to detect when my
local copy is out of date compared to what was last saved, so that I can choose to load the latest version or
overwrite it intentionally instead of silently losing work.

## Dependencies

| Dependency | Status |
|------------|--------|
| [Story 55: Note Content Editor](../../4-in-progress/55-story-note_content_editor.md) — persisted body, `PUT` / `GET` body, editor | Prerequisite |

## Scope

**In scope**

- **Optimistic concurrency** on `PUT /api/content/:id/body` using a version the client already has (e.g. **`updatedAt`**
  from metadata at load time or last successful save, or an `If-Match` / equivalent header—exact shape to be decided
  during implementation).
- **Conflict response** when the server’s stored version is newer than the version the client sent (e.g. **409** or **412**
  with enough information for the client to offer “reload latest” vs “overwrite anyway”).
- **Client UX** when a save fails due to conflict: prompt the user to **load the most recent version** (refresh editor
  from signed URL + markdown) or **overwrite the server version** (second save with explicit acknowledgment or
  refreshed version token, per API design).
- **Tests** for API conflict paths and for the minimal client logic that branches on conflict (per project testing
  norms).

**Out of scope (unless pulled in explicitly later)**

- Real-time collaborative editing (multiple cursors, operational transforms).
- Push notifications when another tab saves the same note.

## Technical notes (to refine during implementation)

- Reuse **`updatedAt`** (or a dedicated revision field) already on content metadata as the version signal; keep
  **`bodyUri`** server-only.
- Conflict UX should be **clear and blocking** enough that users do not assume a save succeeded when it did not.
- Align error shape with existing API error conventions in `packages/api`.

## Acceptance Criteria (draft)

- [ ] Saving with a **stale** base version yields a **documented conflict** response; saving with the **current** base
  version succeeds as today.
- [ ] The editor **surfaces** the conflict to the user and offers **at least**: reload latest body into the editor, or
  proceed with overwrite per explicit choice.
- [ ] After **reload latest**, the user sees content from storage and subsequent saves use the new version baseline.
- [ ] Automated tests cover the conflict contract on the API and the main client branch for conflict handling.

## References

- [Story 55: Note Content Editor](../../4-in-progress/55-story-note_content_editor.md)
- [Iterative development](../../../dev/iterative_development.md)
