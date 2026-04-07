# AI workflow adoption log

Track **what you have applied** from:

- [AI development acceleration plan](ai_development_acceleration_plan.md) — OpenSpec, OpenCode, oMo, Playwright MCP,
  workflow, research ideas
- [Claude Code roadmap → OpenCode](claude_code_roadmap_to_opencode.md) — OpenCode primitives (agents, skills, commands,
  plugins, MCP, permissions, etc.)

**For AI agents:** When the user makes progress on any item below, offer to **update this file** (check the box and add
a short log line). Do not invent adoption — only record what the user confirms.

---

## Part A — Acceleration plan

### Goals (intent)

|     | Goal                                                           | Status | Notes |
|-----|----------------------------------------------------------------|--------|-------|
| [ ] | Clearer intent for agents (specs / less ambiguity)             |        |       |
| [ ] | Faster feature loops (agent workflow, not ad-hoc prompts only) |        |       |
| [ ] | Verifiable UI changes (browser-level checks for frontend work) |        |       |

### Planned toolchain

|     | Item                                                                     | Status | Notes |
|-----|--------------------------------------------------------------------------|--------|-------|
| [ ] | **OpenSpec** — install / first capability / spec deltas in repo          |        |       |
| [ ] | **OpenCode** — installed; project initialized (`/init`, `AGENTS.md`)     |        |       |
| [ ] | **oMo (oh-my-openagent)** — installed / configured per upstream          |        |       |
| [ ] | **Playwright MCP** — enabled for agents; used for change-scoped UI smoke |        |       |

### Habits (suggested workflow)

|     | Habit                                                                               | Status | Notes |
|-----|-------------------------------------------------------------------------------------|--------|-------|
| [ ] | Non-trivial work starts with OpenSpec change (proposal → tasks → delta)             |        |       |
| [ ] | Implementation follows spec + [iterative_development.md](../../dev/iterative_development.md) |        |       |
| [ ] | Verify with `./scripts/verify-all.sh`; UI with Playwright MCP when relevant         |        |       |

### Further research (optional ideas from the plan)

|     | Idea                                                       | Status | Notes |
|-----|------------------------------------------------------------|--------|-------|
| [ ] | Small OpenSpec deltas tied to one story                    |        |       |
| [ ] | Component/integration tests for tricky React state         |        |       |
| [ ] | Hierarchical `AGENTS.md` in hot paths                      |        |       |
| [ ] | API contract checks (OpenAPI)                              |        |       |
| [ ] | Time-box spec + plan (e.g. 15–30 min) before coding        |        |       |
| [ ] | Docs / repo-search MCP when touching unfamiliar APIs       |        |       |
| [ ] | Review spec delta before large merges                      |        |       |
| [ ] | Model routing (cheap vs strong) if using multi-model setup |        |       |

---

## Part B — OpenCode / roadmap concept map

Use this as a **menu**: adopt practices when they reduce friction for you. Mapping details stay
in [claude_code_roadmap_to_opencode.md](claude_code_roadmap_to_opencode.md).

### Foundation

|     | Practice                                                    | Status | Notes |
|-----|-------------------------------------------------------------|--------|-------|
| [ ] | **`AGENTS.md`** + `opencode.json` / `.opencode/` maintained |        |       |
| [ ] | **Plan** agent (or plan-before-build) before risky edits    |        |       |
| [ ] | **Build** agent for implementation; permissions understood  |        |       |

### Reusable automation

|     | Practice                                                         | Status | Notes |
|-----|------------------------------------------------------------------|--------|-------|
| [ ] | **Skills** (`.opencode/skills/.../SKILL.md` or `.claude/skills`) |        |       |
| [ ] | **Custom commands** (`.opencode/commands/`)                      |        |       |
| [ ] | **MCP** in config (incl. Playwright if doing UI)                 |        |       |
| [ ] | **Plugins** for hooks (guardrails, env, compaction)              |        |       |

### Sessions & UI

|     | Practice                                                  | Status | Notes |
|-----|-----------------------------------------------------------|--------|-------|
| [ ] | **Manage sessions** (parent/child, subagents) when useful |        |       |
| [ ] | **Themes / `tui.json`** if desired                        |        |       |

### Security & ops

|     | Practice                                                      | Status | Notes |
|-----|---------------------------------------------------------------|--------|-------|
| [ ] | **Permissions** (ask/allow/deny) tuned for comfort            |        |       |
| [ ] | **Headless / CI**: `opencode run` or similar where applicable |        |       |
| [ ] | External **scheduling** (cron/CI) if needed                   |        |       |

---

## Change log (newest first)

| Date | What changed                                                      |
|------|-------------------------------------------------------------------|
|      | _Add a row when you adopt, drop, or complete a significant item._ |
