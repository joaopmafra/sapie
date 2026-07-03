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
# 1. Create a workspace (defaults to ~/sapie-workspace; use --workspace . to init here)
sapie init --firebase-api-key "<your-firebase-web-api-key>"

# 2. cd into it (or skip if you used --workspace .)
cd ~/sapie-workspace

# 3. Log in
sapie login --method email

# 4. Pull your content
sapie pull

# 5. Edit files locally, then push changes back
sapie push
```

When running commands from inside a workspace (a directory containing `.sapie/config.json`),
the `--workspace` flag is optional — the CLI auto-detects the workspace root by walking up
from the current directory. You can always override with `--workspace <path>`.

To unlink later:

```bash
cd packages/cli
pnpm unlink --global
```

## Commands

| Command | Description |
|---------|-------------|
| `sapie init` | Initialize a new workspace (creates `.sapie/config.json`, `AGENTS.md`, `.gitignore`) |
| `sapie login` | Authenticate with Google (`--method google`) or email/password (`--method email`) |
| `sapie logout` | Clear stored credentials |
| `sapie pull` | Download content tree from Sapie |
| `sapie push` | Upload local changes to Sapie |
| `sapie status` | Preview local changes (dry-run) |
| `sapie deck` | Manage flashcard decks (create, ls, add, edit, rm) |

Run `sapie <command> --help` for options.

## Workspace auto-detection

All commands (except `init`) automatically detect the workspace root by searching upward
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
