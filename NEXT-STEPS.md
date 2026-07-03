# NEXT-STEPS.md

**Session:** 2026-07-03

### This session

- **PR #30 merged**: CLI init/auth simplification.
- **PR #31 merged**: CLI blob/image sync for pull and push, dev seed tool, blob URL extension fix. 21 files, +1947/−22.
- **Investigated blob sync gap → implemented**: Binary blob download on pull, upload on push, blob hash tracking in state.
- **Dev seed tool**: `scripts/seed-dev-data.ts` + `pnpm seed` command — creates a full study workspace via Firebase Emulators.

---

## What was implemented

### Sapie Sync CLI — blob/image sync (this session, PR #31)

- **Blob download (pull):** Binary blob bytes downloaded alongside note bodies. Extension tracked and included in local markdown references (`blobs/{id}.png` not `blobs/{id}`).
- **Blob upload (push):** New/changed blobs detected and uploaded. URL transform is conditional (only known-unchanged blobs get remote URLs). BodyUpdateOp.body updated in-memory after upload.
- **Blob hash tracking:** `blobHashByContentId[contentId][blobId]` in state. `computeBlobHash()` for raw SHA-256 (no line-ending normalization).
- **`walkDir` fix:** Skips `blobs/` and `decks/` directories.
- **`findLocalBlobRefs()`** in MarkdownService.
- **Content-type mapping:** `packages/cli/src/lib/blob/content-type.ts`.
- **Tests:** 12 new integration tests (6 pull-blobs, 6 push-blobs). 148 total CLI tests (12 suites).
- **Dev seed tool:** `scripts/seed-dev-data.ts` — standalone script using Firebase Emulators (not CLI ApiClient). `pnpm seed` command. Design doc at `docs/dev/dev_tooling_infrastructure.md`. Maintenance contract in root AGENTS.md.
- **Docs:** QA test plan updated with seed tool section. `docs/dev/dev_tooling_infrastructure.md` captures migration path to `qa/`.

### Sapie Sync CLI — init/auth simplification (PR #30)

- **`sapie init`**: `--url`/`-u` for API URL, `--auth`/`-a` for auth method, `--folder`/`-f` for workspace path.

### Sapie Sync CLI — Phase 3 (PR #29)

- **Lock API endpoints + lock-integrated push + parallel pull.**

### Sapie Sync CLI — Phases 1–2 (PRs #27, #28)

- CLI binary, auth, pull/push, MarkdownService, status, deck.

---

## MVP progress

Stories 53–75 are implemented. CLI blob sync is complete. The remaining MVP priority order:

| Priority | Feature | Story | Status |
|----------|---------|-------|--------|
| 1 | Content deletion (notes + folders) | 64 | ready — full tasks in story, deps met |
| 2 | Flashcard deck CRUD | 76 | story in 5-done, not yet implemented |
| 3 | Flashcard card CRUD | 77 | story in 5-done, not yet implemented |
| 4 | Content roots + tags | 81 | story in 5-done, not yet implemented |
| 5 | Study dashboard + due cards | 82 | story in 5-done, not yet implemented |
| 6 | Spaced repetition + result tracking | 83 | story in 5-done, not yet implemented |
| 7 | Secondary study paths (single deck, folder-level) | 78–80, 84 | stories in 5-done, not yet implemented |

**Done:** Stories 53–75, CLI blob sync, CLI phases 1–3, dev seed tool.

---

## Postponed (not for MVP today)

| Item | Reason |
|------|--------|
| Responsive mobile polish | Cross-cutting, non-blocking for core study flow |
| Shared packages (`@sapie/markdown`, `@sapie/validation`) | Deferred until a second consumer exists |
| MarkdownService AST upgrade | Blocked on ESM tsconfig; regex is sufficient for MVP |
| Prod Firebase key (`sapie.app`) | Not yet provisioned |
| API key auth | Not started; separate from study flow |
| Google Sign-In real auth testing | Requires valid `googleClientId` |
| Lock-aware web UI middleware | Deferred (see locking roadmap) |
| FSRS 4-button grading | Schema-compatible upgrade deferred |

---

## Next implementation cycle (MVP completion)

### Target: complete Stories 64, 76, 77, 81, 82, 83, 78-80, 84

**Phase A — Content deletion (Story 64)**

Backend: `deleted`/`deletedAt`/`deletedBy` fields on `ContentDocument`, filter queries, `DELETE /api/content/:id` soft-delete with cascade. Frontend: `useDeleteContent()` hook, delete button in editor, right-click delete in tree, `ConfirmDeleteDialog`, navigate away after deletion.

**Phase B — Flashcard decks + cards (Stories 76, 77)**

Deck CRUD: create/edit/delete decks attached to notes. Card CRUD: add/edit/delete cards within decks. Frontend: deck panel in note editor, card list with add/edit/delete.

**Phase C — Content roots + tags (Story 81)**

Backend: tag support on folders, content root concept. Frontend: tag display in tree, tag-based filtering.

**Phase D — Study mode (Stories 78–80, 82–84)**

Study dashboard showing due cards. Single-deck study with "I know" / "I don't know" buttons. Study result tracking per card. Folder-level study ("Study all" from context menu). Spaced repetition scheduling.

---

## Outstanding

- **Story 64 — Content deletion**: Next MVP priority. Full tasks in `docs/pm/5-done/64-story-content_deletion.md`.
- **Stories 76–84**: Flashcard decks, cards, study mode — stories in `docs/pm/5-done/`.
- **Lock-aware web UI middleware**: Deferred.
- **FSRS 4-button grading**: Deferred.

## Known issues

- **Nock v14 lifecycle**: `pnpm test` (all suites) may fail with `ECONNREFUSED`. Individual suites pass. `test/setup.ts` suppresses these.
- **MarkdownService regex**: Uses regex instead of AST parsing (ESM incompatibility). Acceptable for MVP.
- **Lock not required for push**: When lock API returns 404, push proceeds without locking (backward compat).

## Key design docs

- [Sapie Sync CLI proposal](docs/research/sapie_sync_cli_proposal.md)
- [Study dashboard design](docs/research/study_mode/study_dashboard_design.md)
- [MVP objective](docs/plans/mvp_objective.md)
- [Content deletion story](docs/pm/5-done/64-story-content_deletion.md)
- [Dev tooling infrastructure](docs/dev/dev_tooling_infrastructure.md)

## Test infrastructure

| Purpose | Container | Auth | Firestore | Storage | UI |
|---------|-----------|------|-----------|---------|----|
| API unit tests | `sapie-firebase-test-emulator` | 9098 | 8181 | 9199 | 4001 |
| Local dev | `sapie-firebase-local-dev` | 9100 | 9200 | 9199 | 4002 |
| CLI unit tests | — (nock + real fs, no emulator) | — | — | — | — |

Backend tests: `cd packages/api && pnpm test` (121 tests, 11 suites)
Web tests: `cd packages/web && pnpm test` (71 tests, 17 suites)
CLI tests: `cd packages/cli && pnpm test` (148 tests, 12 suites)
Full verify: `pnpm run verify`
