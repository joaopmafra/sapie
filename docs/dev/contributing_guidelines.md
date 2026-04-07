# Contributing Guidelines

Sapie’s priority is a **working MVP quickly** — see [mvp_objective.md](../research/mvp_objective.md) and
[.cursor/rules/general.mdc](../../.cursor/rules/general.mdc). This page is for **people**; assistants should also read
[ai_agent_guidelines.md](ai_agent_guidelines.md).

## Quick start

1. Environment: [main README — Quick start](../../README.md#quick-start).
2. Principles: [development_principles.md](development_principles.md).
3. Doc layout: [documentation_guidelines.md](documentation_guidelines.md).
4. Pick work from `docs/pm/3-stories/1-ready/` (or refine backlog per [pm README](../pm/README.md)).

## Story workflow

Artifacts live under `docs/pm/`:

- `1-epics/`, `2-features/`, `3-stories/` — each with `1-ready/` and `2-to-refine/`
- `4-in-progress/` — active work
- `5-done/` — completed items

**Lifecycle:** pick from `3-stories/1-ready/` → move to `4-in-progress/` → follow the story ([story template](story_template.md)) → run quality checks → move to `5-done/` when truly finished (humans move PM files; assistants ask the user).

**New PBIs** (naming, numbering, links): [Creating PBIs](../pm/README.md#creating-pbis).

## Development process

**TDD (backend):** small steps — [tdd_baby_steps.md](tdd_baby_steps.md), [unit_testing_sapie.md](unit_testing_sapie.md).

**Iterations:** ship vertical slices, not horizontal layers — [iterative_delivery.md](iterative_delivery.md).

### While implementing a story

- One story at a time; follow task order.
- Match existing patterns; fix TypeScript and lint issues.
- Update docs touched by your change.
- Do not commit broken code or skip `./scripts/verify-all.sh` failures without fixing or agreeing a deferral.

### Technical references

- [Web](../../packages/web/README.md) · [API](../../packages/api/README.md) · [E2E](../../packages/test-e2e/README.md)
- [Firebase + Nest](../other/nestjs_firebase_integration.md)
- [Documentation guidelines](documentation_guidelines.md)

## Quality standards

### Pre-commit

```bash
./scripts/verify-all.sh
```

Checks lint, format, types, and tests.

### Testing expectations

We ship fast and still use **XP-style** tests where they pay off ([general.mdc](../../.cursor/rules/general.mdc)).

| Area | Expectation |
|------|-------------|
| **API** | Prefer **Classical TDD** for behavior changes — [unit_testing_strategy.md](unit_testing_strategy.md), [unit_testing_sapie.md](unit_testing_sapie.md). Focus on auth, authorization, and data integrity. |
| **Web** | Story-driven; add tests when the story requires or for non-trivial logic (not thin library wrappers). |
| **E2E** | **Not maintained** for the current MVP push unless a story explicitly says otherwise. |

Do not add tests whose only purpose is to mock third-party SDKs. If tests are deferred for speed, say so in the story.

**Checklist honesty:** only mark a test task complete if tests exist, assert real behavior, and pass. If deferred, use
`- [ ] … (deferred)` or a short note — do not mark done based on “we’ll add tests later” or “covered by E2E” when the
task asked for unit/integration tests.

```bash
cd packages/api && pnpm test
cd packages/web && pnpm test
cd packages/test-e2e && pnpm test
```

Details: package READMEs ([API testing](../../packages/api/README.md#testing), [web](../../packages/web/README.md#code-quality), [E2E](../../packages/test-e2e/README.md#running-tests)).

### Git

Commit in small logical steps; message can reference story/task. Before you consider work done: tests (where required),
`./scripts/verify-all.sh`, docs updated, story requirements met.

## Communication

Ask for help when requirements are unclear, you are blocked, or patterns conflict. Prefer a short question over a wrong
assumption.

## Questions?

[Main README](../../README.md), [documentation guidelines](documentation_guidelines.md), completed stories in
`docs/pm/5-done/`.
