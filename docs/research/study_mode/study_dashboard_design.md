# Study dashboard design

**Status:** Draft — needs story creation (2026-06-30).

Replaces the contextual study launch model (Story 78 single-deck, Story 80 folder right-click) with a global study dashboard. The user opens the app, goes to Study, and sees everything due for review across all their content roots.

## Content roots

A **content root** is a folder tagged with `"content-root"` in its `tags` array. It acts as the top-level grouping for a study domain. All notes, decks, and cards under it (recursive) are aggregated for study.

- Content roots are just folders — the tag makes them roots. No new content type.
- Users create content roots once when setting up their study domains.

### Tags

Add an optional `tags: string[]` field to the `Content` document in Firestore. Two tags are relevant for study:

- **`"content-root"`** — marks a folder as a study content root. Cards under this folder appear in the study dashboard.
- **`"knowledge-area"`** — (future) an umbrella folder above content roots, e.g. a "soft-eng" knowledge area containing a "system-design" content root. For MVP, this is just another tag with no special behavior — it exists so users can organize their hierarchy. Future stories may add knowledge-area filtering to the dashboard.

A folder can have both tags (e.g. a "soft-eng" folder tagged `["knowledge-area", "content-root"]` acts as both).

### Tag UI (folder detail view)

When the user clicks a folder in the sidebar, the right panel shows the folder's metadata including tags:
- Display current tags as chips/badges.
- An "Add tag" text field with autocomplete for known tags (`content-root`, `knowledge-area`).
- An "×" button on each tag chip to remove it.

Uses the existing `PATCH /api/content/:id` endpoint extended to support `tags` updates. No validation for MVP — any folder can have any tag. Nesting rules deferred.

## Due-based scheduling

Cards have a `dueDate` field. A card is **due** when `dueDate <= now`. Only due cards appear in the study dashboard.

### Simple spaced repetition algorithm (MVP)

When a card is rated during study:

| Rating | `repetitions` | `interval` (days) | `dueDate` |
|--------|--------------|-------------------|-----------|
| "I know" | `repetitions + 1` | `2^(repetitions)` (capped at 365) | `now + interval days` |
| "I don't know" | `0` | `0` | `now` (due immediately, re-queued) |

This is a simplified SM-2. It provides actual spaced repetition (intervals grow exponentially) without the complexity of ease factors or 4-button grading. FSRS upgrade later is a schema-compatible change — only the scheduling logic changes, not the stored fields.

**Interval progression** for a card consistently rated "I know":

| Consecutive "I know" | Interval | See again |
|---------------------|----------|-----------|
| 1st | 1 day | tomorrow |
| 2nd | 2 days | 2 days |
| 3rd | 4 days | 4 days |
| 4th | 8 days | ~1 week |
| 5th | 16 days | ~2 weeks |
| 6th | 32 days | ~1 month |
| 7th | 64 days | ~2 months |
| 8th | 128 days | ~4 months |
| 9th | 256 days | ~8 months |
| 10th+ | 365 days (cap) | ~1 year |

One "I don't know" resets to interval 0 — the card is due again immediately in the same session. This means you spend time on what needs review, not on what you've mastered.

**Initial state for new cards:** `dueDate = now`, `interval = 0`, `repetitions = 0`. They appear immediately in the study dashboard.

## Study dashboard UI

### Entry point

A "Study" item in the app navigation (sidebar or top nav). Navigates to `/study`.

### Dashboard view

```
┌─────────────────────────────────────────┐
│  Study                                   │
│                                         │
│  ☑ AI Engineering         12 due        │
│  ☑ DSA                     8 due        │
│  ☑ System Design           5 due        │
│  ☐ DevSecOps               3 due        │
│                                         │
│  Total cards due: 25                    │
│                                         │
│  [ Start Study ]                        │
└─────────────────────────────────────────┘
```

- Each content root is listed with a checkbox (checked by default) and a count of due cards under it.
- The "Total cards due" sums checked roots only.
- "Start Study" is disabled when no cards are due (or no roots checked with due cards).
- If zero cards are due across all roots: show "All caught up! 🎉" with a note about when the next cards are due.

### Study session

Same as Story 78's session component, but cards come from the dashboard query instead of a single deck:

1. Front face → "Reveal" button
2. Back face → "I know" / "I don't know" buttons
3. "I don't know" → re-queue in session + persist `dueDate = now`
4. "I know" → remove from session + persist SR update
5. Session ends when all cards answered "I know" at least once
6. Summary: total cards, correct, incorrect
7. After summary → return to dashboard (which now shows updated counts)

### Mobile

- Full-width cards, large tap targets (minimum 48px)
- Buttons stacked vertically: Reveal → I know / I don't know
- Content root checkboxes are full-width rows for easy tapping

## Backend API

### New / modified endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/content/roots` | List all content roots (folders with `tags` containing `"content-root"`) for the current user |
| `GET` | `/api/study/due-cards?rootIds=id1,id2` | Returns all due cards (`dueDate <= now`) from decks under the given content roots. Returns cards with their deck info for context. |
| `PATCH` | `/api/content/:deckId/cards/:cardId/study-result` | Rate a card (same as Story 79, but with SR algorithm applied) |
| `PATCH` | `/api/content/:id` | Existing — add support for `tags` field update |

### `GET /api/study/due-cards`

Query: `?rootIds=id1,id2,...`

Logic:
1. For each root ID, find all descendant folders recursively
2. Find all notes under those folders
3. Find all non-deleted decks under those notes (using denormalized `folderId`)
4. Find all non-deleted cards in those decks where `dueDate <= now`
5. Return cards ordered by `dueDate` ascending (oldest due first)

Response:
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

### `GET /api/content/roots`

Returns all content roots for the current user:
```json
{
  "roots": [
    {
      "id": "root1",
      "name": "AI Engineering",
      "dueCardCount": 12
    }
  ]
}
```

The `dueCardCount` is computed server-side (count of due cards under each root) so the dashboard doesn't need N+1 queries.

## Data model changes

### Content document

Add optional `tags: string[]` field to the Firestore `content` collection. A folder with `tags: ["content-root"]` is a content root.

### Card document

Existing FSRS-ready fields (`dueDate`, `interval`, `repetitions`, `lastResult`) are already in the schema from Stories 76/77. Add:
- `lastStudied: Timestamp` — when the card was last rated
- `correctCount: number` — total "I know" ratings
- `incorrectCount: number` — total "I don't know" ratings

## Implementation order

1. **Story 81 — Content roots + tags** (new): Add `tags: string[]` field to Content model, `PATCH /api/content/:id` support for tags, `GET /api/content/roots` endpoint, folder detail view with tag chips + add/remove UI.

2. **Story 82 — Study dashboard + due cards** (replaces Story 78 + 80): `GET /api/study/due-cards` endpoint, study dashboard UI at `/study`, content root checkboxes with due counts, aggregated card queue, card study session component (front → reveal → rate → summary).

3. **Story 83 — Spaced repetition + result tracking** (replaces Story 79): `PATCH .../study-result` with SM-2 algorithm, card field updates (`dueDate`, `interval`, `repetitions`, `lastStudied`, `correctCount`, `incorrectCount`).

## Secondary study paths

The dashboard is the primary study entry point, but two secondary paths remain useful:

- **Single-deck study** — "Study" button on the deck view (`/decks/:deckId`). Studies ALL cards in that deck, ignoring `dueDate`. For cramming or reviewing a specific topic regardless of schedule.
- **Folder-level study** — right-click folder → "Study all". Studies all cards under that folder, ignoring `dueDate`. For focused review sessions.

These reuse the same card session component as the dashboard. They do NOT update SR fields (no scheduling impact) — they're for ungraded review only. Story 82 should build the session component to support both graded (dashboard) and ungraded (direct) modes.

## What's superseded

- Story 78 (single deck study) — replaced by dashboard study; single-deck study kept as secondary ungraded path.
- Story 79 (study result tracking) — replaced by Story 83 with SR algorithm.
- Story 80 (folder-level study) — replaced by dashboard content-root aggregation; folder study kept as secondary ungraded path.

## Out of scope for MVP

- Four-button FSRS grading (Again/Hard/Good/Easy)
- Knowledge-area filtering in the dashboard
- Tag nesting validation (content-root under knowledge-area)
- Per-session summaries / streak tracking
- Study history / analytics
- "All caught up" detailed breakdown (just show the message)
