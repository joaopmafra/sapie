# Developer documentation

**Goal:** ship the [MVP](../plans/mvp_objective.md) quickly.

**For AI agents:** start at [AGENTS.md](../../AGENTS.md) at the repo root — the single entry point
for project context, principles, and key decisions. `.cursor/rules/*.mdc` files are Cursor-compatible
shims that duplicate critical rules; AGENTS.md is authoritative.

**This file is the canonical ordered index** of `docs/dev/` for human contributors.
When you add or reorder dev docs, update this list; keep AGENTS.md in sync for new top-level sections.

Suggested reading order:

1. [MVP objective](../plans/mvp_objective.md)
2. [Development principles](development_principles.md)
3. [Development environment setup](development_environment_setup.md) — machine setup, run Sapie, verify
4. [Contributing guidelines](contributing_guidelines.md) — workflow, verify scripts, testing expectations
5. [Iterative development](iterative_development.md) — vertical slices, Gall’s law, Kniberg MVP diagram
6. [Documentation guidelines](documentation_guidelines.md) — where to put docs

Assistants: [ai_agent_guidelines.md](ai_agent_guidelines.md)

Environment and agents:

- [agentmemory setup](agentmemory_setup.md) — persistent memory (Cursor documented; OpenCode, pi, Claude Code TBD)
- [IDE MCP tool guidelines](ide_mcp_tool_guidelines.md) — when to use IDE MCP tools vs native agent tools

Firebase Emulator Suite for dev and tests is started via **Docker Compose** at the repo root
(`compose.local-dev.yml`, `compose.test-unit.yml`, `compose.emulator.yml`, `compose.test-e2e.yml`). Rationale:
[ADR 0001](../adr/0001-firebase-emulators-docker-compose.md) (Compose / ports). Note body in Storage + API/testing
decisions: [ADR 0002](../adr/0002-note-body-storage-and-api.md) (see [content naming](content_naming.md)). Commands:
[ai_agent_guidelines.md](ai_agent_guidelines.md#firebase-emulators-docker-compose).

Supporting material:

- [Firebase — new hosted environment (project)](firebase_environment_setup.md) — create Auth, Firestore, Storage; CLI
  alias; deploy; IAM + bucket CORS checklist
- [Content naming — metadata vs content body](content_naming.md) — Firestore **content** vs Storage **content body**
- [xp_simplicity_is_the_key.md](xp_simplicity_is_the_key.md)
- [tdd_baby_steps.md](tdd_baby_steps.md)
- [unit_testing_strategy.md](unit_testing_strategy.md)
- [unit_testing_sapie.md](unit_testing_sapie.md)

Backlog structure: [pm README](../pm/README.md)
