# NEXT-STEPS.md

**Session:** 2026-07-02

## What was implemented

### Sapie Sync CLI — Phase 1 (this session, PR #27)

- **New package `packages/cli/`**: `@sapie/cli` — `sapie` binary with `login`, `logout`, `pull`, `push` subcommands
- **Auth**: email/password login via Firebase Auth REST API, token refresh, logout
- **API client**: typed HTTP wrapper (axios) with Bearer token injection, ApiError (RFC 7807)
- **State management**: `.sapie/state.json` read/write, SHA-256 content hashing (LF-normalized bodies, canonical card data)
- **Pull**: recursive tree walk, writes notes (`.md/` dirs with `index.md`), folders, decks (JSON) to local workspace
- **Push**: change detection (creates, body updates, renames, deletes), deck card CRUD, 409 conflict handling
- **AGENTS.md + .gitignore generation** on first pull
- **92 unit tests** (6 suites): hashing, token-store, api-client, state, pull, push
- **Root scripts updated**: `verify-all.sh`, `lint-all.sh`, `format-all.sh`, `verify-all-test-unit.sh` now cover `packages/cli/`

### Previous sessions

- Story 84 — Secondary study paths (PR #??)
- Stories 81–83: study dashboard, content roots, spaced repetition (PR #17)
- Responsive polish + OpenAPI regeneration (PR #18)

---

## MVP progress

```
✅  Story 53–84    — All MVP stories plus secondary study paths
✅  CLI Phase 1    — Sapie Sync CLI (pull, push, login, logout)
```

**All MVP work is complete. CLI Phase 1 adds offline/AI-agent editing surface.**

---

## Outstanding

- **CLI Phase 2**: Google Sign-In, markdown link translation, `sapie status`, `sapie deck` subcommands
- **CLI Phase 3**: pessimistic locking, parallel body downloads, shared packages (`@sapie/markdown`, `@sapie/validation`)
- **E2E tests**: Not maintained during MVP push.
- **Knowledge-area filtering**: Deferred to future story.
- **FSRS 4-button grading**: Schema-compatible upgrade deferred.

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
CLI tests: `cd packages/cli && pnpm test` (92 tests, 6 suites)
Full verify: `pnpm run verify`
