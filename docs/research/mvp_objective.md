# MVP Objective: Functional Study Tool

## Context

The owner of this project is a staff/principal engineer with 20 years of full-stack and mobile experience, currently
on a sabbatical to deepen knowledge in new areas — specifically **AI engineering, DSA, system design, and
DevSecOps**. Sapie is the primary tool for retaining and studying this knowledge.

**The overriding priority is to ship a functional, usable version as quickly as possible.** Every implementation
decision should be evaluated against this constraint. Architectural elegance is secondary to getting a working tool
into daily use.

---

## Required Features

The following features define the MVP. They were discussed and refined before being documented here — the design
decisions below reflect that discussion and should be treated as settled unless explicitly revisited.

### 1. Note Creation and Editing

The core feature. Notes are the primary content type.

**Scope for MVP:**

- Create notes in folders (modal with name + location)
- Editable note name (inline in editor)
- **Sequencing (backlog):** [Story 55](../pm/4-in-progress/55-story-note_content_editor.md) ships a **multiline text
  editor + auto-save** first; [Story 66](../pm/3-stories/1-ready/66-story-content_body_subdocument_and_client_cache.md)
  introduces nested body metadata + client cache policy; [Story 67](../pm/3-stories/2-to-refine/67-story-rich_note_content_editor_mdx.md)
  adds the **rich text editor** with: headings, bold/italic, lists, **code blocks with syntax highlighting** (essential
  for DSA and system design), links — using `@mdxeditor/editor` (already referenced in research notes)
- Auto-save with visible save status (Story 55 onward)

**Math/LaTeX**: defer to a later iteration.

### 2. Folder Creation and Content Deletion

Essential for organizing notes across 4 study domains (AI, DSA, System Design, DevSecOps) from day one.
Without folders, all content lands in the root directory and becomes unmanageable immediately.

**Nested folders:** The content tree already supports nesting ([Story 50](../pm/5-done/50-story-nested_folders_support.md)).
Folder **creation** (including nested) is tracked in [Story 63](../pm/3-stories/1-ready/63-story-folder_creation.md); treat that
as the primary backlog item rather than duplicating a “nested directories” story unless a new product gap appears.

**Scope for MVP:**

- Create folder (from the "New" menu, same as notes)
- Delete notes and folders (with confirmation; folders must be empty or recursively deleted)

### 3. Flashcard Decks and Cards

**Attachment Model (settled design decision):**
Flashcard decks are children of notes in the content hierarchy (`parentId = noteId`). They are not siblings in the
folder tree. This was chosen because:

- Keeps decks linked to the source material that generated them (chapter exercises vs. end-of-book exercises analogy)
- Enables folder-level study: "study everything under this folder" collects decks from all notes in the hierarchy
- Notes will have other attachment types in the future (images, AI-generated audio, short videos) — the attachment
  concept is first-class, not incidental
- Cleaner MCP server interface: `createDeck(parentId: noteId)` is unambiguous

**UI design:**

- Sidebar tree shows **folders and notes only** — decks are not shown in the tree (would create noise)
- Note editor has an **Attachments section** showing the note's decks (and future attachment types)
- Deck view shows the deck's cards and a Study button

**Folder-level study query:**
Decks store a denormalized `folderId` field (the folder containing their parent note) to enable efficient
`GET /content?folderId=X&type=deck` queries without traversing the full hierarchy at query time.
This is consistent with the denormalization approach already planned in Story 60.

**Scope for MVP:**

- Create a flashcard deck from the note editor's Attachments section
- Create cards inside a deck (front/back, markdown only)
- Edit and delete cards
- Delete decks

### 4. Study Mode

**Buttons (MVP):** "I know" / "I don't know" (or equivalent positive/negative pair).

**Data model (designed for future FSRS upgrade):**
Even though the UI uses two buttons, the card schema stores fields needed for spaced repetition scheduling later:
`dueDate`, `interval`, `repetitions`, `lastResult`. Upgrading to FSRS (4-button: Again/Hard/Good/Easy) later
becomes a UI change only, not a schema migration.

**Study flows:**

- Study a single deck (from the deck view)
- Study all decks under a folder (right-click folder → "Study")

**Session behavior:**

- Show cards one at a time (front → reveal back → rate)
- Cards answered "I don't know" are re-queued in the current session
- Session ends when all cards have been answered "I know" at least once

### 5. Study Result Tracking

**Per-card tracking (MVP):**
Each card stores: `lastStudied`, `correctCount`, `incorrectCount`, `lastResult`.
This is sufficient to identify cards that need improvement.

**Per-session summaries:** defer to a later iteration (useful for habit/streak tracking but not needed for
"what needs improvement").

### 6. Responsive Interface

The app must be usable on a mobile phone. This is a cross-cutting constraint, not a separate feature — every
component built for the MVP must be mobile-tested.

**Key surfaces:**

- Navigation drawer: already has mobile/desktop switching (temporary overlay on mobile)
- Note editor: full-width on mobile, no persistent sidebar
- Study mode: touch-friendly card flip, large tap targets for "I know"/"I don't know" buttons

---

## Technical Prerequisites

These are not user-facing features but are required before or alongside MVP features. Skipping them will create
compounding pain during daily use.

### TanStack Query Refactor (before note content editor)

The current `ContentContext` state management has a critical bug: navigating directly to `/notes/:id` (browser
refresh, bookmark) fails because note data only exists in `nodeMap` which is populated by browsing the tree.
This will be immediately painful in daily use.

The refactor separates server state (TanStack Query) from UI state (slim ContentContext). It must be completed
before implementing the note content editor with auto-save — without it, auto-save will trigger full tree
re-fetches on every save.

Full plan: `docs/research/client_state_management/phase_1_tanstack_query.md`

---

## Implementation Priority Order

| Priority | Feature                                                       | Depends On            |
|----------|---------------------------------------------------------------|-----------------------|
| 1        | Complete Story 53 (Tasks 4–6): note editor shell + rename API | —                     |
| 2        | TanStack Query refactor                                       | Story 53 complete     |
| 3        | Note content editor with auto-save (Story 55 → 66 → 67)       | TanStack Query        |
| 4        | Folder creation                                               | Story 53 complete     |
| 5        | Content deletion (notes + folders)                            | Story 53 complete     |
| 6        | Flashcard deck + card creation (in note editor)               | Note editor           |
| 7        | Study mode — single deck                                      | Flashcard creation    |
| 8        | Study result tracking                                         | Study mode            |
| 9        | Folder-level study ("Study all")                              | Study result tracking |
| 10       | Responsive polish (mobile testing pass)                       | All above             |

---

## Features Deliberately Deferred

The following were considered and explicitly deferred — do not implement them as part of the MVP:

| Feature                                | Reason                                                                               |
|----------------------------------------|--------------------------------------------------------------------------------------|
| Spaced repetition (FSRS / SM-2)        | Data model is upgrade-ready; UI upgrade deferred                                     |
| Per-session study summaries / streaks  | Nice-to-have; per-card tracking is sufficient                                        |
| Full-text search                       | Planned (FlexSearch, Phase 2); not needed until content volume grows                 |
| Note-to-note linking                   | Future; not needed for studying                                                      |
| Math/LaTeX in editor                   | Future; not needed for initial study domains                                         |
| Sharing / collaboration                | Out of scope for personal tool                                                       |
| Offline mode                           | Explicitly deferred; online-only for now                                             |
| MCP server for AI agents               | Planned; requires stable content model first; implement alongside content versioning |
| Content versioning + soft-delete       | Planned; implement alongside MCP server — required before MCP goes live              |
| Agent changeset approval flow          | Planned; Phase 2 after MCP server ships; see `docs/research/content_versioning.md`   |
| Flashcard deck visible in sidebar tree | UX decision; decks shown in note editor only                                         |
| Tags, favorites, focus mode            | Future organization features                                                         |
| AI-generated content (audio, video)    | Future; requires stable content + MCP foundation                                     |

---

## Success Criterion

The MVP is complete when the owner can:

1. Open the app on a laptop and a phone
2. Create a folder for a study domain (e.g., "DSA")
3. Create a note inside it and write content with code blocks
4. Create a flashcard deck attached to that note and add cards
5. Study the deck and have the results tracked
6. Right-click the folder and study all decks inside it
7. Bookmark a note URL and navigate directly to it (no "note not found" errors)
