# Story 76: Flashcard Deck CRUD

## Description

As a user, I want to create, rename, and delete flashcard decks attached to my notes so that I can organize
study cards by topic.

## Details

- Decks are **content children** of notes (`parentId = noteId`), not shown in the sidebar tree.
- A new `deck` content type is added to the `ContentType` enum alongside `note` and `directory`.
- Decks store a denormalized `folderId` field (the folder containing the parent note) for efficient folder-level
  study queries (Story 80).
- The note editor shows an **Attachments section** listing the note's decks with Create, Rename, and Delete actions.
- Decks do NOT appear in the sidebar tree — the tree shows only folders and notes.
- `GET /api/content/:parentId/children` already returns all children; the client filters by `type` to show only
  folders and notes in the tree and only decks in the Attachments section.
- Creating a deck uses `POST /api/content` with `type: 'deck'` and `parentId: noteId`.
- Renaming a deck uses `PATCH /api/content/:id` (already exists).
- Deleting a deck uses `DELETE /api/content/:id?cascade=true` (already exists from Story 64).
- Deleting a note that has deck children is blocked (409) unless `cascade=true` (already implemented in Story 64).

## Epic Reference

- [Epic 45: Content Management Foundation](../../1-epics/2-to-refine/45-epic-content_management_foundation.md)

## Dependencies

- [x] [Story 64](../../5-done/64-story-content_deletion.md) — soft-delete and cascade are in place
- [x] [Story 67](../../5-done/67-story-rich_note_content_editor_mdx.md) — note editor exists

## Acceptance Criteria

- [ ] A `deck` content type exists and can be created via `POST /api/content` with `type: 'deck'`.
- [ ] `GET /api/content/:noteId/children` returns deck children alongside notes (if any existed).
- [ ] Decks are excluded from the sidebar tree (`ContentExplorer` filters to `type: note | directory`).
- [ ] The note editor shows an "Attachments" section listing the note's decks.
- [ ] A "Create Deck" button in the Attachments section opens a dialog for naming the deck.
- [ ] Deck names can be renamed inline (click to edit, same as notes).
- [ ] A deck can be deleted with a confirmation dialog.
- [ ] Deleting a note with deck children returns 409 unless `cascade=true`.

## Technical Requirements

### Backend

- [ ] Add `DECK = 'deck'` to `ContentType` enum in `content.entity.ts`.
- [ ] Update `ContentService.create()` to accept `deck` type under a note parent:
  - Parent must be a `note` (not a directory).
  - `folderId` is denormalized from the parent note's `parentId`.
- [ ] Update `ContentRepository` to support `addDeck()` (or reuse `addContentWithType` with `deck` type).
- [ ] Update `ContentService.findByParentIdAndOwnerId()` filter — decks are valid content types;
  tree filtering happens at the HTTP/client layer.
- [ ] Update `ContentService.putContentBody()` to accept `deck` type (deck bodies may store deck-level
  markdown notes in the future, but for MVP they are metadata-only).
- [ ] Update `ContentService.deleteContent()` to handle `deck` type (already handled by generic logic).

### Frontend

- [ ] Update `ContentType` enum in `packages/web/src/lib/content/types.ts` to include `deck`.
- [ ] In `ContentExplorer.tsx`, filter tree items to `type !== 'deck'`.
- [ ] In `NoteEditorPage.tsx`, add an "Attachments" section below the editor body showing the note's decks.
- [ ] Create `DeckList` component: lists decks with rename (inline) and delete (icon button) actions.
- [ ] Create `CreateDeckDialog` component: name input + Create/Cancel buttons.
- [ ] Use `useFolderChildren(noteId)` to fetch decks, filtered client-side by `type === 'deck'`.
- [ ] Use `useCreateNote()` (or a new `useCreateDeck()` wrapper) for deck creation.
- [ ] Use `useRenameContent()` for deck renaming.
- [ ] Use `useDeleteContent()` for deck deletion.

### Testing

- [ ] API spec: create deck under note (201), create deck under directory (400), list decks for note,
  rename deck, delete deck (204), delete note with deck children returns 409 without cascade.
- [ ] Web tests: DeckList renders decks, CreateDeckDialog opens/closes, decks excluded from tree.

### Documentation

- [ ] Update `content_naming.md` if needed to document the new `deck` type.
