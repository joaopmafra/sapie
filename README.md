# Sapie

Sapie is a knowledge management app built with React (web frontend) and NestJS (API backend), deployed on Firebase.

## Project Structure

```
sapie/
├── packages/
│   ├── web/          # React web application (Vite + TypeScript)
│   ├── api/          # NestJS API backend
│   └── test-e2e/     # End-to-end tests (Playwright)
├── scripts/          # Build and verification scripts
├── docs/             # Project documentation — see docs/README.md
├── firebase.json     # Firebase configuration
└── README.md         # This file
```

## Quick start

```bash
# 1. Initialize workspace in current directory (use --folder for a different path)
sapie init --url localhost --auth email

# Enter email/password when prompted (Google OAuth is the default: --auth google)

# 2. Pull your content
sapie pull

# 3. Edit files locally, then push changes back
sapie push
```

When running commands from inside a workspace (a directory containing `.sapie/config.json`),
the `--workspace` flag is optional — the CLI auto-detects the workspace root by walking up
from the current directory. You can always override with `--workspace <path>`.

### Environment URLs

| `--url` value | Environment | Auth |
|---|---|---|
| `localhost` | Local dev (emulators) | Email/password via emulator |
| `sapie-b09be.web.app` | Staging | Email/password or Google OAuth |
| (default) or `sapie.app` | Production | Email/password or Google OAuth |

To unlink later:

## Development Principles

Sapie follows core development principles to maintain code quality and consistency.

For how we work (MVP goal, principles, contributing), see **[Developer documentation](docs/dev/README.md)** and
**[Development principles](docs/dev/development_principles.md)**.

## Firebase and monorepo tooling

Firebase’s **Hosting** and **Cloud Functions** workflows (CLI, emulators, and deploy) assume dependencies can be
| `sapie login` | Authenticate with Google (`--auth google`) or email/password (`--auth email`) |
**not** reliably support a **root-level PNPM/Yarn/npm workspace** with a **single root lockfile** and symlinked or
virtual-store `node_modules` the way typical monorepos do. Similar limitations apply to other workspace-centric
layouts: the Functions runtime and packaging step are not first-class monorepo citizens.

**Implication for Sapie:** packages are installed **independently** (each package has its own `pnpm install` and
lockfile where needed) so the API build output and `node_modules` stay predictable for emulators and deploy. Do not
introduce a root-only PNPM workspace + single `pnpm-lock.yaml` for the whole repo expecting Firebase to “just work”
without a dedicated bundling or deploy workaround.

For **why** Firebase emulators run in Docker and how profiles differ, see
**[ADR 0001 — Firebase Emulator Suite in Docker](docs/adr/0001-firebase-emulators-docker-compose.md)**. For **commands
**, use **[Development environment setup](docs/dev/development_environment_setup.md)**, the E2E section below, and [
`docs/dev/ai_agent_guidelines.md`](docs/dev/ai_agent_guidelines.md).

## Quick Start

**[Development environment setup](docs/dev/development_environment_setup.md)** — clone, Docker, Node/pnpm, package
install, verify, and run (`pnpm dev` or `pnpm run emulator`).

Optional: **[agentmemory setup](docs/dev/agentmemory_setup.md)** for persistent memory in Cursor and other agents.

## Package Documentation

For detailed documentation on each package:

- **[Web App](./packages/web/README.md)** - React frontend development and testing
- **[API](./packages/api/README.md)** - NestJS backend development, endpoints, and testing
- **[E2E Tests](./packages/test-e2e/README.md)** - End-to-end testing with Playwright

Firebase and GCP deep dives (Auth, Admin SDK, **signed URLs / IAM**, **Storage bucket CORS**):

- **[API package docs](./packages/api/docs/README.md)**
- **[Web package docs](./packages/web/docs/README.md)**

## Authentication

Sapie includes user authentication powered by **Firebase Auth** with **FirebaseUI**.

**Features**: Email/password authentication, Google Sign-In, email verification, password reset, and session
persistence.

For detailed authentication setup, configuration, and usage instructions, see the
**[Web App Authentication Documentation](./packages/web/README.md#authentication)** and
**[Firebase (web)](./packages/web/docs/firebase-web.md)**.

## Development

Day-to-day commands, hybrid local dev, and emulator stacks:
**[development_environment_setup.md](docs/dev/development_environment_setup.md)**.

### E2E tests (Playwright + Compose)

Playwright targets the same Hosting + Functions emulator model as the full stack above, but with the **`test-e2e`**
Firebase alias (emulated project id **`demo-test-e2e`**). From the repo root:

```bash
scripts/build-all.sh test-e2e
docker compose -f compose.test-e2e.yml up --build -d --wait
cd packages/test-e2e && pnpm test
```

Uses [`compose.test-e2e.yml`](compose.test-e2e.yml). **Do not** run this alongside `pnpm run emulator` — the published
ports overlap. Full steps: **[packages/test-e2e/README.md](./packages/test-e2e/README.md)**.

## Project-level Scripts

Project-level scripts for convenience:

```bash
# Lint all packages
pnpm run lint

# Format all packages  
pnpm run format

# Format and lint all packages in sequence
pnpm run format-lint

# Verify code quality across all packages (format check + lint)
pnpm run verify

# Build all packages
pnpm run build

# Build and test all packages
pnpm run test

# Build and start Firebase emulator with all services
pnpm run emulator
```

Note: Since packages are managed independently, you can also build each package separately by running commands within
each package directory.

## Testing

### Testing Philosophy

For testing expectations (API vs web vs E2E), see *
*[Contributing guidelines](docs/dev/contributing_guidelines.md#testing-expectations)**.

## Code Quality

### Package-Level Verification

Code quality must be verified for each package separately:

```bash
# Verify API package
cd packages/api && pnpm run lint && pnpm run format:check

# Verify web package
cd packages/web && pnpm run lint && pnpm run format:check

# Or use the convenience script from root
./scripts/verify-all.sh
```

Each package has its own code quality configuration. See individual package READMEs for specific commands.

## Deployment

### Firebase Hosting

Deploy the complete application to Firebase (staging):

```bash
firebase deploy --project=sapie-b09be
```

Or build first, then deploy:

```bash
./scripts/build-all.sh
firebase deploy
```

This will:

1. Build the web app (`packages/web/dist`)
2. Build the API for Firebase Functions (`packages/api/dist`)
3. Deploy both to Firebase

After deployment, your application will be available at [https://sapie-b09be.web.app](https://sapie-b09be.web.app).

## Firebase Commands

**Default local flows use Docker Compose** (see [development_environment_setup.md](docs/dev/development_environment_setup.md),
E2E section above, and [`docs/dev/ai_agent_guidelines.md`](docs/dev/ai_agent_guidelines.md); rationale:
[`docs/adr/0001-firebase-emulators-docker-compose.md`](docs/adr/0001-firebase-emulators-docker-compose.md)).

## Environment Requirements

See **[development_environment_setup.md](docs/dev/development_environment_setup.md)** (prerequisites, checklist, Firebase
layout). Independent per-package installs are required for Firebase;
see [Firebase and monorepo tooling](#firebase-and-monorepo-tooling).
