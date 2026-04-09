# Developer documentation

**Goal:** ship the [MVP](../research/mvp_objective.md) quickly. Shared context for tools (e.g. Cursor).

**This file is the canonical ordered index** of `docs/dev/` for humans and assistants. When you add or reorder dev docs,
update this list first; `.cursor/rules/general.mdc` points here so the two do not drift.

Suggested reading order:

1. [MVP objective](../research/mvp_objective.md)
2. [Development principles](development_principles.md)
3. [Contributing guidelines](contributing_guidelines.md) — workflow, verify scripts, testing expectations
4. [Iterative development](iterative_development.md) — vertical slices, Gall’s law, Kniberg MVP diagram
5. [Documentation guidelines](documentation_guidelines.md) — where to put docs

Assistants: [ai_agent_guidelines.md](ai_agent_guidelines.md)

Firebase Emulator Suite for dev and tests is started via **Docker Compose** at the repo root
(`compose.local-dev.yml`, `compose.test-unit.yml`, `compose.emulator.yml`, `compose.test-e2e.yml`). Rationale:
[ADR 0001](../adr/0001-firebase-emulators-docker-compose.md). Commands: [ai_agent_guidelines.md](ai_agent_guidelines.md#firebase-emulators-docker-compose).

Supporting material:

- [xp_simplicity_is_the_key.md](xp_simplicity_is_the_key.md)
- [tdd_baby_steps.md](tdd_baby_steps.md)
- [unit_testing_strategy.md](unit_testing_strategy.md)
- [unit_testing_sapie.md](unit_testing_sapie.md)

Backlog structure: [pm README](../pm/README.md)
