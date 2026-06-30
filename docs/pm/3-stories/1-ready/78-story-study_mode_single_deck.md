# Story 78: Study Mode — Single Deck

## Description

As a user, I want to study the cards in a deck so that I can test my knowledge and improve retention.

## Details

- Study mode is launched from the "Study" button on the deck view (`/decks/:deckId`).
- Cards are shown one at a time: **front face first**, then the user reveals the back.
- After revealing the back, the user rates their recall with two buttons: **"I know"** and **"I don't know"**.
- Cards answered "I don't know" are re-queued in the current session.
- Cards answered "I know" are considered done for this session.
- The session ends when all cards have been answered "I know" at least once.
- A session summary shows at the end: cards studied, correct count, incorrect count.
- No spaced repetition algorithm is applied yet (deferred) — but the card's FSRS-ready fields
  are updated (Story 79).

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [ ] [Story 76](../../1-ready/76-story-flashcard_deck_crud.md) — decks must exist
- [ ] [Story 77](../../1-ready/77-story-flashcard_card_crud.md) — cards must exist

## Acceptance Criteria

- [ ] A "Study" button on the deck view starts study mode.
- [ ] Cards are shown one at a time with only the front visible initially.
- [ ] A "Reveal" button or click shows the back of the card.
- [ ] "I know" and "I don't know" buttons appear after the back is revealed.
- [ ] "I don't know" cards are re-queued and shown again later in the same session.
- [ ] "I know" cards are removed from the active queue.
- [ ] Session ends when all cards are marked "I know" at least once.
- [ ] A session summary is displayed with counts.
- [ ] The user can exit study mode early via a "Finish" or back button.

## Technical Requirements

### Backend

- [ ] Add `POST /api/content/:deckId/cards/study-result` endpoint:
  - Accepts `{ cardId: string, result: 'know' | 'dont_know' }` per card
  - Updates card fields (Story 79 handles the full update logic)
  - Returns 204
- [ ] Study session is **client-driven** — the backend doesn't track sessions.
  Cards are fetched once at the start and the client manages the queue.

### Frontend

- [ ] Create `StudySession` component:
  - State: `cards` (all cards), `queue` (cards still to answer), `currentCard` (top of queue)
  - State: `phase` — `'front' | 'back' | 'summary'`
  - State: `results` — `{ cardId, result }[]` for the session summary
- [ ] Front face: shows card front markdown, "Reveal" button
- [ ] Back face: shows card front + back markdown, "I know" / "I don't know" buttons
- [ ] Queue logic: on "I don't know", push card to end of queue; on "I know", remove from queue
- [ ] Summary screen: total cards, correct count, incorrect count, "Back to deck" button
- [ ] Mobile-friendly: large tap targets, full-width cards
- [ ] Navigate to study mode at `/decks/:deckId/study`

### Testing

- [ ] Web tests: StudySession component renders front/back/summary phases,
  queue logic works correctly, "I don't know" re-queues.
- [ ] Integration test: full study flow from deck view to session end.

### Documentation

- [ ] No new API docs needed (study is client-driven).
