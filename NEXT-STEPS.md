# NEXT-STEPS.md

**Last updated:** 2026-07-09

## Done today (2026-07-09)

1. **Storage model refactor implemented** — full design from [docs/dev/storage_model_refactor.md](docs/dev/storage_model_refactor.md):
   - ✅ **Discriminated union** for `Content` (`Directory | Note | Deck`) — compiler-enforced type safety
   - ✅ **`folderId` → `directoryId`** — renamed across entire stack (API, web, CLI, docs)
   - ✅ **Cards as standalone `cards` collection** — moved from subcollection to top-level
   - ✅ **Study results as `study_results` collection** — separated scheduling state from card content
   - ✅ **`findAllDescendantIds` fix** — now collects deck children of notes for correct directory deletion
   - ✅ **Documentation updated** — `docs/dev/storage_model.md` rewritten

2. **Migration script created** — `scripts/migrate-storage-model.ts` for Firestore data conversion

3. **All tests passing:**
   - API: 121 passing, 11 suites
   - Web: 71 passing, 17 suites

---

## Today's remaining priorities

1. **Test the local workspace copy feature by hand:**
   - Improve the seed script (`scripts/seed-dev-data.ts`) — add decks to the seed tree
   - Deploy to staging
   - Run through the full study flow manually

2. **Create the production environment** — provision `sapie.app` Firebase project

3. **Deploy to production.**

4. **Test the whole app in production.**

---

## Post-MVP work

| Item | Status |
|------|--------|
| Storage model refactor | ✅ Done (2026-07-09) |
| Staging deployment + manual test | Today |
| Production environment + deploy | Today |

---

## Test results (verified 2026-07-09)

| Package | Tests | Suites | Command |
|---------|-------|--------|---------|
| API | 121 | 11 | `cd packages/api && pnpm test` |
| Web | 71 | 17 | `cd packages/web && pnpm test` |
| CLI | 148 | 12 | `cd packages/cli && npx jest --testPathIgnorePatterns="google-auth" --forceExit` |
| **Total** | **340** | **40** | |
| Verify | 0 errors | — | `pnpm run verify` |
