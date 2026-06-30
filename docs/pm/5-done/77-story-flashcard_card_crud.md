# Story 77: Flashcard Card CRUD

## Description

As a user, I want to create, edit, and delete cards within a flashcard deck so that I can build study material
with question/answer pairs.

## Details

- Cards are stored as a **subcollection** under deck content documents: `content/{deckId}/cards/{cardId}`.
- Each card has `front` (question) and `back` (answer) fields, both stored as markdown strings.
- Cards also store FSRS-ready scheduling fields for future spaced repetition upgrade:
  `dueDate`, `interval`, `repetitions`, `lastResult`, `lastStudied`, `correctCount`, `incorrectCount`.
- These scheduling fields are initialized to sensible defaults on creation and updated during study (Story 79).
- Cards support soft-delete via the `deleted` field (consistent with content soft-delete).
- Card front/back content is markdown only — no image embedding in MVP.
- The deck view (navigable from the note editor's Attachments section) shows all cards in a deck
  with Create, Edit, Delete, and Study actions.

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [ ] [Story 76](../../1-ready/76-story-flashcard_deck_crud.md) — deck CRUD must exist before cards

## Acceptance Criteria

- [ ] Cards can be created in a deck via `POST /api/content/:deckId/cards`.
- [ ] Cards in a deck can be listed via `GET /api/content/:deckId/cards`.
- [ ] A card's front/back can be edited via `PATCH /api/content/:deckId/cards/:cardId`.
- [ ] A card can be deleted via `DELETE /api/content/:deckId/cards/:cardId`.
- [ ] The deck view shows all cards with Create, Edit, and Delete actions.
- [ ] Editing a card opens a dialog with front and back text fields.
- [ ] Deleting a card shows a confirmation dialog.
- [ ] Deleting a deck cascades to its cards (firestore recursive delete or soft-delete).

## Technical Requirements

### Backend

- [ ] Create `Flashcard` entity and `FlashcardDocument` interfaces:
  - `id: string`, `deckId: string`, `ownerId: string`
  - `front: string`, `back: string`
  - `dueDate: Date`, `interval: number` (default 0), `repetitions: number` (default 0)
  - `lastResult: 'know' | 'dont_know' | null` (default null)
  - `lastStudied: Date | null` (default null)
  - `correctCount: number` (default 0), `incorrectCount: number` (default 0)
  - `deleted?: boolean`, `deletedAt?: Date | null`
  - `createdAt: Date`, `updatedAt: Date`
- [ ] Create `CardRepository` service:
  - `findByDeckId(deckId, ownerId)` — returns non-deleted cards for a deck
  - `findById(cardId)` — returns single card or null
  - `addCard(params)` — creates a card in the subcollection
  - `updateCard(cardId, params)` — updates card fields
  - `softDeleteCard(cardId)` — sets `deleted: true`
  - `deleteCardsByDeckId(deckId)` — cascade soft-delete all cards in a deck
- [ ] Create `CardService`:
  - `createCard(deckId, ownerId, front, back)` — validates deck exists and is owned
  - `getCards(deckId, ownerId)` — returns cards for a deck
  - `updateCard(cardId, ownerId, front, back)` — updates front/back
  - `deleteCard(cardId, ownerId)` — soft-deletes a card
  - `deleteCardsForDeck(deckId)` — cascade called from deck deletion
- [ ] Create `CardController`:
  - `POST /api/content/:deckId/cards` → 201 `{ id, ... }`
  - `GET /api/content/:deckId/cards` → 200 `Card[]`
  - `PATCH /api/content/:deckId/cards/:cardId` → 200 `Card`
  - `DELETE /api/content/:deckId/cards/:cardId` → 204
- [ ] Update `ContentService.deleteContent()` to cascade-delete cards when deleting a `deck` type.

### Frontend

- [ ] Add `ContentType.DECK` to `packages/web/src/lib/content/types.ts`.
- [ ] Create `CardService` in `packages/web/src/lib/cards/card-service.ts`:
  - `getCards(user, deckId)`, `createCard(user, deckId, front, back)`
  - `updateCard(user, deckId, cardId, front, back)`, `deleteCard(user, deckId, cardId)`
- [ ] Create TanStack Query hooks in `packages/web/src/lib/cards/card-hooks.ts`:
  - `useCards(deckId)`, `useCreateCard()`, `useUpdateCard()`, `useDeleteCard()`
- [ ] Create `DeckViewPage` (`/decks/:deckId`):
  - Fetches deck metadata and cards
  - Shows card list with front preview, edit icon, delete icon
  - "Add Card" button opens `CreateCardDialog`
  - "Study" button (placeholder for Story 78)
- [ ] Create `CreateCardDialog` component: front + back text fields, Create/Cancel.
- [ ] Create `EditCardDialog` component: front + back text fields, Save/Cancel.
- [ ] In `NoteEditorPage` Attachments section, clicking a deck navigates to `/decks/:deckId`.

### Testing

- [ ] API spec: CRUD operations for cards, 404 when deck doesn't exist, 403 when not owner.
- [ ] Web tests: DeckViewPage renders, card CRUD dialogs work, navigation from note editor.

### Documentation

- [ ] Update `content_naming.md` to document the card subcollection.
