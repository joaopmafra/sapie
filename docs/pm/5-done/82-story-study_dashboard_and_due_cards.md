# Story 82: Study Dashboard + Due Cards

## Description

As a user, I want a global study dashboard showing all content roots with due card counts, so I can start study sessions from a single entry point.

## Details

- Study entry point is `/study` in the app navigation.
- Dashboard shows all content roots (folders tagged `"content-root"`) with checkboxes and due card counts.
- "Start Study" button aggregates due cards from checked roots into a study session.
- Card study session: front → reveal → "I know" / "I don't know" → re-queue → summary.
- Session component supports both graded (dashboard, updates SR fields via Story 83) and ungraded (direct single-deck/folder, no SR updates) modes.
- Due-only scheduling: only cards with `dueDate <= now` appear in dashboard. New cards start with `dueDate = now` (appear immediately).

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [x] Story 81 — content roots + tags (`GET /api/content/roots`, `tags` field)
- [x] Story 76 — flashcard deck CRUD (denormalized `folderId`)
- [x] Story 77 — flashcard card CRUD (cards with `dueDate`)

## Acceptance Criteria

- [ ] `/study` route exists and shows the study dashboard.
- [ ] Dashboard lists all content roots with checkboxes (checked by default) and due card counts.
- [ ] "Total cards due" sums checked roots only.
- [ ] "Start Study" is disabled when no cards are due.
- [ ] "All caught up! 🎉" shown when zero cards are due across all roots.
- [ ] Study session shows cards one at a time: front → Reveal → back + "I know" / "I don't know".
- [ ] "I don't know" re-queues card in current session.
- [ ] "I know" removes card from session.
- [ ] Session ends when all cards answered "I know" at least once.
- [ ] Session summary shows total cards, correct count, incorrect count.
- [ ] After summary, "Back to Dashboard" returns to `/study`.
- [ ] Mobile-friendly: full-width cards, large tap targets (min 48px).

## Technical Requirements

### Backend

- [ ] Create `StudyModule` (new NestJS module) with `StudyController`:
  - `GET /api/study/due-cards?rootIds=id1,id2` — aggregate due cards
- [ ] Create `StudyService`:
  - `getDueCards(rootIds: string[], ownerId: string): Promise<{ cards: StudyCard[], totalDue: number }>`
  - Logic:
    1. For each root ID, verify it exists and is owned by user
    2. Find all descendant folders recursively
    3. Find decks with `folderId` in the collected folder IDs, `deleted != true`
    4. For each deck, query its cards subcollection where `dueDate <= now` and `deleted != true`
    5. Return cards ordered by `dueDate` ascending (oldest due first)
    6. Include `deckName` and `noteId` for context in the response
- [ ] Response type:
  ```json
  {
    "cards": [
      {
        "id": "card123",
        "front": "What is a Bloom filter?",
        "back": "A probabilistic data structure...",
        "dueDate": "2026-06-28T00:00:00Z",
        "interval": 1,
        "repetitions": 2,
        "deckId": "deck456",
        "deckName": "Data Structures",
        "noteId": "note789"
      }
    ],
    "totalDue": 25
  }
  ```
- [ ] Unit tests for the due-cards endpoint: returns cards, respects ownership, handles empty roots.

### Frontend

- [ ] Create `StudyDashboard` page at `/study`:
  - Fetches content roots via `useContentRoots()` (from Story 81).
  - Renders checkbox list with due counts.
  - "Start Study" button navigates to study session.
  - "All caught up!" empty state.
- [ ] Create `StudySession` component (reusable for dashboard and direct modes):
  - Props: `cards: StudyCard[]`, `mode: 'graded' | 'ungraded'`, `onComplete: (results) => void`
  - State: `queue` (cards still to answer), `currentCardIndex`, `phase: 'front' | 'back' | 'summary'`
  - State: `results: { cardId, result }[]`
  - Front phase: card front text + "Reveal" button
  - Back phase: card front + back text + "I know" / "I don't know" buttons
  - Queue logic: "I don't know" → push to end of queue; "I know" → remove
  - Summary phase: total, correct, incorrect counts
  - In graded mode: calls study-result API (Story 83) after each rating
- [ ] Create `StudySessionPage` at `/study/session`:
  - Accepts `rootIds` query param (comma-separated).
  - Fetches due cards via `GET /api/study/due-cards?rootIds=...`.
  - Renders `StudySession` in graded mode.
  - On complete, navigates back to dashboard.
- [ ] Add "Study" link to app navigation (sidebar or top nav).
- [ ] Create TanStack Query hooks:
  - `useDueCards(rootIds: string[])` — `useQuery` for `GET /api/study/due-cards`.
- [ ] Unit tests for StudyDashboard and StudySession components.

### Documentation

- [ ] API Swagger docs auto-generated from decorators.
- [ ] No separate docs needed (study dashboard design doc is authoritative).

## Out of scope

- Spaced repetition algorithm (Story 83).
- Per-card result persistence (Story 83 wires it up).
- Knowledge-area filtering in dashboard.
- Single-deck direct study button (secondary path, defer).
- Folder-level "Study all" right-click (secondary path, defer).
