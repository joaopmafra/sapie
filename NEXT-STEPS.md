# NEXT-STEPS.md

**Last updated:** 2026-07-09

## Today's priorities (2026-07-09)

1. **Implement the storage model refactor** — full design in [docs/dev/storage_model_refactor.md](docs/dev/storage_model_refactor.md):
   - Discriminated union for `Content` (Directory | Note | Deck)
   - Rename `folderId` → `directoryId` across the entire stack
   - Cards as a standalone `cards` collection (migrate from subcollection)
   - Study results as a separate `study_results` collection
   - Fix `findAllDescendantIds` bug (directory deletion misses deck children)

2. **Test the local workspace copy feature by hand:**
   - Improve the seed script (`scripts/seed-dev-data.ts`) — add decks to the seed tree
   - Deploy to staging
   - Run through the full study flow manually

3. **Create the production environment** — provision `sapie.app` Firebase project, configure auth, Firestore rules, GCS bucket.

4. **Deploy to production.**

5. **Test the whole app in production** — create content, study, verify persistence.

---

## MVP status: COMPLETE (as of 2026-07-03)

All planned MVP stories (53–84) were implemented and merged to main. The storage model refactor and production deployment are post-MVP work.

| Priority | Feature | Story | Status | Merged |
|----------|---------|-------|--------|--------|
| — | Note editor shell + rename | 53 | done | PR #4 |
| — | TanStack Query refactor | 62 | done | PR #6 |
| — | Note content editor + auto-save | 55, 66, 67 | done | PRs #8, #9, #10 |
| — | Folder creation | 63 | done | PR #11 |
| — | Blob storage model | 75 | done | PR #15 |
| — | Content deletion (notes + folders) | 64 | done | PR #16 |
| — | Flashcard deck CRUD | 76 | done | PR #16 |
| — | Flashcard card CRUD | 77 | done | PR #16 |
| — | Content roots + tags | 81 | done | PR #17 |
| — | Study dashboard + due cards | 82 | done | PR #17 |
| — | Spaced repetition + result tracking | 83 | done | PR #17 |
| — | Secondary study paths (single deck, folder-level) | 84 | done | PR #19 |
| — | CLI blob/image sync | 75 (CLI) | done | PR #31 |

---

## Post-MVP work

| Item | Status |
|------|--------|
| Storage model refactor | Design approved — implementing today |
| Staging deployment + manual test | Today |
| Production environment + deploy | Today |

---

## Postponed

| Item | Reason |
|------|--------|
| Responsive mobile polish | Cross-cutting, non-blocking for core study flow |
| Shared packages (`@sapie/markdown`, `@sapie/validation`) | Deferred until a second consumer exists |
| MarkdownService AST upgrade | Blocked on ESM tsconfig; regex is sufficient for MVP |
| API key auth | Not started; separate from study flow |
| Google Sign-In real auth testing | Requires valid `googleClientId` |
| Lock-aware web UI middleware | Deferred (see locking roadmap) |
| FSRS 4-button grading | Schema-compatible upgrade deferred |
| Content versioning (snapshots, soft-delete, operation log) | Required before MCP server goes live |
| E2E tests | Not maintained during MVP push |

---

## Test results (verified 2026-07-03)

| Package | Tests | Suites | Command |
|---------|-------|--------|---------|
| API | 121 | 11 | `cd packages/api && pnpm test` |
| Web | 71 | 17 | `cd packages/web && pnpm test` |
| CLI | 148 | 12 | `cd packages/cli && npx jest --testPathIgnorePatterns="google-auth" --forceExit` |
| **Total** | **340** | **40** | |
| Verify | 0 errors | — | `pnpm run verify` |

## Test infrastructure

| Purpose | Container | Auth | Firestore | Storage | UI |
|---------|-----------|------|-----------|---------|----|
| API unit tests | `sapie-firebase-test-emulator` | 9098 | 8181 | 9199 | 4001 |
| Local dev | `sapie-firebase-local-dev` | 9100 | 9200 | 9199 | 4002 |
| CLI unit tests | — (nock + real fs, no emulator) | — | — | — | — |

## Known issues

- **Nock v14 lifecycle**: `pnpm test` (all suites) may fail with `ECONNREFUSED`. Individual suites pass. `test/setup.ts` suppresses these.
- **MarkdownService regex**: Uses regex instead of AST parsing (ESM incompatibility). Acceptable for MVP.
- **Lock not required for push**: When lock API returns 404, push proceeds without locking (backward compat).

## Key design docs

- [MVP objective](docs/plans/mvp_objective.md)
- [Storage model refactor](docs/dev/storage_model_refactor.md)
- [Sapie Sync CLI proposal](docs/research/sapie_sync_cli_proposal.md)
- [Study dashboard design](docs/research/study_mode/study_dashboard_design.md)
- [Content versioning](docs/research/content_versioning.md)
- [Dev tooling infrastructure](docs/dev/dev_tooling_infrastructure.md)
- [Innovative learning features brainstorm](docs/research/inovative_learning_features.md)
- [Innovative learning features assessment](docs/research/inovative_learning_features_assessment.md)
