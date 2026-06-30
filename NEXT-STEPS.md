# NEXT-STEPS.md

**Session:** 2026-06-30

## What was implemented

### Stories 81–83 (previous session)
Implemented the full study workflow: content roots, study dashboard, and spaced repetition. Merged via PR #17.

### Responsive polish + OpenAPI regeneration (this session)

- **OpenAPI client regenerated** — new routes from Stories 75, 81, 82, 83 are now in the generated `api-client`
- **StudyDashboard** — responsive padding, full-width checkboxes, "Start Study" button stacks on mobile
- **StudySessionPage** — responsive padding, "I know"/"I don't know" buttons stack vertically on narrow screens, full-width on mobile
- **FolderPage** — tag autocomplete full-width on mobile (was fixed 300px)

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
✅  —        — responsive polish (cross-cutting)
```

**All MVP work is complete.** The study tool is fully functional: create notes and decks, tag folders as content roots, study due cards with SM-2 spaced repetition, all responsive for mobile.

---

## Outstanding

- **E2E tests**: Not maintained during MVP push (per contributing guidelines).
- **Secondary study paths**: Single-deck "Study" button on deck view, folder-level "Study all" from right-click (ungraded review — no scheduling impact). Deferred per MVP scope.
- **Knowledge-area filtering**: Deferred to future story.
- **FSRS 4-button grading**: Schema-compatible upgrade deferred.

## Key design docs

- [Study dashboard design](docs/research/study_mode/study_dashboard_design.md)
- [Blob storage model proposal](docs/research/note_editor/blob_storage_model_proposal.md)
- [MVP objective](docs/plans/mvp_objective.md)
- [Architecture review cycle](docs/dev/architecture_review_cycle.md)

## Test infrastructure

| Purpose | Container | Auth | Firestore | Storage | UI |
|---------|-----------|------|-----------|---------|----|
| API unit tests | `sapie-firebase-test-emulator` | 9098 | — | 9199 | 4001 |
| Local dev | `sapie-firebase-local-dev` | 9100 | 9200 | 9199 | 4002 |

Start local dev: `bash scripts/dev-local.sh`
Test user: `test@sapie.dev` / `test1234`
Backend tests: `cd packages/api && pnpm test` (108 tests, 9 suites)
Web tests: `cd packages/web && pnpm test` (71 tests, 17 suites)
Full verify: `pnpm run verify`
OpenAPI regen: `cd packages/web && pnpm run generate:api-client` (needs dev server on :3000)
