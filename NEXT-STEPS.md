# NEXT-STEPS.md

**Session:** 2026-07-02

### This session

- **CLI Phase 2**: Google Sign-In, MarkdownService (blob URL translation), `sapie status`, `sapie deck` subcommands
- **Branch**: `feat/cli-phase2` (feature branch from main)
- **Nock fix**: Updated `test/setup.ts` to suppress nock v14 `uncaughtException` events (pre-existing issue with IPv6/lifecycle artifacts)

## What was implemented

### Sapie Sync CLI — Phase 2 (this session, branch `feat/cli-phase2`)

- **Google Sign-In**: `sapie login --method google` starts OAuth callback server, opens browser, exchanges auth code for Firebase tokens. Requires `googleClientId` in `.sapie/config.json`. `--method email` fallback for headless/CI.
- **MarkdownService**: Regex-based blob URL translation (`transformImageUrls`, `findBlobUrls`, `validate`, `parseBlobUrl`). Integrated into pull (remote→local) and push (local→remote). Uses pure regex instead of mdast (ESM incompatible with CJS tsconfig). Service class is indirection layer for future ESM migration.
- **`sapie status`**: Dry-run change detection showing creates, modifies, renames, moves, deletes, deck card changes. Reuses push change detection logic.
- **`sapie deck`**: Subcommands `create`, `ls`, `add`, `edit`, `rm` for local flashcard deck management. Offline-only (no API calls).
- **Config**: Added `googleClientId` and `authEmulatorHost` to `CliConfig`.
- **118 unit tests** (8 suites): hashing, token-store, api-client, state, pull, push, smoke, markdown
- **QA verified**: All commands display help, deck create/ls/add/edit/rm round-trip works, status reports auth requirement

### Sapie Sync CLI — Phase 1 (previous session, PR #27 + follow-up fb88e63)

- **New package `packages/cli/`**: `@sapie/cli` — `sapie` binary with `login`, `logout`, `pull`, `push` subcommands
- **Auth**: email/password login via Firebase Auth REST API, token refresh, logout
- **API client**: typed HTTP wrapper (axios) with Bearer token injection, ApiError (RFC 7807)
- **State management**: `.sapie/state.json` read/write, SHA-256 content hashing
- **Pull**: recursive tree walk, writes notes/folders/decks to local workspace
- **Push**: change detection, CRUD, 409 conflict handling
- **AGENTS.md + .gitignore generation** on first pull

---

## MVP progress

```
✅  Story 53–84    — All MVP stories plus secondary study paths
✅  CLI Phase 1    — Sapie Sync CLI (pull, push, login, logout)
✅  CLI Phase 2    — Google Sign-In, MarkdownService, status, deck
```

**All MVP work is complete. CLI Phase 2 adds Google auth, blob URL translation, status, and deck commands.**

---

## Outstanding

- **CLI Phase 3**: pessimistic locking, parallel body downloads, shared packages (`@sapie/markdown`, `@sapie/validation`)
- **Additional tests**: Google auth tests, status service tests, deck command tests (delegated to subagents)
- **E2E tests**: Not maintained during MVP push.
- **Blob/image sync**: URL translation infrastructure is in place; binary blob download/upload deferred.
- **Google Sign-In real auth testing**: Requires valid `googleClientId` from Firebase Console.
- **Knowledge-area filtering**: Deferred to future story.
- **FSRS 4-button grading**: Schema-compatible upgrade deferred.

## Known issues

- **Nock v14 lifecycle**: `pnpm test` (all suites together) may fail with `ECONNREFUSED` from nock IPv6/lifecycle artifacts. Individual suites pass. `test/setup.ts` has been updated to suppress these but the underlying nock bug remains. Tracked in nock v14 issue tracker.
- **MarkdownService regex**: Uses regex instead of AST parsing (ESM incompatibility). Works correctly for standard markdown images but does not distinguish code blocks from regular text. Acceptable for MVP; full AST parser planned for Phase 3 `@sapie/markdown` extraction.

## Key design docs

- [Sapie Sync CLI proposal](docs/research/sapie_sync_cli_proposal.md)
- [Study dashboard design](docs/research/study_mode/study_dashboard_design.md)
- [MVP objective](docs/plans/mvp_objective.md)

## Test infrastructure

| Purpose | Container | Auth | Firestore | Storage | UI |
|---------|-----------|------|-----------|---------|----|
| API unit tests | `sapie-firebase-test-emulator` | 9098 | — | 9199 | 4001 |
| Local dev | `sapie-firebase-local-dev` | 9100 | 9200 | 9199 | 4002 |
| CLI unit tests | — (nock + real fs, no emulator) | — | — | — | — |

Backend tests: `cd packages/api && pnpm test` (108 tests, 9 suites)
Web tests: `cd packages/web && pnpm test` (71 tests, 17 suites)
CLI tests: `cd packages/cli && pnpm test` (118 tests, 8 suites)
Full verify: `pnpm run verify`
