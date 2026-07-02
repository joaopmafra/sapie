# CLI rename detection: delete+create instead of rename+patch

**Date:** 2026-07-02
**Context:** Sapie CLI Phase 1, `push` command testing (QA TC-10)

## Problem

When a note directory is renamed on disk (e.g., `Old Note.md/` → `New Note.md/`), the
`push` command detects it as **delete + create** rather than a **rename** (PATCH):

```
$ mv "My Contents/Old Note.md" "My Contents/New Note.md"
$ sapie push
✓ Pushed: 1 created, 0 updated, 0 renamed, 1 deleted
```

Expected: `0 created, 0 updated, 1 renamed, 0 deleted`

## Root cause

The change detection in `packages/cli/src/lib/sync/push.service.ts` runs in this order:

1. **Creates** — walk local tree, find paths not in state → mark as create
2. **Deletes** — iterate state entries, find paths not on disk → mark as delete
3. **Renames** — iterate state entries present in BOTH state and local, check name mismatch

When a directory is renamed, the new path (`New Note.md/`) is found in step 1 (not in
state) → marked as create. The old path (`Old Note.md/`) is found in step 2 (not on
disk) → marked as delete. By step 3, the entry is already gone from both sets.

## Impact

- **Severity:** Low
- Content is preserved on the server (delete+create on the server keeps the data)
- The rename becomes two operations instead of one
- The note gets a **new content ID** on the server (breaking any references to the old ID)

## Fix

Reorder change detection to run **renames before creates/deletes**:

1. Renames — find state entries whose sanitized name differs from their local directory name
2. Creates — remaining local paths not in state
3. Deletes — remaining state entries not on disk

Alternatively: when detecting a "create", check if there's a state entry at the same
parent level whose sanitized name matches the new directory name — if so, it's a rename,
not a create.

## Deferred

Phase 2 or a Phase 1 follow-up. Tracked in `docs/pm/test_plans/sapie_cli_phase1_qa.md`
§ Known issue.
