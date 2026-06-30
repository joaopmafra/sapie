# NEXT-STEPS.md

**Session:** 2026-06-29

## What was implemented

### Story 76 — Flashcard deck CRUD (previous session)

Added `deck` content type with create/rename/delete support. Decks are content children of notes.

### Story 77 — Flashcard card CRUD

Cards stored as subcollection under deck docs (`content/{deckId}/cards/{cardId}`). Full CRUD with FSRS-ready fields.

**Backend:**

- New `cards/` module: `Card` entity, `CardRepository` (subcollection ops), `CardService` (ownership validation), `CardController` (CRUD endpoints)
- `POST /api/content/:deckId/cards` → 201
- `GET /api/content/:deckId/cards` → 200 `Card[]`
- `PATCH /api/content/:deckId/cards/:cardId` → 200
- `DELETE /api/content/:deckId/cards/:cardId` → 204
- FSRS-ready fields initialized on creation: `dueDate=now`, `interval=0`, `repetitions=0`, `lastResult=null`, `lastStudied=null`, `correctCount=0`, `incorrectCount=0`
- Card cascade on deck delete: `ContentService.deleteContent()` calls `CardService.deleteCardsForDeck()` for DECK type
- Circular dependency resolved with `forwardRef()` between `ContentModule` and `CardModule`
- 7 controller spec tests: create, list, update, delete, 404 deck, 403 not owner, 400 wrong type

**Frontend:**

- `packages/web/src/lib/cards/` — types, `CardService`, TanStack Query hooks (`useCards`, `useCreateCard`, `useUpdateCard`, `useDeleteCard`)
- `DeckViewPage` (`/decks/:deckId`) — card list with create/edit/delete, inline dialogs, Study button placeholder
- Note editor deck list: clicking a deck name navigates to deck view; Edit/Delete icon buttons for rename/delete
- `ConfirmDeleteDialog` reused for card deletion

**Tests:**

- 171 total passing (100 API, 71 web)
- Types clean, format clean, lint 0 errors (10 pre-existing warnings)

### Stories 78–80 — Written and ready

- **Story 78** — Study mode (`docs/pm/3-stories/1-ready/78-story-study_mode_single_deck.md`)
- **Story 79** — Study result tracking (`docs/pm/3-stories/1-ready/79-story-study_result_tracking.md`)
- **Story 80** — Folder-level study (`docs/pm/3-stories/1-ready/80-story-folder_level_study.md`)

---

## MVP progress

```
✅  Story 53  — note editor shell + rename API
✅  Story 62  — TanStack Query refactor
✅  Story 55  — note content editor (textarea + autosave)
✅  Story 66  — content body subdocument + client cache
✅  Story 67  — rich note editor (MDXEditor)
✅  Story 63  — folder creation
✅  Story 70  — URL-driven sidebar selection + folder view
✅  Story 71  — inline images (Phase A, interim — superseded by 74)
✅  Story 74  — dedicated attachment storage model (superseded by 75)
✅  Story 75  — blob storage model refactor
✅  Story 64  — content deletion (soft-delete + cascade + confirm dialogs)
✅  Story 76  — flashcard deck CRUD
✅  Story 77  — flashcard card CRUD (create/edit/delete cards in decks)
❌  Story 78  — study mode — single deck (READY in 1-ready)
❌  Story 79  — study result tracking (READY in 1-ready)
❌  Story 80  — folder-level study (READY in 1-ready)
❌  —        — responsive polish
```

---

## Suggested next steps

### 1. Story 78 — Study mode

Ready in `docs/pm/3-stories/1-ready/78-story-study_mode_single_deck.md`. Client-driven study session: front → reveal → "I know"/"I don't know" → re-queue.

### 2. Story 79 — Study result tracking

Ready in `docs/pm/3-stories/1-ready/79-story-study_result_tracking.md`. PATCH endpoint per-card with FSRS-ready field updates.

### 3. Responsive polish

Cross-cutting mobile testing — defer until all study features ship.

---

## Key docs created/updated this session

- `docs/pm/5-done/77-story-flashcard_card_crud.md` — story (moved from 1-ready)
- `packages/api/src/cards/` — new module: entity, repository, service, controller, module
- `packages/api/src/content/content.module.ts` — forwardRef(CardModule) for card cascade
- `packages/api/src/content/services/content.service.ts` — CardService injection + deck card cascade
- `packages/web/src/lib/cards/` — types, CardService, hooks, index
- `packages/web/src/pages/DeckViewPage.tsx` — new page with card CRUD UI
- `packages/web/src/App.tsx` — `/decks/:deckId` route
- `packages/web/src/pages/NoteEditorPage.tsx` — deck list navigation to deck view
