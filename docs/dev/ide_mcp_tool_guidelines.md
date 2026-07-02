# IDE MCP — Agent Tool Selection Guidelines

When an IDE MCP server (IntelliJ, VS Code, etc.) is available alongside native agent tools, agents
MUST follow these rules. This document is based on hands-on testing against this TypeScript project.

## Decision rule

1. **Native first** — use the agent's built-in tools for file I/O, text search, globbing, and shell.
2. **IDE when unique** — use IDE tools that have no native counterpart.
3. **IDE as fallback** — when a native tool produces no results or errors, retry with the
   corresponding IDE tool before concluding the operation is impossible.

## Project path

IDE MCP tools require a `projectPath`. The agent's working directory may differ from the IDE's
project root (same filesystem, different path — e.g. `~/dev/joaopmafra/...` vs `/home/jp/...`).

- Try the agent's working directory first.
- If the tool returns _"doesn't correspond to any open project"_, read the error: it lists the
  correct project path. Use that path for all subsequent IDE MCP calls in the session.

---

## Confirmed useful IDE tools (TypeScript project)

These tools were **tested on this project's TS/React/NestJS code** and produced useful results.

### Symbol search — `search_symbol`

**Tested:** `search_symbol("ContentController")` found the class in 75 locations across backend
source, test fixtures, and generated API client code.

**When to use:** When native symbol search returns nothing, or you need broad coverage including
generated files. Complements (does not replace) native LSP symbol search.

### Run configuration discovery — `get_run_configurations`

**Tested:** Returned 5 Jest test configurations + 1 npm script. Execution of these configurations
failed ("Process not started — probably build process failed"), but listing them is useful for
understanding what test targets exist.

**When to use:** To discover what test suites and scripts the IDE knows about. For actual
execution, prefer the project's shell scripts (`./scripts/verify-all.sh`, `pnpm test`).

### Editor integration

- `open_file_in_editor` — **Tested: works.** Shows a file to the user in their IDE.
- `get_all_open_file_paths` — **Tested: works.** Understand the user's current focus.

**When to use:** When you need to surface a file to the user or check what they're looking at.

---

## Unreliable / poor results (avoid or use only as last resort)

These tools were tested and produced **inconsistent results, minimal data, or no useful output**
for TypeScript files in this project. The project is modeled as `JAVA_MODULE` by IntelliJ, which
likely limits TS language support.

### Diagnostics — `get_file_problems`

**Tested:** Returned empty results on `App.tsx` and `app.controller.spec.ts`. Timed out or was
cancelled on `app.controller.ts` (3 of 4 attempts failed). Even when successful, returned no
errors on a file with a deliberate type error (`const x: number = 'string'`).

**Verdict:** Unreliable for TypeScript. Prefer native LSP diagnostics for quick feedback, and
project shell scripts (`./scripts/verify-all.sh`) for comprehensive checking.

### Symbol documentation — `get_symbol_info`

**Tested:** On `AppController` class — returned only `export class AppController` with a file
path. No method list, no decorators, no type info. Native LSP hover is strictly richer.

**Verdict:** Not useful for TypeScript. Use native LSP hover/documentation.

### Code formatting — `reformat_file`

**Tested:** Returned `ok` but made **zero changes** to the file. Either no TS formatter is
configured, or it doesn't match the project's Prettier setup.

**Verdict:** Does nothing for TS files. Use `./scripts/format-lint-all.sh` for formatting.

### Build — `build_project`

**Tested:** Timed out (30s). The project is `JAVA_MODULE` type; `build_project` likely doesn't
invoke `tsc` or `nest build`.

**Verdict:** Not functional for this TypeScript project. Use `pnpm build` in the relevant package.

### Run configuration execution — `execute_run_configuration`

**Tested:** Failed with "Process not started — probably build process failed." The run
configurations exist but can't be executed through the MCP.

**Verdict:** Not functional. Use shell scripts to run tests and builds.

### Rename refactoring — `rename_refactoring`

**Not tested** (calls were cancelled). Given the `JAVA_MODULE` project model and poor TS support
in other tools, assume it does **not** handle TypeScript cross-file renames reliably. Prefer
native LSP `rename` for TS symbols.

---

## Excluded: not applicable to this project

These IntelliJ MCP tools have **zero value** in this TypeScript/Node.js project. Agents MUST NOT
use them:

- `generate_psi_tree` — PSI tree for JVM languages (Java/Kotlin)
- `generate_inspection_kts_api` / `generate_inspection_kts_examples` — inspection API docs (JVM)
- `run_inspection_kts` / `validate_inspection_kts` — custom JVM inspections
- `xdebug_*` — PHP Xdebug protocol; not applicable to Node.js/TypeScript

Database tools (`list_database_connections`, `execute_sql_query`, etc.) are available but not
applicable unless a database connection is configured in the IDE.

---

## Quick-reference

| Tool | Verdict | When to use |
|---|---|---|
| `search_symbol` | ✅ Works | Fallback when native symbol search returns nothing |
| `get_run_configurations` | ✅ Works (list only) | Discover test/config targets |
| `open_file_in_editor` | ✅ Works | Show files to the user |
| `get_all_open_file_paths` | ✅ Works | Check user's current focus |
| `get_file_problems` | ⚠️ Unreliable | Not recommended; use native LSP diagnostics |
| `get_symbol_info` | ⚠️ Poor output | Not recommended; use native LSP hover |
| `reformat_file` | ⚠️ No-op | Not recommended; use project format scripts |
| `build_project` | ❌ Times out | Not functional for TS |
| `execute_run_configuration` | ❌ Fails | Not functional; use shell scripts |
| `rename_refactoring` | ❓ Untested | Assume unreliable for TS; use native LSP rename |
