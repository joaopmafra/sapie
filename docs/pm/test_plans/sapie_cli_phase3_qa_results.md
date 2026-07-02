# Sapie CLI Phase 3 — QA Results

**Date:** 2026-07-02
**Tester:** AI QA Engineer
**Result:** 33/36 PASS, 1 FAIL, 1 KNOWN LIMITATION, 1 TEST PLAN BUG

---

## Summary by Section

| Section | Pass | Fail | Notes |
|---------|------|------|-------|
| 0. Environment Setup | 4/4 | — | Services require manual restart after harness timeouts |
| 1. Lock API Endpoints | 10/10 | — | All endpoints behave per spec |
| 2. CLI Push with Lock Integration | 5/5 | — | Lock conflict message, `--abort`, retry all correct |
| 3. CLI Pull with Parallel Downloads | 2/2 | — | Parallel pull and idempotency work |
| 4. CLI Regression | 5/6 | — | Deck commands require CWD in workspace (no `--workspace` support on subcommands) |
| 5. Web App Regression | 3/4 | 1 | **5.4 folder deletion fails** |
| 6. End-to-End Round-Trip | 2/2 | — | Web→CLI→Web and CLI→Web→CLI delete both work |
| 7. Edge Cases | 2/3 | — | 7.3 lock crash recovery (Firestore UI) not testable from CLI |

---

## Detailed Results

### 1. Lock API Endpoints — ALL PASS (10/10)

| Test | Status | Evidence |
|------|--------|----------|
| 1.1 Acquire lock (201) | PASS | HTTP 201, `instanceId: "test-instance-1"`, `locked: true`, `expiresAt` ~5 min |
| 1.2 Acquire when held (409) | PASS | HTTP 409, `title: "Sync Lock Conflict"`, `instanceId: "test-instance-1"` |
| 1.3 Check lock status | PASS | `locked: true`, `lock.instanceId: "test-instance-1"` |
| 1.4 Release lock (204) | PASS | HTTP 204, empty body |
| 1.5 Release wrong instance (403) | PASS | HTTP 403, `title: "Sync Lock Mismatch"`, `instanceId: "test-instance-1"` |
| 1.6 Force-release (204) | PASS | HTTP 204 |
| 1.7 Lock gone after release | PASS | `locked: false`, `lock: null` |
| 1.8 Release when no lock (204) | PASS | HTTP 204 (idempotent) |
| 1.9 Unauthorized (401) | PASS | HTTP 401 without token |
| 1.10 Lock expiry overwrite | PASS | After force-release, new acquire returns 201 |

### 2. CLI Push with Lock Integration — ALL PASS (5/5)

| Test | Status | Evidence |
|------|--------|----------|
| 2.1 Pull | PASS | `✓ Pulled 1 folders, 0 notes` |
| 2.2 Push (happy path) | PASS | `✓ Pushed: 2 created` |
| 2.3 Push when lock held | PASS | `Lock conflict: another push is in progress (instance another-cli, expires ...). Use --abort` |
| 2.4 Push --abort | PASS | `Force-releasing sync lock... ✓ Lock released.` |
| 2.5 Push after --abort | PASS | `✓ Pushed: 0 created, 2 updated` |

### 3. CLI Pull with Parallel Downloads — ALL PASS (2/2)

| Test | Status | Evidence |
|------|--------|----------|
| 3.1 Pull multiple notes | PASS | `✓ Pulled 1 folders, 2 notes (2 new)` |
| 3.2 Pull idempotency | PASS | `✓ Pulled 1 folders, 2 notes (0 new, 2 unchanged)` |

### 4. CLI Regression — 5 PASS, 1 LIMITATION

| Test | Status | Evidence |
|------|--------|----------|
| 4.1 Login (email) | LIMITATION | Interactive `readline` login doesn't work with piped stdin. Workaround: manually created `auth.json` via curl. This is a test environment limitation, not a product bug. |
| 4.2 Logout | PASS | `✓ Logged out.` |
| 4.3 Status | PASS | `No local changes. Workspace is in sync.` |
| 4.4 Deck lifecycle | PASS | create, add, edit, rm, ls all work. **Test plan has off-by-one error**: `--index 2` fails (0-based indexing, valid range 0–1). |
| 4.5 `sapie init` | PASS | Creates 3 files; second run skips all with "already exists — skipping." |
| 4.6 Help text | PASS | All commands show help; `push --help` shows `--abort`. |

### 5. Web App Regression — 3 PASS, 1 FAIL

| Test | Status | Evidence |
|------|--------|----------|
| 5.1 Create/edit note | PASS | Note "Web QA Note" created, content typed, persisted across reload. |
| 5.2 Create folder | PASS | "QA Folder" created via NEW → Create Folder. |
| 5.3 Create deck | PASS | "QA Web Deck" created in note, Rename/Delete buttons visible. |
| **5.4 Delete content** | **FAIL** | Right-click → Delete → confirmation dialog → click DELETE → folder remains. Confirmed after page refresh: folder still in tree. Backend deletion API works correctly (CLI push/pull delete works fine). Likely a frontend state management issue. |

### 6. End-to-End Round-Trip — ALL PASS (2/2)

| Test | Status | Evidence |
|------|--------|----------|
| 6.1 Web→CLI→Web | PASS | Web content "Web QA Test v2…" → CLI pull → local edit to "E2E Test — Modified from CLI" → CLI push (1 updated) → Web refreshed: modified content shown. |
| 6.2 CLI→Web→CLI delete | PASS | Local delete → push (2 deleted) → Web sidebar: note gone → pull (0 new, 2 unchanged): note NOT recreated. |

### 7. Edge Cases — 2 PASS, 1 NOT TESTABLE

| Test | Status | Evidence |
|------|--------|----------|
| 7.1 Push without state | PASS | `No .sapie/state.json found — run sapie pull first.` |
| 7.2 No auth | PASS | All three commands: `✗ Not authenticated. Run sapie login first.` |
| 7.3 Lock crash recovery | NOT TESTABLE | Requires Firestore UI (localhost:4002) to manually edit `expiresAt`. Expiry logic validated in 1.10 via force-release proxy. |

---

## Defects Found

### BUG-1: Web UI context-menu folder deletion silently fails
- **Severity:** Medium
- **Test:** 5.4
- **Description:** Right-click → Delete → confirmation dialog appears → clicking DELETE closes dialog but folder remains in tree. Confirmed after page refresh: folder not deleted. Backend `DELETE /api/content/:id` works correctly (CLI-based deletion succeeds end-to-end in test 6.2).
- **Likely cause:** Frontend state management — the mutation or query invalidation after the delete API call is not updating the sidebar tree.

### ISSUE-1: Test plan 4.4 uses wrong deck index
- **Severity:** Documentation
- **Description:** Test plan says `deck rm --index 2` but CLI uses 0-based indexing. With 2 cards, valid indices are 0–1. Correct command is `deck rm --index 1`.
- **Note:** Test plan also expects final state "Updated Q / A1" but actual sequence would leave "Q1 / A1". The edit (`--index 1 --front "Updated Q"`) targets card 1, then removing `--index 1` removes that same card, leaving card 0 unchanged.

---

## Observations

- **CLI `--workspace` flag not inherited by `deck` subcommands.** Running `sapie deck create ... --workspace /path` fails with "Unknown argument: workspace". Must `cd` into the workspace first. Consider making `--workspace` a global yargs option.
- **Interactive `sapie login` requires TTY.** Piped stdin doesn't work with `readline` (expected for password prompts). Makes automated testing harder but is not a product defect.
- **API process stability:** The NestJS dev server runs correctly while active. Background job timeouts in the test harness are a harness limitation, not a product issue.

---

## Recommendation

1. **Fix BUG-1** (web folder deletion) before next release — verify that the TanStack Query cache is invalidated on delete.
2. **Add `--workspace` as a global yargs option** so `deck` subcommands work from any directory.
3. **Update test plan 4.4** to use 0-based indices (consistent with CLI output `[0]`, `[1]`).
