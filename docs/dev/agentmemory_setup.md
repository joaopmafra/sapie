# agentmemory setup (Sapie)

[agentmemory](https://github.com/rohitg00/agentmemory) provides persistent, searchable memory for AI coding agents.
Sapie uses it alongside **Cursor**, **OpenCode**, **pi**, and **Claude Code**. All agents can share one local daemon.

**Shared daemon (do this once per machine):** install agentmemory, configure `~/.agentmemory/.env`, run the memory server
(systemd user service below). Agent-specific sections only wire each tool to `http://127.0.0.1:3111`.

---

## How it fits together

- **Memory server** (`agentmemory` on port **3111**): stores observations, hybrid search, consolidation.
- **MCP shim** (`@agentmemory/mcp`): what Cursor and other MCP clients talk to; proxies to the server when reachable.
- **Hooks** (Claude Code, OpenCode, etc.): auto-capture and context injection — **not** available in Cursor; Cursor relies
  on MCP tools plus project rules.

If MCP falls back to a **7-tool local store** (`~/.agentmemory/standalone.json`), recall works but data is **not** on the
full server. Fix: daemon running + explicit `AGENTMEMORY_URL` in MCP config (Cursor section below).

---

## 1. Install agentmemory

```bash
pnpm add -g @agentmemory/agentmemory
agentmemory --help
```

Alternative (no global install): `npx -y @agentmemory/agentmemory@latest`.

Initialize config (optional; copies example env):

```bash
npx @agentmemory/agentmemory init
```

Edit **`~/.agentmemory/.env`** for LLM/embedding providers and behavior flags. See upstream
[Configuration](https://github.com/rohitg00/agentmemory#configuration). Do **not** commit API keys.

Useful checks:

```bash
curl -s http://127.0.0.1:3111/agentmemory/livez
npx @agentmemory/agentmemory doctor
```

---

## 2. Run the daemon (systemd user service)

Recommended on Linux so the server survives logout and restarts on failure.

### 2.1 Unit file

Create `~/.config/systemd/user/agentmemory.service` (adjust `ExecStart` if `which agentmemory` differs):

```ini
[Unit]
Description=agentmemory — persistent memory server for AI coding agents
Documentation=https://github.com/rohitg00/agentmemory
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
ExecStart=%h/.local/share/pnpm/bin/agentmemory
WorkingDirectory=%h
Environment=PATH=%h/.local/share/pnpm/bin:%h/.local/bin:/usr/local/bin:/usr/bin:/bin
Environment=AGENTMEMORY_URL=http://127.0.0.1:3111
EnvironmentFile=-%h/.agentmemory/.env
Restart=on-failure
RestartSec=5
TimeoutStopSec=60
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

If agentmemory was installed with npm instead of pnpm, set `ExecStart` to the path from `which agentmemory` (must be the
Node entrypoint the wrapper invokes).

### 2.2 Enable and start

```bash
systemctl --user daemon-reload
systemctl --user enable --now agentmemory.service
systemctl --user status agentmemory.service
```

Boot persistence (user services after logout): `loginctl enable-linger "$USER"` once if needed.

**Operations:**

```bash
systemctl --user restart agentmemory    # after editing ~/.agentmemory/.env
journalctl --user -u agentmemory -f
```

**Viewer:** http://127.0.0.1:3113 (port may shift if 3113 is busy; check `systemctl` log output).

Stop any ad-hoc `agentmemory` process before enabling systemd to avoid port **3111** conflicts.

---

## 3. Cursor

### 3.1 MCP server (`~/.cursor/mcp.json`)

Merge into existing `mcpServers` (do not replace other servers):

```json
"agentmemory": {
  "command": "npx",
  "args": ["-y", "@agentmemory/mcp"],
  "env": {
    "AGENTMEMORY_URL": "http://127.0.0.1:3111",
    "AGENTMEMORY_FORCE_PROXY": "1"
  }
}
```

- **`AGENTMEMORY_URL`**: explicit URL (avoid unexpanded `${AGENTMEMORY_URL}` placeholders).
- **`AGENTMEMORY_FORCE_PROXY`**: always use the daemon; skips flaky localhost health probes from sandboxed MCP spawns.

Or run: `agentmemory connect cursor` (then verify the block matches above).

**Reload MCP** after edits: Cursor **Settings → MCP** → restart **agentmemory**, or **Developer: Reload Window**.

### 3.2 Project rule (Sapie repo)

This repo includes `.cursor/rules/agentmemory.mdc` so agents call **`memory_recall`** at session start and
**`memory_save`** for durable facts. Open the Sapie folder in Cursor so rules apply.

### 3.3 Verify in Cursor

1. Daemon: `curl -s http://127.0.0.1:3111/agentmemory/livez` → `"status":"ok"`.
2. MCP: agentmemory connected in Settings → MCP.
3. New Agent chat: ask what is remembered about Sapie; agent should call `memory_recall`.

Optional: set `AGENTMEMORY_TOOLS=all` in **`~/.agentmemory/.env`** and restart the daemon for the full MCP tool surface
(server-side flag only).

### 3.4 Migrate old local MCP store

If you used MCP before the daemon was wired, memories may exist only in `~/.agentmemory/standalone.json`:

```bash
python3 <<'PY'
import json, urllib.request
path = "$HOME/.agentmemory/standalone.json".replace("$HOME", __import__("os").environ["HOME"])
with open(path) as f:
    data = json.load(f)
for mid, mem in data.get("mem:memories", {}).items():
    body = json.dumps({
        "content": mem["content"],
        "type": mem.get("type", "fact"),
        "concepts": mem.get("concepts", []),
        "files": mem.get("files", []),
    }).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:3111/agentmemory/remember",
        data=body, headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        print(mid, "->", json.loads(resp.read()).get("memory", {}).get("id"))
PY
mv ~/.agentmemory/standalone.json ~/.agentmemory/standalone.json.bak
```

---

## 4. OpenCode

<!-- TODO: Document OpenCode plugin + MCP wiring for Sapie (hooks, opencode.json). -->

---

## 5. pi

<!-- TODO: Document pi integration (copy integrations/pi, MCP). -->

---

## 6. Claude Code

<!-- TODO: Document Claude Code plugin + hooks + MCP (~/.claude.json / marketplace). -->

---

## Troubleshooting

- **Only 7 MCP tools in Cursor:** daemon not reachable at MCP start — ensure `systemctl --user is-active agentmemory`,
  set `AGENTMEMORY_FORCE_PROXY=1`, reload MCP.
- **`memory_sessions` empty in Cursor:** expected without hooks; sessions are populated by hook-based agents or manual
  observation APIs.
- **Recall works in MCP but not in viewer/search:** data in `standalone.json` — run [migration](#34-migrate-old-local-mcp-store).
- **Port 3111 in use:** `systemctl --user stop agentmemory` and stop stray `agentmemory` / `iii` processes.
- **systemd env not applied:** `EnvironmentFile` reads `KEY=value` lines; comments and `#` lines are ignored. Restart
  after editing `~/.agentmemory/.env`.

Upstream: [agentmemory README — MCP](https://github.com/rohitg00/agentmemory#mcp-server),
[Works with every agent](https://github.com/rohitg00/agentmemory#works-with-every-agent).
