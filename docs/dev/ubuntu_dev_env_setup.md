# Ubuntu Development Environment Setup

Reproduce the **reference machine** setup (Ubuntu 24.04 today; same steps on a fresh **26.04** install). This doc
reflects how Sapie is actually run here — not generic alternatives unless marked **Optional improvement**.

**After a clean OS install:** work top to bottom (no in-place distro upgrade steps).

---

## 1. Base packages

```bash
sudo apt update
sudo apt install -y \
  build-essential git curl ca-certificates gnupg \
  openssh-client
```

`curl` is required by `dev-local.sh` (emulator readiness check).

---

## 2. Git and clone Sapie

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Clone (HTTPS, same as `origin` on the reference machine):

```bash
mkdir -p ~/dev/joaopmafra/apps/knowledge-management
cd ~/dev/joaopmafra/apps/knowledge-management
git clone https://github.com/joaopmafra/sapie.git
cd sapie
```

**Optional improvement:** SSH remote (`git@github.com:joaopmafra/sapie.git`) if you prefer keys over HTTPS.

Convenience env var (add to `~/.bashrc` after clone):

```bash
export SAPIE_HOME=$HOME/dev/joaopmafra/apps/knowledge-management/sapie
```

---

## 3. Docker (required)

Sapie emulators run in **Docker Compose** ([ADR 0001](../adr/0001-firebase-emulators-docker-compose.md)).

On the reference machine: **Docker CE** from Docker’s Ubuntu apt repo (`docker-ce` package), not only `docker.io`.

1. Follow [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/) for your release.
2. Post-install:

```bash
sudo usermod -aG docker "$USER"
```

Log out and back in, then:

```bash
docker run --rm hello-world
docker compose version
```

(`docker compose` v2 plugin — reference: v5.x.)

---

## 4. Node (nvm) and pnpm (standalone)

Sapie pins **Node 22.11.0** (`.nvmrc`, `.npmrc` → `use-node-version=22.11.0`) and **pnpm 10.12.1**
(`packageManager` in package `package.json` files).

### 4.1 nvm

Reference: **nvm 0.40.1**.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Add to `~/.bashrc` (installer usually does this):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

Reopen the shell, then install Sapie’s Node and use it in that repo:

```bash
cd "$SAPIE_HOME"   # or your clone path
nvm install        # reads .nvmrc → v22.11.0
nvm use
node -v            # v22.11.0
```

On the reference machine, **nvm default** is `v22.18.0`. For Sapie, run **`nvm use`** in the repo (or rely on pnpm’s
`use-node-version` for package scripts — see below).

**Optional improvement:** set `nvm alias default 22.11.0` if Sapie is your only Node 22 project; or use
[direnv](https://direnv.net/) / an `nvm use` hook on `cd` into the repo.

### 4.2 pnpm (standalone installer — not Corepack)

Corepack is **not** used on the reference machine. Install pnpm via the official script (installs into
`~/.local/share/pnpm` and appends to `~/.bashrc`):

```bash
curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=10.12.1 sh -
```

Reopen the shell. You should have:

```bash
echo "$PNPM_HOME"    # /home/YOU/.local/share/pnpm
pnpm -v              # 10.12.1
```

The installer adds something equivalent to:

```bash
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
```

**Optional improvement:** enable Corepack (`corepack enable` + `corepack prepare pnpm@10.12.1 --activate`) instead of
the standalone script — only if you deliberately want to switch away from the current layout.

### 4.3 Global CLI tools (pnpm)

Same as root [README](../../README.md#quick-start); installed globally via **pnpm** on the reference machine:

```bash
pnpm add -g @nestjs/cli firebase-tools
```

Check:

```bash
nest --version
firebase --version
firebase login    # needed for deploy; optional for Compose-only emulator work
```

**Optional improvement:** README still shows `npm install -g firebase-tools` — equivalent, but the reference machine
uses `pnpm add -g firebase-tools`.

### 4.4 Shell `node` vs Sapie scripts

Repo root `.npmrc` contains `use-node-version=22.11.0`. **pnpm** (install, `dev:local`, tests) uses Node **22.11.0**
even when a plain `node -v` in the shell shows something else (e.g. Cursor’s bundled Node in the IDE terminal).

After `nvm use` in Sapie, confirm package scripts:

```bash
cd "$SAPIE_HOME/packages/api"
pnpm exec node -v    # v22.11.0
```

**Optional improvement:** in Cursor’s integrated terminal, `which node` may stay on Cursor’s helper; prefer an external
terminal for `nvm use`, or adjust PATH so `$NVM_DIR/versions/node/v22.11.0/bin` precedes Cursor’s node.

---

## 5. Google Cloud SDK (deploy / ADC)

On the reference machine: **`gcloud`** at `/usr/bin/gcloud` (Google’s apt/repo install).

Needed when the API talks to a **real** GCP project locally (uncommon day-to-day; emulators use Docker). Example:

```bash
gcloud auth application-default login
```

Hosted Firebase projects: [firebase_environment_setup.md](firebase_environment_setup.md).

---

## 6. Cursor IDE

Install from [cursor.com](https://cursor.com/). Open the Sapie folder; rules live in `.cursor/rules/`.

**Optional improvement:** GitHub CLI (`gh`) — not on the reference machine; install only if you want it.

**Optional improvement:** Playwright OS deps for E2E on the host — after `packages/test-e2e` install:

```bash
cd packages/test-e2e && pnpm exec playwright install-deps chromium
```

---

## 7. Sapie install and env files

From **repo root** (each package has its own lockfile — [README](../../README.md#firebase-and-monorepo-tooling)):

```bash
cd packages/api && pnpm install && cd ../..
cd packages/web && pnpm install && cd ../..
cd packages/test-e2e && pnpm install && cd ../..
```

**Env files (from old Ubuntu install):** keep the previous system on a separate partition and copy your existing
`.env.local-dev` files into the new clone (same paths under the repo). Example if the old root is mounted at
`/mnt/old`:

```bash
OLD_SAPIE=/mnt/old/home/jp/dev/joaopmafra/apps/knowledge-management/sapie
cd "$SAPIE_HOME"

cp "$OLD_SAPIE/packages/web/.env.local-dev" packages/web/.env.local-dev
cp "$OLD_SAPIE/packages/api/.env.local-dev" packages/api/.env.local-dev
```

Adjust `OLD_SAPIE` to wherever the old home (or backup) lives on that partition. Quick check:

```bash
ls -l packages/web/.env.local-dev packages/api/.env.local-dev
```

**Optional improvement:** if those files are missing on the old partition, create them from the examples instead:

```bash
cp packages/web/.env.local-dev.example packages/web/.env.local-dev
cp packages/api/.env.local-dev.example packages/api/.env.local-dev
```

---

## 8. Verify

```bash
cd "$SAPIE_HOME"
nvm use
./scripts/verify-all.sh
```

API unit tests need the test-unit emulator stack:

```bash
./scripts/emulator-test-unit-start.sh
cd packages/api && pnpm test
./scripts/emulator-test-unit-stop.sh
```

---

## 9. Run Sapie (reference choices)

**Day-to-day (hybrid local):** emulators in Docker, web + API on the host with hot reload:

```bash
cd "$SAPIE_HOME"
nvm use
pnpm dev
# same as: ./scripts/dev-local.sh
```

- Web: http://localhost:5173 (`packages/web` → `pnpm run dev:local`)
- API: http://localhost:3000 (`packages/api` → `pnpm run dev:local`)
- Emulator UI: http://localhost:4002 (`compose.local-dev.yml`)

**Full stack in Docker** (Hosting + Functions):

```bash
pnpm run emulator
```

- Web: http://localhost:5000 · Emulator UI: http://localhost:4000

Do **not** run `pnpm run emulator` and `compose.test-e2e.yml` together — ports overlap.

More: [README — Quick start](../../README.md#quick-start), [ai_agent_guidelines.md](ai_agent_guidelines.md#firebase-emulators-docker-compose).

---

## 10. Post-install checklist

- [ ] `pnpm -v` → 10.12.1 · `pnpm exec node -v` (in `packages/api`) → v22.11.0
- [ ] `docker compose` works without `sudo` (user in `docker` group)
- [ ] `pnpm add -g` tools: `nest`, `firebase` on `PATH` via `$PNPM_HOME`
- [ ] `.env.local-dev` copied into `packages/api` and `packages/web` (from old partition or examples)
- [ ] `./scripts/verify-all.sh` passes
- [ ] `pnpm dev` reaches emulator UI on :4002 and opens web/API locally

---

## Troubleshooting

- **Docker permission denied:** re-login after `usermod -aG docker`.
- **Wrong pnpm / node for scripts:** run from repo; `nvm use`; trust `pnpm exec node -v` over bare `node -v` in IDE shells.
- **Emulator UI not ready:** `docker compose -f compose.local-dev.yml logs`.
- **Port in use:** stop the other stack (local-dev vs `pnpm run emulator` vs test-e2e).

---

## Appendix: other tooling on the reference machine (not Sapie)

Present in `~/.bashrc` but **not required** for Sapie — omit on a Sapie-only box unless you need them elsewhere:

- **Linuxbrew** (`/home/linuxbrew/.linuxbrew`)
- **SDKMAN + Java 11** (`JAVA_HOME` for Android/Java work)
- **Android SDK** (`ANDROID_HOME`, platform-tools on `PATH`)
- **OpenCode** (`~/.opencode/bin` on `PATH`)

Sapie Firebase emulators get **JRE + firebase-tools inside Docker** ([`Dockerfile.firebase-emulators`](../../Dockerfile.firebase-emulators)); host Java is not required for emulator workflows.
