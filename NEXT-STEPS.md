# NEXT-STEPS.md

**Session:** 2026-07-02

### This session

- **CLI Phase 3**: Pessimistic locking (API endpoints + CLI integration), parallel body downloads on pull
- **Branch**: `feat/cli-phase3` (feature branch from main)
- **Docs cleanup**: Updated `packages/cli/AGENTS.md` and `.cursor/skills/sapie-cli/SKILL.md` with Phase 2 additions

## What was implemented

### Sapie Sync CLI — Phase 3 (this session, branch `feat/cli-phase3`)

- **Lock API endpoints** (`packages/api/src/sync/`): `POST /api/sync/lock`, `DELETE /api/sync/lock`, `GET /api/sync/lock`. Single-user pessimistic locking with 5-min auto-expiry, Firestore-backed. Force-release via `?force=true` for stale lock cleanup. 9 controller tests.
- **Lock integration in push**: Acquires lock before change detection, releases in `finally`. Handles 409 (conflict → abort with details), 404 (endpoint not available → proceed without locking for backward compat). `--abort` flag on `sapie push` for force-release.
- **Parallel body downloads on pull**: Two-pass strategy — BFS discovery collects note metadata, then parallel body downloads with concurrency cap (5). Same results as sequential pull; faster on multi-note trees.
- **Docs**: `packages/cli/AGENTS.md` updated with `status`, `deck` commands + all Phase 2 services + full test file list. `.cursor/skills/sapie-cli/SKILL.md` updated with Phase 3 deferral notes + expanded key files table.

### Sapie Sync CLI — Phase 2 (previous session, PR #28)

- **Google Sign-In**: `sapie login --method google` starts OAuth callback server, opens browser, exchanges auth code for Firebase tokens. Requires `googleClientId` in `.sapie/config.json`.
- **MarkdownService**: Regex-based blob URL translation (`transformImageUrls`, `findBlobUrls`, `validate`, `parseBlobUrl`). Integrated into pull and push.
- **`sapie status`**: Dry-run change detection. **`sapie deck`**: Subcommands `create`, `ls`, `add`, `edit`, `rm`.

### Sapie Sync CLI — Phase 1 (PR #27)

- **New package `packages/cli/`**: `sapie` binary with `login`, `logout`, `pull`, `push` subcommands
- **Auth**: email/password login via Firebase Auth REST API, token refresh, logout
- **API client**: typed HTTP wrapper (axios) with Bearer token injection
- **State management**: `.sapie/state.json` read/write, SHA-256 content hashing
- **Pull/Push**: recursive tree walk, change detection, CRUD, 409 conflict handling

---

## MVP progress

```
✅  Story 53–84    — All MVP stories plus secondary study paths
✅  CLI Phase 1    — Sapie Sync CLI (pull, push, login, logout)
✅  CLI Phase 2    — Google Sign-In, MarkdownService, status, deck
✅  CLI Phase 3    — Pessimistic locking, parallel body downloads
```

**All three CLI phases are complete.** Shared packages (`@sapie/markdown`, `@sapie/validation`) deferred until a second consumer exists.

---

## Outstanding

- **Shared packages**: `@sapie/markdown` and `@sapie/validation` extraction — deferred until API needs them (second consumer)
- **MarkdownService AST upgrade**: Regex → mdast — blocked until CLI tsconfig switches to ESM or a bundler is added
- **Blob/image sync**: URL translation infrastructure is in place; binary blob download/upload deferred
- **Google Sign-In real auth testing**: Requires valid `googleClientId` from Firebase Console
- **Lock-aware web UI middleware**: API rejects web writes while a CLI lock is held — deferred (tracked in `docs/research/sapie_sync_locking_roadmap.md`)
- **FSRS 4-button grading**: Schema-compatible upgrade deferred

## Known issues

- **Nock v14 lifecycle**: `pnpm test` (all suites together) may fail with `ECONNREFUSED` from nock IPv6/lifecycle artifacts. Individual suites pass. `test/setup.ts` suppresses these.
- **MarkdownService regex**: Uses regex instead of AST parsing (ESM incompatibility). Does not distinguish code blocks from regular text. Acceptable for MVP.
- **Lock not required for push**: When the lock API endpoint returns 404 (not yet deployed), push proceeds without locking. This is intentional backward compatibility.

## Key design docs

- [Sapie Sync CLI proposal](docs/research/sapie_sync_cli_proposal.md)
- [Study dashboard design](docs/research/study_mode/study_dashboard_design.md)
- [MVP objective](docs/plans/mvp_objective.md)

## Test infrastructure

| Purpose | Container | Auth | Firestore | Storage | UI |
|---------|-----------|------|-----------|---------|----|
| API unit tests | `sapie-firebase-test-emulator` | 9098 | 8181 | 9199 | 4001 |
| Local dev | `sapie-firebase-local-dev` | 9100 | 9200 | 9199 | 4002 |
| CLI unit tests | — (nock + real fs, no emulator) | — | — | — | — |

Backend tests: `cd packages/api && pnpm test` (121 tests, 11 suites)
Web tests: `cd packages/web && pnpm test` (71 tests, 17 suites)
CLI tests: `cd packages/cli && pnpm test` (141 tests, 11 suites)
Full verify: `pnpm run verify`
