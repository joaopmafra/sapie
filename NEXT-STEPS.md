# NEXT-STEPS.md

**Session:** 2026-06-30

## What was implemented

### Documentation overhaul (this session)

Updated all docs to reflect the Story 75 blob storage model and established the study dashboard design:

- `docs/dev/content_naming.md` — blob vocabulary replaced attachment vocabulary
- `docs/research/note_editor/note_image_embedding.md` — full rewrite of storage + API sections
- `docs/dev/architecture_review_cycle.md` — new: critique → proposal → review → settle → implement
- `docs/research/study_mode/study_dashboard_design.md` — new: content roots, due-based SR, dashboard UI
- `docs/plans/mvp_objective.md` — study mode section rewritten, priority table updated (81→82→83)
- `.cursor/skills/implement-story/SKILL.md` — OpenAPI regeneration step, git rm/mv, conditional commit rule
- `docs/dev/ai_agent_guidelines.md` — post-backend-change checklist, git hygiene

### Previous sessions (stories shipped)

All stories through 77 are done. Stories 64, 75, 76, 77 are in `docs/pm/5-done/`.

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
❌  Story 81  — content roots + tags (PLANNED — needs story written)
❌  Story 82  — study dashboard + due cards (PLANNED — needs story written)
❌  Story 83  — spaced repetition + result tracking (PLANNED — needs story written)
❌  —        — responsive polish
```

Stories 78–80 are superseded by 81–83 and the study dashboard design.

---

## Next session: implement Stories 81 → 82 → 83

### Pre-flight

- [ ] Regenerate OpenAPI client: `cd packages/web && pnpm run generate:api-client`
- [ ] Start test infrastructure: `bash scripts/dev-local.sh`
- [ ] Move superseded stories 78–80 from `docs/pm/3-stories/1-ready/` to `docs/pm/5-done/` with a "superseded" note

### Story 81 — Content roots + tags

Write the story from `docs/research/study_mode/study_dashboard_design.md`:

- Add `tags: string[]` to Content Firestore document
- `PATCH /api/content/:id` — support `tags` updates
- `GET /api/content/roots` — list folders tagged `"content-root"` with `dueCardCount`
- Folder detail view: tag chips with add/remove UI (autocomplete for known tags)
- Tags: `"content-root"` (MVP), `"knowledge-area"` (future umbrella, no special behavior yet)

### Story 82 — Study dashboard + due cards

- `GET /api/study/due-cards?rootIds=id1,id2` — aggregate due cards from checked content roots
- Study dashboard at `/study` — content root checkboxes (checked by default), due counts, "Start Study"
- Card study session component: front → reveal → "I know" / "I don't know" → re-queue → summary
- Session component supports both graded (dashboard) and ungraded (single-deck/folder direct) modes
- "All caught up! 🎉" when zero cards due

### Story 83 — Spaced repetition + result tracking

- `PATCH /api/content/:deckId/cards/:cardId/study-result` with SM-2 algorithm
- "I know": `repetitions += 1`, `interval = 2^repetitions` (capped 365), `dueDate = now + interval`
- "I don't know": `repetitions = 0`, `interval = 0`, `dueDate = now`
- Update `lastStudied`, `correctCount`, `incorrectCount`, `lastResult`
- Per-card updates (not batched at session end)

### Responsive polish

Cross-cutting mobile testing after 81–83 ship.

---

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
