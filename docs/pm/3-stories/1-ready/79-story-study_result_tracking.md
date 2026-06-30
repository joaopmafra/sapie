# Story 79: Study Result Tracking

## Description

As a user, I want my study results to be tracked so that I can see which cards need more practice.

## Details

- When a card is rated during study, the backend updates the card's tracking fields.
- Tracked fields per card:
  - `lastStudied: Date` — when the card was last studied
  - `lastResult: 'know' | 'dont_know'` — the last rating given
  - `correctCount: number` — total times answered "I know"
  - `incorrectCount: number` — total times answered "I don't know"
- FSRS-ready fields (updated with simple logic for MVP, refined when FSRS is adopted):
  - `dueDate: Date` — next review date (MVP: set to now for "I don't know", +1 day for "I know")
  - `interval: number` — days until next review (MVP: 0 for "I don't know", 1 for "I know")
  - `repetitions: number` — consecutive correct answers (MVP: 0 for "I don't know", +1 for "I know")
- Updates happen per-card during the study session, not in a batch at the end.
  This ensures progress is preserved if the user closes the app mid-session.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [ ] [Story 77](../../1-ready/77-story-flashcard_card_crud.md) — cards must exist
- [ ] [Story 78](../../1-ready/78-story-study_mode_single_deck.md) — study mode triggers updates

## Acceptance Criteria

- [ ] Rating a card "I know" updates: `lastStudied`, `lastResult: 'know'`, `correctCount += 1`,
  `dueDate = now + 1 day`, `interval = 1`, `repetitions += 1`.
- [ ] Rating a card "I don't know" updates: `lastStudied`, `lastResult: 'dont_know'`,
  `incorrectCount += 1`, `dueDate = now`, `interval = 0`, `repetitions = 0`.
- [ ] Updates are persisted immediately (not batched at session end).
- [ ] Card listing shows `correctCount` and `incorrectCount` for each card (optional for MVP).

## Technical Requirements

### Backend

- [ ] Create `PATCH /api/content/:deckId/cards/:cardId/study-result` endpoint:
  - Body: `{ result: 'know' | 'dont_know' }`
  - Updates the card's tracking and FSRS-ready fields
  - Returns 200 with updated card
- [ ] `CardService.recordStudyResult(cardId, ownerId, result)`:
  - Validates card exists and user owns the parent deck
  - Updates fields atomically in Firestore
  - Applies simple scheduling logic (see above)

### Frontend

- [ ] In `StudySession`, after each rating, call the study-result API.
- [ ] Handle errors gracefully (show snackbar, don't interrupt study flow).
- [ ] Optionally show correct/incorrect counts per card in the deck view.

### Testing

- [ ] API spec: record "know" result updates fields correctly,
  record "dont_know" result resets repetitions,
  404 when card doesn't exist, 403 when not owner.

### Documentation

- [ ] No new docs needed (API is documented via Swagger).
