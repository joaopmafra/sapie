# Story 83: Spaced Repetition + Result Tracking

## Description

As a user, I want my study results to apply spaced repetition scheduling so that cards I know appear less frequently and cards I struggle with appear more often.

## Details

- Simplified SM-2 algorithm with two buttons: "I know" and "I don't know".
- Results update the card's scheduling fields immediately (per-card, not batched).
- "I know": doubles interval (1→2→4→8→…→365 day cap), increments repetitions.
- "I don't know": resets interval to 0, resets repetitions, card is due immediately.
- Tracking fields updated: `lastStudied`, `correctCount`, `incorrectCount`, `lastResult`.
- Dashboard due counts update after the session (cards move to future dates).

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [x] Story 82 — study dashboard + due cards (study session triggers ratings)
- [x] Story 77 — flashcard card CRUD (card fields exist)

## Acceptance Criteria

- [ ] `PATCH /api/content/:deckId/cards/:cardId/study-result` accepts `{ result: 'know' | 'dont_know' }`.
- [ ] "I know": `repetitions += 1`, `interval = 2^repetitions` (capped at 365), `dueDate = now + interval days`, `lastResult = 'know'`, `correctCount += 1`, `lastStudied = now`.
- [ ] "I don't know": `repetitions = 0`, `interval = 0`, `dueDate = now`, `lastResult = 'dont_know'`, `incorrectCount += 1`, `lastStudied = now`.
- [ ] Updates are persisted immediately to Firestore (card subcollection document).
- [ ] Returns 200 with the updated card.
- [ ] Returns 404 if card doesn't exist or deck doesn't exist or not owner.
- [ ] Study session calls this endpoint after each rating (graded mode).
- [ ] After session completes, returning to dashboard shows updated due counts.

## Technical Requirements

### Backend

- [ ] Create `PATCH /api/content/:deckId/cards/:cardId/study-result` in `CardController`:
  - Body: `{ result: 'know' | 'dont_know' }`
  - Validates card exists and user owns the parent deck
  - Applies SM-2 algorithm
  - Updates card fields atomically in Firestore
  - Returns 200 `CardResponse`
- [ ] Create `StudyResultRequest` DTO with `result` field (enum validation).
- [ ] Add `recordStudyResult(deckId, cardId, ownerId, result)` to `CardService`:
  - Validates deck ownership via `validateDeckOwnership`
  - Fetches current card
  - Applies SM-2 scheduling logic
  - Calls `CardRepository.updateCardStudyState(cardId, deckId, updates)`
- [ ] Add `updateCardStudyState` to `CardRepository`:
  - Accepts all scheduling fields
  - Performs a single Firestore `update` call for atomicity
- [ ] SM-2 algorithm implementation:
  ```
  if result == 'know':
    repetitions = card.repetitions + 1
    interval = min(2 ** repetitions, 365)
    dueDate = now + interval days
    correctCount = card.correctCount + 1
  else:
    repetitions = 0
    interval = 0
    dueDate = now
    incorrectCount = card.incorrectCount + 1
  lastResult = result
  lastStudied = now
  ```
- [ ] Unit tests for the study-result endpoint:
  - "I know" updates fields correctly (including interval progression)
  - "I don't know" resets repetitions and interval
  - 404 when card/doesn't exist
  - 404 when not owner (deck ownership check)
  - Verify interval caps at 365

### Frontend

- [ ] Create `useRecordStudyResult()` mutation hook in `packages/web/src/lib/cards/card-hooks.ts`:
  - `useMutation` for `PATCH /api/content/:deckId/cards/:cardId/study-result`.
- [ ] In `StudySession` (graded mode):
  - After each "I know" / "I don't know" click, call `recordStudyResult`.
  - Handle errors gracefully (show snackbar toast, don't interrupt study flow).
  - Queue logic is client-side and independent of API result.
- [ ] After session completes:
  - Invalidate content roots query to refresh due counts.
  - Navigate back to dashboard.

### Documentation

- [ ] API Swagger docs auto-generated from decorators.
- [ ] No separate docs needed.

## Out of scope

- Four-button FSRS grading (Again/Hard/Good/Easy) — schema-compatible upgrade.
- Ease factor (SM-2 parameter) — simplified algorithm is sufficient for MVP.
- Per-session summaries persisted to backend.
- Study history / analytics.
