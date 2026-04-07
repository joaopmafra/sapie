# AI agent guidelines

Rules for automated assistants (Cursor, Copilot, etc.) working on Sapie. Human contributors should read
[contributing_guidelines.md](contributing_guidelines.md) first. Product priority is always **MVP quickly**
([general.mdc](../../.cursor/rules/general.mdc), [mvp_objective.md](../research/mvp_objective.md)).

## Delivery style

Prefer **small, end-to-end slices** ([iterative_development.md](iterative_development.md)): simplest thing that works, then
extend. Do not gold-plate architecture while the study tool is still incomplete.

## Story execution

- Read the full story before changing code.
- Follow task order; if you cannot, ask the user.
- Complete implementation, tests (when the story requires them), and documentation updates for tasks you touch.
- Check acceptance criteria before calling a task done.
- Mark checklist items in the story as you go; **do not** mark the whole story “done” — the human verifies and moves
  PM files.

## Verification after changes

Run scripts after substantive edits (exact names may vary; use repo scripts):

- `./scripts/format-lint-all.sh` after code changes
- `./scripts/verify-all.sh` before claiming work is clean
- `./scripts/build-test-all.sh` when tests are part of the deliverable

If a script fails, fix or report before moving on.

## Honesty and verification

**Do not claim what you have not verified.**

- Before marking a **test** task complete: run the relevant tests; they must pass. Inspecting code is not enough.
- Before claiming an endpoint or feature works: confirm it exists in the codebase (and run it when feasible).
- If something is deferred or unknown, say so — e.g. “implementation done, tests deferred per story,” “cannot run
  tests in this environment.”

Avoid confident language (“all tests pass,” “comprehensive coverage”) unless you actually ran the tests and checked the
scope.

### Repository hygiene

- Do **not** commit for the user; stage and let them review and commit.
- Delete files only when part of the task (e.g. rename removes the old path).
- Remove unused dependencies and dead code from abandoned approaches.

## Don’ts (summary)

- Multiple stories at once.
- Skipping lint/type failures.
- Marking test tasks complete without running tests.
- Unverified claims about behavior or coverage.

For test philosophy (Classical TDD on the API, E2E not maintained for MVP unless a story says otherwise), see
[contributing_guidelines.md](contributing_guidelines.md#testing-expectations).
