# NEXT-STEPS.md

**Session:** 2026-06-30

## What was implemented

### Story 84 — Secondary study paths (this session)

- **Single-deck study**: "Study" button on deck view (`/decks/:deckId`) now navigates to `/decks/:deckId/study` — studies ALL cards ungraded
- **Folder-level study**: right-click folder → "Study all" navigates to `/folders/:folderId/study` — studies all cards under the folder recursively
- **Reusable `StudySession` component** extracted from `StudySessionPage` — supports both `graded` and ungraded modes
- Added `GET /api/study/folder-cards?folderId=X` backend endpoint for folder-level card collection
- Added `DeckStudyPage` and `FolderStudyPage` with ungraded study sessions
- Context menu in ContentExplorer now shows "Study all" for folders

### Previous sessions

- Stories 81–83: study dashboard, content roots, spaced repetition (PR #17)
- Responsive polish + OpenAPI regeneration (PR #18)

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
✅  Story 84  — secondary study paths (single-deck + folder-level)
✅  —        — responsive polish (cross-cutting)
```

**All MVP work plus secondary study paths are complete.**

---

## Outstanding

- **E2E tests**: Not maintained during MVP push.
- **Knowledge-area filtering**: Deferred to future story.
- **FSRS 4-button grading**: Schema-compatible upgrade deferred.

## Key design docs

- [Study dashboard design](docs/research/study_mode/study_dashboard_design.md)
- [MVP objective](docs/plans/mvp_objective.md)

## Test infrastructure

| Purpose | Container | Auth | Firestore | Storage | UI |
|---------|-----------|------|-----------|---------|----|
| API unit tests | `sapie-firebase-test-emulator` | 9098 | — | 9199 | 4001 |
| Local dev | `sapie-firebase-local-dev` | 9100 | 9200 | 9199 | 4002 |

Backend tests: `cd packages/api && pnpm test` (108 tests, 9 suites)
Web tests: `cd packages/web && pnpm test` (71 tests, 17 suites)
Full verify: `pnpm run verify`
