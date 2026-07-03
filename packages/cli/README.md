# @sapie/cli

Sapie Sync CLI — synchronize your Sapie content tree to a local filesystem workspace.

## Setup

```bash
cd packages/cli
pnpm install
pnpm run link:global   # builds and makes `sapie` available globally
```

Verify:

```bash
sapie --version
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

```bash
cd packages/cli
pnpm unlink --global
```

## Commands

| Command | Description |
|---------|-------------|
| `sapie init` | Initialize a new workspace in CWD (`--folder <dir>` for elsewhere, `--url <env>` for config, `--auth <google\|email>` for auth method) |
| `sapie login` | Authenticate with Google (`--auth google`) or email/password (`--auth email`) |
| `sapie logout` | Clear stored credentials |
| `sapie pull` | Download content tree from Sapie |
| `sapie push` | Upload local changes to Sapie |
| `sapie status` | Preview local changes (dry-run) |
| `sapie deck` | Manage flashcard decks (create, ls, add, edit, rm) |

Run `sapie <command> --help` for options.

## Workspace auto-detection

All commands automatically detect the workspace root by searching upward
from the current directory for `.sapie/config.json`. The `--workspace` flag overrides this.

This means you can run commands from anywhere inside your workspace tree without repeating
`--workspace` each time:

```bash
cd ~/sapie-workspace/My\ Contents/SomeNote.md/
sapie deck ls decks/MyDeck.json   # auto-detects workspace root
sapie status                       # works from any subdirectory
```

## Local workspace structure

```
~/sapie-workspace/
  .sapie/config.json    # API URL + Firebase config
  .sapie/auth.json      # tokens (gitignored)
  .sapie/state.json     # sync state
  AGENTS.md             # AI agent instructions (auto-generated)
  .gitignore
  My Contents/           # root folder
    FolderA/             # folder
    NoteB.md/            # note directory
      index.md           # note body (Markdown)
      decks/             # child flashcard decks
        DeckName.json
```

## Development

```bash
pnpm test              # run tests
pnpm run verify:all    # type-check + lint + format
pnpm run build         # compile TypeScript
pnpm run dev           # run with tsx (no build needed)
```
