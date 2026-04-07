# AI-assisted development acceleration (research plan)

## Purpose

This document captures **how we intend to speed up MVP delivery** by combining spec-driven requirements, a capable
coding agent stack, and automated browser verification. It complements the broader tactics
in [development_speed_optimization.md](../development_speed_optimization.md) and the product scope
in [mvp_objective.md](../mvp_objective.md). Track what you actually adopt
in [ai_workflow_adoption_log.md](ai_workflow_adoption_log.md).

**Status:** active research — tools and workflows below are adoption targets, not fully rolled out until reflected in
repo scripts and day-to-day habits.

---

## Goals

1. **Clearer intent for agents** — Reduce ambiguity so implementation matches what we actually want (fewer wrong
   directions and rework).
2. **Faster feature loops** — Use a strong terminal/IDE agent workflow for implementation, not ad-hoc prompts only.
3. **Verifiable UI changes** — When the frontend changes, agents should be able to **exercise the app in a browser**
   without relying only on manual clicks.

---

## Planned toolchain

### 1. OpenSpec (spec-driven changes)

[OpenSpec](https://openspec.dev/) is a lightweight, **spec-driven** workflow: capabilities live in the repo (e.g.
`openspec/specs/.../spec.md`), and each change can ship with **proposal + design + tasks + spec deltas** so reviewers
see **intent and requirement shifts**, not only diffs.

**Why it fits Sapie**

- Requirements stay **next to code** and survive chat sessions.
- Spec deltas make it easier for **humans and AI agents** to agree on what “done” means before or while coding.
- Aligns with our **iterative** delivery: small, well-scoped changes with an explicit delta to the spec.

**Adoption notes**

- Install and conventions follow the upstream project; start with one capability (e.g. auth-session or a content
  feature) and grow the tree.
- Keep specs **as small as necessary** for MVP — avoid waterfall-sized documents.

### 2. OpenCode (open-source coding agent)

[OpenCode](https://opencode.ai/) is an open-source AI coding agent (terminal, IDE, desktop) with multi-session work, LSP
awareness, and support for many models/providers.

**Role here:** primary **execution environment** for agent-driven implementation (alongside Cursor for editing and
rules).

### 3. oMo — Oh My OpenAgent (agent harness)

[oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) (oMo; formerly “oh-my-opencode”) is an **agent
harness** on top of OpenCode-style workflows: orchestration, tooling (e.g. LSP, AST-aware edits), and productivity
patterns (e.g. planning and disciplined task flow — see upstream docs for current features).

**Role here:** **configure and harden** the day-to-day agent experience (one install path, shared habits) instead of
hand-rolling prompts per feature.

**Caveat:** oMo evolves quickly; treat version and plugin names as **documentation to refresh** when upgrading.

### 4. Playwright MCP for frontend verification

**Decision:** AI agents working on **web UI** should use the **Playwright MCP server** (when available in the
environment) to:

- Navigate flows relevant to the change.
- Assert critical UI behavior where practical.
- Capture evidence (screenshots / traces) when debugging failures.

This does **not** replace the project’s existing Playwright E2E package under `packages/test-e2e/` or the policy
in [contributing_guidelines.md](../../dev/contributing_guidelines.md) (E2E not maintained for every MVP story unless
required). It **adds** a **targeted** way for agents to validate UI during feature work without skipping human review.

**Practical use**

- Prefer short, **change-scoped** checks (e.g. “open app, log in, open note, see editor”) over full-suite runs on every
  edit.
- Prefer reusing selectors and patterns consistent with `packages/test-e2e/` when possible.

---

## Suggested workflow (high level)

1. **Define or update requirements** — OpenSpec change (proposal → tasks → spec delta) for non-trivial work.
2. **Implement** — OpenCode + oMo (and/or Cursor with `.cursor/rules`) following the spec
   and [iterative_development.md](../../dev/iterative_development.md).
3. **Verify** — `./scripts/verify-all.sh`; for UI, use **Playwright MCP** for smoke checks; merge only after human
   review of spec delta + code.

---

## Further research (ideas to evaluate)

These are **candidates**, not commitments — pick what reduces calendar time without bloating process.

- **Specs** — Keep OpenSpec deltas **small** and tied to one story (XP / lean; avoids spec theater).
- **Testing** — **Component or integration tests** for tricky React state, in addition to MCP smoke (faster feedback
  than full E2E for some bugs).
- **Agents** — **Hierarchical `AGENTS.md`** (or equivalent) in hot paths (oMo and similar tools use this pattern; less
  repeated context).
- **Quality** — **Contract checks** for the API ([OpenAPI-generated client](../../../packages/web/README.md) in the web
  package; regenerate when the API changes) — catches drift between web and API early.
- **Process** — **Time-box** spec + plan before coding (e.g. 15–30 min) — aligns intent without analysis paralysis.
- **MCP** — **Official docs / repo search** MCPs when touching unfamiliar APIs — fewer wrong library details.
- **Human loop** — **Review spec delta before large merges** — cheap guardrail for MVP correctness.
- **Cost** — **Model routing** (cheap model for refactors, stronger for design) if using multi-model setups (see oMo
  docs).

**Deferred by design (see [mvp_objective.md](../mvp_objective.md)):** full offline mode, heavy RL-style agent loops, or
“generate the whole app from one prompt” — out of scope until the study tool is usable daily.

---

## Related documentation and references

Single list: **Sapie** docs first, then **tools and upstream** (each external URL once).

### Sapie (this repo)

- [mvp_objective.md](../mvp_objective.md) — what we are building and in what order
- [development_speed_optimization.md](../development_speed_optimization.md) — broader speed tactics (dev servers, hooks,
  etc.)
- [iterative_development.md](../../dev/iterative_development.md) — vertical slices
- [ai_agent_guidelines.md](../../dev/ai_agent_guidelines.md) — verification and honesty for assistants
- [contributing_guidelines.md](../../dev/contributing_guidelines.md) — testing expectations and E2E policy
- [ai_workflow_adoption_log.md](ai_workflow_adoption_log.md) — track which plan items you actually use
- [claude_code_roadmap_to_opencode.md](claude_code_roadmap_to_opencode.md) — map
  [roadmap.sh Claude Code](https://roadmap.sh/claude-code) topics to OpenCode (agents, skills, MCP, etc.)

### Tools and upstream

- **OpenSpec** — [openspec.dev](https://openspec.dev/) · [GitHub: Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec/)
- **OpenCode** — [opencode.ai](https://opencode.ai/)
- **oMo (Oh My OpenAgent)** — [github.com/code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)
