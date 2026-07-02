# Sapie CLI Phase 3 — QA Results (Session 2)

**Date:** 2026-07-02
**Tester:** AI QA Engineer
**Result:** 13/13 PASS, 0 FAIL

---

## Issues Fixed Before Testing

| Issue | Source | Fix |
|-------|--------|-----|
| **ISSUE-1**: Test plan 4.4 used wrong deck indices | Prior report | Changed `--index 1` → `--index 0` (edit), `--index 2` → `--index 1` (rm) |
| **Observation**: `--workspace` not inherited by `deck` subcommands | Prior report | Added `--workspace` option to deck command builder, resolves paths relative to workspace |
| **BUG-1**: Web folder deletion silently fails | Prior report | Added `cascade: true` to `ContentExplorer.tsx` and `NoteEditorPage.tsx` delete mutations |
| **Init output**: "already exists — skipping" shown for freshly-created files | My review | Check file existence *before* calling generator, not after |

---

## Automated Tests

| Suite | Tests | Result |
|-------|-------|--------|
| API unit tests | 121 (11 suites) | ALL PASS |
| CLI unit tests (excl. google-auth) | 136 (10 suites) | ALL PASS |

---

## Manual Smoke Tests

### Init command

| Test | Command | Result |
|------|---------|--------|
| Fresh init | `sapie init --workspace /tmp/ws --firebase-api-key "fake"` | PASS — creates `.sapie/config.json`, `AGENTS.md`, `.gitignore` |
| Config content | `cat .sapie/config.json` | PASS — contains `apiBaseUrl`, `firebaseApiKey`, `firebaseAuthDomain` |
| AGENTS.md content | `cat AGENTS.md` | PASS — mentions lock, `--abort`, `init` command |
| Idempotent init | Second `sapie init` on same workspace | PASS — skips all 3 files with "already exists — skipping" |
| Help text | `sapie init --help` | PASS — shows all 6 options |

### Deck command with --workspace

| Test | Command | Result |
|------|---------|--------|
| Create | `sapie deck create "Note.md/" --name "QA Deck" --workspace /tmp/ws` | PASS — creates `decks/QA Deck.json` |
| Add cards | `deck add ... --front "Q1" --back "A1"` (x2) | PASS — indices [0], [1] |
| List | `deck ls ...` | PASS — shows 2 cards |
| Edit index 0 | `deck edit ... --index 0 --front "Updated Q"` | PASS — card[0] updated |
| Remove index 1 | `deck rm ... --index 1` | PASS — card[1] removed |
| Final list | `deck ls ...` | PASS — 1 card: "Updated Q / A1" |
| No --workspace | `deck create ...` from CWD inside workspace | PASS — still works (relative path) |

### Verify pipeline

| Check | Result |
|-------|--------|
| `pnpm run verify:types` | PASS |
| `pnpm run lint:check` | PASS |
| `pnpm run format:check` | PASS |
| `pnpm run build` | PASS |

---

## Unchanged Files (uncommitted)

```
M  packages/cli/src/commands/deck.ts      # --workspace support
M  packages/cli/src/commands/init.ts      # fixed output messages
M  packages/web/src/components/ContentExplorer.tsx  # cascade: true
M  packages/web/src/pages/NoteEditorPage.tsx        # cascade: true
M  docs/pm/test_plans/sapie_cli_phase3_qa.md        # fixed indices
```

---

## Recommendation

Commit the above changes and merge. All fixes are low-risk — `cascade: true` is safe (soft-delete), `--workspace` is additive, and the init output fix is cosmetic.
