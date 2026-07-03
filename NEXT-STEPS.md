# NEXT-STEPS.md

**Session:** 2026-07-03

### This session

- **PR #30 merged**: CLI init/auth simplification (`--url`/`--auth` flags, `-f`/`-u`/`-a` short opts, CWD default, `-h` fix, shared `promptEmailPassword()`, `environments.ts`). 10 files, +288/−123. Merged to `main`.
- **Investigated blob sync gap**: Only markdown URL rewriting exists (`blobs/{blobId}` ↔ `/api/content/{id}/blobs/{blobId}`). Binary blob download/upload is NOT implemented — deferred in the CLI proposal.
- **Audited Phase 3 status**: Locking + parallel pull done (PR #29). Shared package extraction (`@sapie/markdown`, `@sapie/validation`) not started.

---

## What was implemented

### Sapie Sync CLI — init/auth simplification (this session, PR #30)

- **`sapie init`**: `--url`/`-u` for API URL, `--auth`/`-a` for auth method, `--folder`/`-f` for workspace path. CWD used as default workspace folder when no `--folder` given. `-h` shortcut for `--help` restored.
- **Shared auth prompt**: `promptEmailPassword()` extracted to `packages/cli/src/lib/auth/prompt-email-password.ts`, used by both `init` and `login`.
- **Environments**: `packages/cli/src/lib/environments.ts` with known Firebase configs (staging missing `googleClientId`, prod missing Firebase key).
- **Docs**: Updated `packages/cli/README.md`, `docs/pm/test_plans/sapie_cli_phase3_qa.md`, `docs/research/api_key_authentication.md`.

### Sapie Sync CLI — Phase 3 (previous session, PR #29)

- **Lock API endpoints** (`packages/api/src/sync/`): `POST /api/sync/lock`, `DELETE /api/sync/lock`, `GET /api/sync/lock`. Single-user pessimistic locking with 5-min auto-expiry, Firestore-backed. Force-release via `?force=true` for stale lock cleanup. 9 controller tests.
- **Lock integration in push**: Acquires lock before change detection, releases in `finally`. Handles 409 (conflict → abort with details), 404 (endpoint not available → proceed without locking for backward compat). `--abort` flag on `sapie push` for force-release.
- **Parallel body downloads on pull**: Two-pass strategy — BFS discovery collects note metadata, then parallel body downloads with concurrency cap (5). Same results as sequential pull; faster on multi-note trees.
- **Docs**: `packages/cli/AGENTS.md` updated with `status`, `deck` commands + all Phase 2 services + full test file list. `.cursor/skills/sapie-cli/SKILL.md` updated with Phase 3 deferral notes + expanded key files table.

### Sapie Sync CLI — Phase 2 (PR #28)

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

Stories 53–75 are implemented (note editor, TanStack Query, folder creation, blob storage).
CLI phases 1–3 are complete. The remaining MVP priority order:

| Priority | Feature | Story | Status |
|----------|---------|-------|--------|
| 1 | Content deletion (notes + folders) | 64 | ready — full tasks in story, deps met |
| 2 | Flashcard deck CRUD | 76 | story in 5-done, not yet implemented |
| 3 | Flashcard card CRUD | 77 | story in 5-done, not yet implemented |
| 4 | Content roots + tags | 81 | story in 5-done, not yet implemented |
| 5 | Study dashboard + due cards | 82 | story in 5-done, not yet implemented |
| 6 | Spaced repetition + result tracking | 83 | story in 5-done, not yet implemented |
| 7 | Secondary study paths (single deck, folder-level) | 78–80, 84 | story in 5-done, not yet implemented |
| 8 | Responsive mobile polish | — | cross-cutting, deferred |

Stories 71 (inline images), 74 (attachment model), 75 (blob storage) were superseded/replaced by Story 75's blob storage model.
Story 70 (URL-driven sidebar selection) is implemented.

**All three CLI phases are complete.** Shared packages (`@sapie/markdown`, `@sapie/validation`) deferred until a second consumer exists.
## Outstanding

- **Story 64 — Content deletion**: Next MVP priority. Backend: add `deleted`/`deletedAt`/`deletedBy` to `ContentDocument`, filter queries, `DELETE /api/content/:id` soft-delete endpoint with cascade. Frontend: `useDeleteContent()` hook (TODO marker exists in `content-hooks.ts`), delete button in editor, right-click delete in tree, `ConfirmDeleteDialog`, navigate away after deletion. Full tasks in `docs/pm/5-done/64-story-content_deletion.md`.
- **Shared packages**: `@sapie/markdown` and `@sapie/validation` extraction — deferred until API needs them (second consumer). Phase 3 tasks 3.4/3.5 not started.
- **Blob/image sync for CLI**: Only URL rewriting exists (Phase 2). Binary download/upload NOT implemented. Missing: `ApiClient.getBlob()`/`uploadBlob()`, `writeBlob()`/`readBlob()` in workspace service, download loop in `pull.service.ts` after body write, upload detection in `push.service.ts` change detection, blob hash in `.sapie/state.json`. API blob endpoints are live (`GET/POST /api/content/:contentId/blobs`). Listed as "Deferred (not a phase)" in the CLI proposal.
- **MarkdownService AST upgrade**: Regex → mdast — blocked until CLI tsconfig switches to ESM or a bundler is added
- **Google Sign-In real auth testing**: Requires valid `googleClientId` from Firebase Console (staging `ENVIRONMENTS` entry has empty string)
- **Prod Firebase key**: `sapie.app` entry in `environments.ts` has empty string for `firebaseApiKey`
- **API key auth (Story 76 context)**: `sapie login --api-key` + web UI + `ApiKeyGuard` — not started
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
- [Content deletion story](docs/pm/5-done/64-story-content_deletion.md)

## Test infrastructure

| Purpose | Container | Auth | Firestore | Storage | UI |
|---------|-----------|------|-----------|---------|----|
| API unit tests | `sapie-firebase-test-emulator` | 9098 | 8181 | 9199 | 4001 |
| Local dev | `sapie-firebase-local-dev` | 9100 | 9200 | 9199 | 4002 |
| CLI unit tests | — (nock + real fs, no emulator) | — | — | — | — |

Backend tests: `cd packages/api && pnpm test` (121 tests, 11 suites)
Web tests: `cd packages/web && pnpm test` (71 tests, 17 suites)
CLI tests: `cd packages/cli && pnpm test` (136 tests, 10 suites)
Full verify: `pnpm run verify`
