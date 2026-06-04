# Development environment setup (Sapie)

End-to-end guide to work on Sapie on a fresh machine. Tested on **Ubuntu 24.04** (same flow on a clean **26.04**
install).

**Related:**

- [agentmemory_setup.md](agentmemory_setup.md) — persistent memory for Cursor and other agents
- [ai_agent_guidelines.md](ai_agent_guidelines.md) — emulator commands for assistants
- [firebase_environment_setup.md](firebase_environment_setup.md) — hosted Firebase projects
- [ADR 0001 — Firebase emulators in Docker](../adr/0001-firebase-emulators-docker-compose.md)

---

## Overview

| Component | Version / tool | Notes |
|-----------|----------------|-------|
| Node.js | 22.11.0 | `.nvmrc`, `.npmrc` `use-node-version` |
| pnpm | 10.12.1 | Standalone install; per-package lockfiles |
| Docker + Compose v2 | Required | Firebase emulators (`pnpm run emulator`, `pnpm dev`) |
| Firebase CLI | Global via pnpm | Deploy; optional if Compose-only locally |
| NestJS CLI | Global via pnpm | API scaffolding |
| Cursor | IDE | Project rules in `.cursor/rules/` |
| agentmemory | Optional, recommended | Shared memory across agents — [setup](agentmemory_setup.md) |

Sapie packages are installed **independently** (no root PNPM workspace) so Firebase Functions packaging stays
predictable. See [Firebase and monorepo tooling](#firebase-and-monorepo-tooling) below.

---

## 1. Base OS packages (Ubuntu)

```bash
sudo apt update
sudo apt install -y \
  build-essential git curl ca-certificates gnupg \
  openssh-client
```

`curl` is used by `scripts/dev-local.sh` (emulator readiness).

---

## 2. Git and clone Sapie

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

```bash
mkdir -p ~/dev/joaopmafra/apps/knowledge-management
cd ~/dev/joaopmafra/apps/knowledge-management
git clone https://github.com/joaopmafra/sapie.git
cd sapie
```

Optional: SSH remote `git@github.com:joaopmafra/sapie.git`.

Convenience variable (add to `~/.bashrc`):

```bash
export SAPIE_HOME=$HOME/dev/joaopmafra/apps/knowledge-management/sapie
```

---

## 3. Docker

Emulators run in Docker Compose ([ADR 0001](../adr/0001-firebase-emulators-docker-compose.md)).

1. [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/) (Docker CE recommended).
2. Post-install:

```bash
sudo usermod -aG docker "$USER"
```

Log out and back in, then:

```bash
docker run --rm hello-world
docker compose version
```

---

## 4. Node.js (nvm) and pnpm

### 4.1 nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Ensure `~/.bashrc` loads nvm, then:

```bash
cd "$SAPIE_HOME"
nvm install    # .nvmrc → v22.11.0
nvm use
node -v        # v22.11.0
```

Optional: `nvm alias default 22.11.0` or [direnv](https://direnv.net/) for auto-`nvm use`.

### 4.2 pnpm (standalone installer)

Corepack is not required. Install pnpm 10.12.1:

```bash
curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=10.12.1 sh -
```

Reopen the shell:

```bash
pnpm -v    # 10.12.1
```

### 4.3 Global CLI tools

```bash
pnpm add -g @nestjs/cli firebase-tools
nest --version
firebase --version
firebase login    # deploy; optional for Compose-only emulator work
```

### 4.4 Shell `node` vs package scripts

Root `.npmrc` sets `use-node-version=22.11.0`. **pnpm** uses that Node even when the IDE terminal shows another
`node -v` (e.g. Cursor’s bundled Node). Confirm in a package:

```bash
cd "$SAPIE_HOME/packages/api"
pnpm exec node -v    # v22.11.0
```

Prefer an external terminal or put nvm’s Node earlier on `PATH` than the IDE helper.

---

## 5. Google Cloud SDK (optional)

For Application Default Credentials against real GCP (uncommon day-to-day):

```bash
gcloud auth application-default login
```

Hosted Firebase: [firebase_environment_setup.md](firebase_environment_setup.md).

---

## 6. IDE and AI agents

### 6.1 Cursor

Install from [cursor.com](https://cursor.com/). Open the Sapie repository root.

- Rules: `.cursor/rules/`
- MCP: configure per [agentmemory_setup.md — Cursor](agentmemory_setup.md#3-cursor) if using persistent memory

### 6.2 agentmemory (recommended)

Cross-session memory for Cursor, OpenCode, pi, and Claude Code. Full steps:
**[agentmemory_setup.md](agentmemory_setup.md)** (daemon + per-agent sections).

### 6.3 Other agents

OpenCode, pi, and Claude Code sections in `agentmemory_setup.md` are placeholders until documented for this project.

Optional:

- **GitHub CLI** (`gh`) for PRs from the host
- **Playwright OS deps** for host-run E2E: `cd packages/test-e2e && pnpm exec playwright install-deps chromium`

---

## 7. Install Sapie packages and env files

From repo root (each package has its own lockfile):

```bash
cd "$SAPIE_HOME"
cd packages/api && pnpm install && cd ../..
cd packages/web && pnpm install && cd ../..
cd packages/test-e2e && pnpm install && cd ../..
```

**Local dev env files** (hybrid `pnpm dev`):

```bash
cp packages/web/.env.local-dev.example packages/web/.env.local-dev
cp packages/api/.env.local-dev.example packages/api/.env.local-dev
```

When migrating from an old machine, copy existing `.env.local-dev` from the previous clone instead.

```bash
ls -l packages/web/.env.local-dev packages/api/.env.local-dev
```

---

## 8. Verify installation

```bash
cd "$SAPIE_HOME"
nvm use
./scripts/verify-all.sh
```

API unit tests (test-unit emulator):

```bash
./scripts/emulator-test-unit-start.sh
cd packages/api && pnpm test
./scripts/emulator-test-unit-stop.sh
```

Scoped checks (typical after a small change):

```bash
cd packages/web && pnpm format && pnpm lint && pnpm verify:all && pnpm test
cd packages/api && pnpm format && pnpm lint && pnpm verify:all && pnpm test
```

Repo-wide:

```bash
./scripts/format-lint-all.sh
./scripts/verify-all-test-unit.sh
```

---

## 9. Run Sapie

### Day-to-day (hybrid — recommended)

Emulators in Docker; web + API on the host with hot reload:

```bash
cd "$SAPIE_HOME"
nvm use
pnpm dev
# equivalent: ./scripts/dev-local.sh
```

- Web: http://localhost:5173
- API: http://localhost:3000
- Emulator UI: http://localhost:4002 (`compose.local-dev.yml`)

### Full stack in Docker

```bash
pnpm run build
pnpm run emulator
```

Uses `scripts/build-run-on-emulator.sh` / `compose.emulator.yml`:

- Web: http://localhost:5000
- API: http://localhost:5001/demo-emulator/us-central1/api
- Emulator UI: http://localhost:4000
- Auth emulator: http://localhost:9099

### Separate dev servers (alternative)

```bash
cd packages/api && pnpm run dev    # :3000
cd packages/web && pnpm run dev    # :5173
```

Do **not** run `pnpm run emulator`, `pnpm dev` local-dev compose, and `compose.test-e2e.yml` at the same time — ports
overlap.

---

## 10. E2E tests (Playwright)

```bash
scripts/build-all.sh test-e2e
docker compose -f compose.test-e2e.yml up --build -d --wait
cd packages/test-e2e && pnpm test
```

Details: [packages/test-e2e/README.md](../../packages/test-e2e/README.md).

---

## 11. Environments

| Environment | Firebase project | Runtime | Purpose |
|-------------|------------------|---------|---------|
| emulator | `demo-emulator` | Firebase Emulator (Docker) | Full stack in Compose (default for `pnpm run emulator`) |
| test-e2e | `demo-test-e2e` | Firebase Emulator | Playwright |
| local-dev | `demo-local-dev` | Local servers + emulator | `pnpm dev` |
| development | `sapie-dev` | Firebase hosting | Deployed dev |
| staging | `sapie-staging` | Firebase hosting | Pre-production |
| production | `sapie-prod` | Firebase hosting | Live |

---

## 12. Firebase and monorepo tooling

Firebase Hosting and Cloud Functions expect dependencies beside built function output (`packages/api/`). A single
root-level PNPM workspace with one lockfile is **not** supported without a custom deploy workaround.

Packages use **independent** `pnpm install` and lockfiles. Do not add a repo-wide workspace expecting emulators/deploy to
work unchanged.

Default local flows use **Docker Compose**; use Firebase CLI on the host mainly for **deploy** or advanced debugging:

```bash
pkill -f "firebase.*emulator"    # stuck host emulators only
firebase emulators:start         # host-only; needs local Functions layout
firebase use --clear
```

Deploy (staging example):

```bash
./scripts/build-all.sh
firebase deploy --project=sapie-b09be
```

---

## 13. Root convenience scripts

From repo root:

```bash
pnpm run lint
pnpm run format
pnpm run format-lint
pnpm run verify
pnpm run build
pnpm run test
pnpm run emulator
```

Package-specific commands: [packages/web/README.md](../../packages/web/README.md),
[packages/api/README.md](../../packages/api/README.md).

---

## 14. Post-install checklist

- [ ] `pnpm -v` → 10.12.1; `pnpm exec node -v` in `packages/api` → v22.11.0
- [ ] Docker works without `sudo` (user in `docker` group)
- [ ] `nest`, `firebase` on `PATH` via `$PNPM_HOME`
- [ ] `.env.local-dev` in `packages/api` and `packages/web`
- [ ] `./scripts/verify-all.sh` passes
- [ ] `pnpm dev` — emulator UI :4002, web :5173, API :3000
- [ ] (Optional) [agentmemory](agentmemory_setup.md) daemon active; Cursor MCP connected

---

## Troubleshooting

- **Docker permission denied:** re-login after `usermod -aG docker`.
- **Wrong Node for scripts:** `cd` to Sapie, `nvm use`; trust `pnpm exec node -v` over IDE `node -v`.
- **Emulator UI not ready:** `docker compose -f compose.local-dev.yml logs`.
- **Port in use:** stop the other stack (local-dev vs `pnpm run emulator` vs test-e2e).
- **agentmemory:** [agentmemory_setup.md — Troubleshooting](agentmemory_setup.md#troubleshooting).

---

## Appendix: non-Sapie tooling (optional)

Not required for Sapie; omit on a Sapie-only machine:

- Linuxbrew, SDKMAN/Java, Android SDK
- OpenCode (`~/.opencode/bin`)

Firebase emulators bundle JRE + firebase-tools in Docker (`Dockerfile.firebase-emulators`); host Java is not required for
emulator workflows.
