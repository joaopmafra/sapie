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
# 1. Create a workspace
sapie init --firebase-api-key "<your-firebase-web-api-key>"

# 2. Log in
sapie login --method email

# 3. Pull your content
sapie pull

# 4. Edit files locally, then push changes back
sapie push
```

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
