# Story 84: Secondary Study Paths

## Description

As a user, I want to study specific decks or all decks under a folder directly (without going through the study dashboard), for ungraded review and cramming sessions.

## Details

- **Single-deck study**: "Study" button on the deck view (`/decks/:deckId`) — studies ALL cards in that deck, ignoring `dueDate`.
- **Folder-level study**: right-click folder → "Study all" — studies all cards under that folder, ignoring `dueDate`.
- Both paths are **ungraded** — cards are shown for review but do NOT update SR scheduling fields.
- Reuses the same card session UI as the dashboard (front → reveal → "I know" / "I don't know" → summary).
- No new backend endpoints needed — cards are fetched via existing `GET /api/content/:deckId/cards`.

## Acceptance Criteria

- [ ] A "Study" button on the deck view navigates to `/decks/:deckId/study`.
- [ ] Single-deck study shows ALL cards (not just due cards) in a study session.
- [ ] Study session UI is the same as the dashboard (front → reveal → rate → summary).
- [ ] In ungraded mode, no SR API calls are made when cards are rated.
- [ ] Right-clicking a folder in the tree shows a "Study all" menu item.
- [ ] Clicking "Study all" collects all decks under the folder and navigates to a folder study session.
- [ ] Folder study shows all cards from all decks under the folder.
- [ ] Session summary is shown at the end, then navigates back.

## Technical Requirements

### Frontend

- [ ] Extract reusable `StudySession` component from `StudySessionPage`:
  - Props: `cards: StudyCard[]`, `mode: 'graded' | 'ungraded'`, `onComplete: (results) => void`
  - In ungraded mode: skip `recordResult.mutate` call in `handleRate`
  - In graded mode: call `recordResult.mutate` as currently implemented
- [ ] Update `StudySessionPage` to use extracted `StudySession` in graded mode.
- [ ] Create `DeckStudyPage` at `/decks/:deckId/study`:
  - Fetches all cards via `useCards(deckId)`
  - Renders `StudySession` in ungraded mode
  - On complete: navigates back to `/decks/:deckId`
- [ ] Create `FolderStudyPage` at `/folders/:folderId/study`:
  - Fetches all descendant folder IDs (via TanStack Query cache or recursive query)
  - Finds all decks under those folders
  - Fetches all cards for all decks
  - Renders `StudySession` in ungraded mode
  - On complete: navigates back to `/folders/:folderId`
- [ ] Add "Study" button to `DeckViewPage` header area.
- [ ] Add "Study all" menu item to `ContentExplorer` context menu (folder nodes only).
- [ ] Add routes in `App.tsx`.

## Out of scope

- SR scheduling updates for secondary paths (they're ungraded).
- Per-card result persistence for ungraded mode.
