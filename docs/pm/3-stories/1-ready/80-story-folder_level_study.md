# Story 80: Folder-Level Study

## Description

As a user, I want to study all decks under a folder at once so that I can review everything for a study domain
in a single session.

## Details

- Right-click a folder in the sidebar tree → "Study all" option added to the context menu.
- Collects all decks whose `folderId` matches the selected folder (using the denormalized field from Story 76).
- Also collects decks from all descendant notes (recursively) within that folder.
- All cards from all collected decks are combined into a single study session.
- The study flow is identical to single-deck study (Story 78): front → reveal → "I know" / "I don't know".
- Session ends when all cards have been answered "I know" at least once.
- Study result tracking (Story 79) applies to each card individually.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [ ] [Story 76](../../1-ready/76-story-flashcard_deck_crud.md) — denormalized `folderId` on decks
- [ ] [Story 77](../../1-ready/77-story-flashcard_card_crud.md) — cards exist
- [ ] [Story 78](../../1-ready/78-story-study_mode_single_deck.md) — study mode exists
- [ ] [Story 79](../../1-ready/79-story-study_result_tracking.md) — result tracking exists

## Acceptance Criteria

- [ ] Right-clicking a folder in the tree shows a "Study all" menu item.
- [ ] Clicking "Study all" collects all decks under that folder and its descendants.
- [ ] All collected cards are combined into a single study session queue.
- [ ] The study session uses the same UI and logic as single-deck study.
- [ ] Study results are tracked per-card as usual.

## Technical Requirements

### Backend

- [ ] Create `GET /api/content/study/decks?folderId=X` endpoint:
  - Accepts `folderId` query parameter
  - Returns all non-deleted decks where `folderId` matches, including decks
    from descendant notes (client passes all folder IDs from the hierarchy)
  - Alternatively: accept `folderIds[]` array query parameter to collect multiple folders at once
- [ ] Simpler approach for MVP: client already has the tree structure in TanStack Query cache.
  Client-side:
  1. Collect all descendant folder IDs from the tree
  2. For each descendant folder, query its children (which are notes)
  3. For each note, query its children (which are decks)
  4. Combine all deck IDs into the study session
  - Or: add a single API endpoint `GET /api/content/study/decks?folderIds=id1,id2,...`
    that queries `content` collection where `type = 'deck'` and `folderId IN [...]` and `deleted = false`

### Frontend

- [ ] In `ContentExplorer.tsx`, add "Study all" to the context menu (next to "Delete").
  Only shown for directory-type nodes.
- [ ] On "Study all" click:
  1. Collect the target folder ID
  2. Collect all descendant folder IDs from the tree cache
  3. Query decks for all collected folder IDs
  4. Fetch cards for all decks
  5. Navigate to a folder study session view
- [ ] Reuse `StudySession` component from Story 78, parameterized to accept a card list
  rather than fetching from a single deck.
- [ ] Navigate to `/folders/:folderId/study`.

### Testing

- [ ] API spec: `GET /api/content/study/decks?folderIds=...` returns correct decks.
- [ ] Web tests: context menu shows "Study all" for folders, card collection logic works.

### Documentation

- [ ] API docs for new study endpoint via Swagger.
