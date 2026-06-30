# NEXT-STEPS.md

**Session:** 2026-06-30

## What was implemented

### Stories 81–83 (this session)

Implemented the full study workflow: content roots, study dashboard, and spaced repetition.

#### Story 81 — Content roots + tags

- Added `tags: string[]` field to Content Firestore document (entity, DTO, repository, service, controller)
- Extended `PATCH /api/content/:id` to support `tags` updates alongside `name`
- Added `GET /api/content/roots` endpoint — lists folders tagged `"content-root"` with server-computed `dueCardCount`
- Folder detail view now shows tag chips (add/remove with autocomplete for known tags: `content-root`, `knowledge-area`)

#### Story 82 — Study dashboard + due cards

- Created `StudyModule` with `GET /api/study/due-cards?rootIds=id1,id2` endpoint
- Aggregates due cards from decks under content roots (recursive folder traversal)
- Returns cards ordered by `dueDate` ascending with deck context (deckName, noteId)
- Study dashboard at `/study` — content root checkboxes with due counts, "Start Study" button
- Study session at `/study/session` — card study UI: front → reveal → "I know" / "I don't know"
- Queue logic: "I don't know" re-queues, "I know" removes; session ends when all answered "I know"
- Session summary with correct/incorrect counts
- "All caught up! 🎉" empty states
- "Study" button in navigation drawer sidebar
- Mobile-friendly layout (full-width cards, large tap targets)

#### Story 83 — Spaced repetition + result tracking

- Added `PATCH /api/content/:deckId/cards/:cardId/study-result` endpoint with SM-2 algorithm
- "I know": `repetitions += 1`, `interval = 2^repetitions` (capped 365), `dueDate = now + interval`
- "I don't know": `repetitions = 0`, `interval = 0`, `dueDate = now`
- Updates `lastStudied`, `correctCount`, `incorrectCount`, `lastResult`
- Per-card persistence (immediate, not batched)
- Study session wired to API — each rating persists immediately
- Dashboard due counts invalidated after session completion

### Previous sessions (stories shipped)

All stories through 83 are done. Stories 64, 75, 76, 77, 81–83 are in `docs/pm/5-done/`. Stories 78–80 are superseded and moved to `docs/pm/5-done/`.

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
✅  Story 71  — inline images (interim, superseded)
✅  Story 74  — attachment subcollection model (superseded by 75)
✅  Story 75  — blob storage model (GCS-only, single POST)
✅  Story 64  — content deletion (soft-delete + cascade)
✅  Story 76  — flashcard deck CRUD
✅  Story 77  — flashcard card CRUD
✅  Story 81  — content roots + tags
✅  Story 82  — study dashboard + due cards
✅  Story 83  — spaced repetition + result tracking
❌  —        — responsive polish (cross-cutting)
```

All planned MVP stories are now **done**. Study mode is functional: tag folders as content roots, visit `/study` to see due cards, start a study session, rate cards with SM-2 spaced repetition.

---

## Outstanding

- **OpenAPI client regeneration**: Still needs dev server running (`bash scripts/dev-local.sh` then `cd packages/web && pnpm run generate:api-client`). The generated `api-client` directory was restored from git for now.
- **Responsive polish**: Cross-cutting mobile testing pass.
- **E2E tests**: Not maintained during MVP push (per contributing guidelines).

## Key design docs

- [Study dashboard design](docs/research/study_mode/study_dashboard_design.md) — authoritative spec for 81–83
- [Blob storage model proposal](docs/research/note_editor/blob_storage_model_proposal.md) — current image model
- [MVP objective](docs/plans/mvp_objective.md) — priority order, settled decisions, deferred items
- [Architecture review cycle](docs/dev/architecture_review_cycle.md) — when to use structured design review
- [Implement story skill](.cursor/skills/implement-story/SKILL.md) — end-to-end story workflow

## Test infrastructure

| Purpose | Container | Auth | Firestore | Storage | UI |
|---------|-----------|------|-----------|---------|----|
| API unit tests | `sapie-firebase-test-emulator` | 9098 | — | 9199 | 4001 |
| Local dev | `sapie-firebase-local-dev` | 9100 | 9200 | 9199 | 4002 |

Start local dev: `bash scripts/dev-local.sh`
Test user: `test@sapie.dev` / `test1234` (create via Auth emulator REST API on port 9100)

Backend tests: `cd packages/api && pnpm test` (108 tests, 9 suites)
Web tests: `cd packages/web && pnpm test` (71 tests, 17 suites)
Full verify: `pnpm run verify` (format + lint + types)
