# Claude Code roadmap → OpenCode (concept map)

This note supports Sapie’s [AI development acceleration plan](ai_development_acceleration_plan.md): when
studying [roadmap.sh’s Claude Code roadmap](https://roadmap.sh/claude-code), **where do those ideas land
in [OpenCode](https://opencode.ai/)?** Track what you adopt
in [ai_workflow_adoption_log.md](ai_workflow_adoption_log.md).

OpenCode is **not** Claude Code; paths and command names differ. Treat this as a **translation map**, not a feature
checklist.

---

## How the roadmap is organized (visual layout)

The roadmap is laid out around **becoming a Claude Code expert**, with a central spine and left/right branches.

### Central spine (main learning path)

1. **Introduction** — Overview; prerequisites for Claude.
2. **Understand the Basics** — Using Claude Code, workflow, usage best practices, **`CLAUDE.md`**, **Skills**,
   **Subagents**, **Hooks**, **Manage Context**.
3. **Advanced Claude Code** — Status line, **MCP**, scheduling jobs, **model configuration**, output styles,
   **plugins**, scaling, **security**.

### Left branch (commands, install, tooling)

Typical topics: **Claude CLI / Desktop App**, **editor extensions**, **models**, a **command cheat sheet** (e.g.
`Ctrl+C` / `Ctrl+D`, `/clear`, `/compact`, `/bug`, `/fix`, `/test`, `! bash`), **shortcuts** (`claude -v`, `--help`),
**session commands** (`/submit`, `/resume`, `/list`, `/history`), **context commands** (`/add`, `/remove`, `/reset`,
`/stats`), **configuration** files, **headless mode**, **Git awareness**, **agent tools**.

**OpenCode angle:** same *categories* (install surfaces, slash commands, sessions, config) — use OpenCode’s **CLI**,
**TUI commands**, **`opencode.json`**, and docs for the exact names.

### Right branch (concepts and comparisons)

Typical topics: **intro concepts** (AI coding, coding agent, agentic loop, coding vs Copilot), a **comparison** of
`CLAUDE.md` vs skills vs context vs modes vs models vs tools vs MCP vs plugins vs hooks vs subagents, **workflow**
(review on repeat, plan mode, manage sessions), deep dives on structuring `CLAUDE.md`, skills, subagents, hooks,
**context** (pricing, approvals, prompt caching, thinking modes), advanced security / code intelligence.

**OpenCode angle:** the **comparison box** is still worth studying: it clarifies **which mechanism carries what kind of
intent**; map each idea using the list below.

---

## Concept mapping (Claude Code → OpenCode)

Each item: **roadmap / Claude Code** → **OpenCode** (plus short context where useful).

- **Project memory** (`CLAUDE.md`, `.claude/`) → **`AGENTS.md`** (e.g. after `/init`) + `opencode.json` / `.opencode/`.
  Sapie also uses [`.cursor/rules`](../../../.cursor/rules) in Cursor.
- **Manage Context**, **How to Structure** → **`AGENTS.md`**, rules, and **session compaction** (plugins can hook
  `experimental.session.compacting`) — where instructions and repo facts live.
- **Agents / Agent Team / Creating Subagents** → **Primary** agents (Build, Plan) + **subagents** (General, Explore) +
  **custom** agents in `.opencode/agents/`. Plan: edits gated (ask). Build: full workflow.
  [Agents](https://opencode.ai/docs/agents)
- **Plan Mode**, **Review on Repeat** → **Plan** agent + **Tab** to cycle agents; planning before build
  ([intro](https://opencode.ai/docs/)). Same *intent*: review before mutating files.
- **Creating Skills**, **Skill Best Practices**, **Skills for MCP** → `.opencode/skills/<name>/SKILL.md` (+ optional
  `.claude/skills`). **`skill` tool** loads skills; MCP is separate in config.
  [Skills](https://opencode.ai/docs/skills)
- **Slash Commands (/)** → **Custom commands** `.opencode/commands/*.md` or `command` in config.
  [Commands](https://opencode.ai/docs/commands)
- **Hook types / events / I-O** → **Plugins** with hook maps (`tool.execute.before`, `session.*`, …).
  [Plugins](https://opencode.ai/docs/plugins)
- **Permission Modes**, **Use Approval and Always** → **`permission`** on tools (`edit`, `bash`, `webfetch`, `skill`, …):
  ask / allow / deny. [Agents — permissions](https://opencode.ai/docs/agents#permissions)
- **MCP**, **Connecting Tools with MCP** → **`mcp`** in `opencode.json` (e.g. Playwright MCP for UI smoke tests).
  [Config](https://opencode.ai/docs/config)
- **Model Configuration**, **Thinking modes & Effort** → **`model`** per agent + provider passthrough options (depends on
  **provider API**).
- **Use /compact and /clear** → **Compaction** + session UX — confirm slash commands for your OpenCode version.
- **Headless mode**, **Scaling**, **Git Worktrees** → **`opencode run`**, parallel sessions, normal Git (workflow
  patterns).
- **Prompt Caching** → **Provider feature** (Anthropic/OpenAI/etc. as configured).
- **Desktop App**, **Editor Extensions** → OpenCode **desktop** + **IDE extension** ([opencode.ai](https://opencode.ai/)).
- **Claude CLI**, **API usage** → **OpenCode CLI** + **providers** / Zen — different commands and billing.
- **Security Best Practices**, **Claude Code Security** → **Permissions**, **plugins**, **human review**.
- **Plugins / Community Tools** → **`plugin`** array + `.opencode/plugins/` +
  [ecosystem](https://opencode.ai/docs/ecosystem).
- **Manage Sessions** → Parent/child sessions; `session_child_*`, `session_parent`.
  [Agents](https://opencode.ai/docs/agents)
- **Output Styles**, **Customize Status Line** → **Themes**, `tui.json`.
  [Themes](https://opencode.ai/docs/themes)
- **Be mindful of extensions** → IDE extensions vs **OpenCode plugins** — limit noisy or leaky context.
- **Usage Best Practices** → **AGENTS.md**, **permissions**, small tasks, review plans — mostly discipline, not one
  vendor menu.
- **Scheduling Jobs** → Cron/CI/external scheduler + **`opencode run`**. Claude’s scheduler ≠ OpenCode feature parity;
  integrate externally.

**Compatibility:** OpenCode loads **`.claude/skills`** ([skills](https://opencode.ai/docs/skills)). **oMo**
([oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)) targets Claude-style portability; follow upstream
install docs.

---

## OpenCode learning order (practical)

[Docs](https://opencode.ai/docs/) → install → `/init` → [config](https://opencode.ai/docs/config) (including MCP) →
[agents](https://opencode.ai/docs/agents) → [commands](https://opencode.ai/docs/commands) →
[skills](https://opencode.ai/docs/skills) → [plugins](https://opencode.ai/docs/plugins).

---

## References

- [OpenCode docs](https://opencode.ai/docs/)
- [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)

The Claude Code roadmap itself is linked at the top of this note.
