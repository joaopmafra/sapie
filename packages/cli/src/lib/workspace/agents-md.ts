import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Generate AGENTS.md at the workspace root on first pull.
 * Never overwrites an existing file.
 */
export async function generateAgentsMd(workspaceRoot: string): Promise<void> {
  const filePath = path.join(workspaceRoot, 'AGENTS.md');
  try {
    await fs.access(filePath);
    return; // already exists — don't overwrite
  } catch {
    // doesn't exist — create it
  }

  const content = `# Sapie Workspace — AI Agent Instructions

This directory is a **local mirror** of your Sapie content tree.
The Sapie backend is the **source of truth**; this local copy is for editing convenience.

## Directory structure

| Local path | Sapie type | Description |
|-----------|-----------|-------------|
| \`FolderName/\` | folder | Plain directory |
| \`NoteName.md/\` | note | Directory containing \`index.md\` (the note body), \`decks/\` (flashcard decks), \`blobs/\` (images) |
| \`decks/DeckName.json\` | deck | JSON file with \`name\` and \`cards\` array |

**Rule:** A directory ending in \`.md\` with an \`index.md\` is a note. Without \`index.md\`, it's a folder.

## How to edit notes

Edit the \`index.md\` file inside a note directory. The file is standard Markdown.

## Deck JSON format

\`\`\`json
{
  "name": "Deck Name",
  "cards": [
    {
      "id": "abc123",
      "front": "Question text",
      "back": "Answer text",
      "dueDate": "2026-07-05T00:00:00.000Z",
      "interval": 2,
      "repetitions": 1,
      "lastResult": "know",
      "lastStudied": "2026-07-03T00:00:00.000Z",
      "correctCount": 1,
      "incorrectCount": 0
    }
  ]
}
\`\`\`

- **id**: Sapie card ID. Set to \`null\` for new cards you want to create.
- **Study state fields** (\`dueDate\`, \`interval\`, \`repetitions\`, \`lastResult\`, \`lastStudied\`, \`correctCount\`, \`incorrectCount\`) are **read-only** — they are populated on \`pull\` for reference but never pushed. Only \`front\` and \`back\` are pushed.
- **Card order** in the array is not pushable. Cards are returned in creation order.
- **Deck name**: The file name is authoritative. The JSON \`name\` field is synced on pull, ignored on push.

## Sync commands

| Command | Description |
|---------|-------------|
| \`sapie pull\` | Download content tree from Sapie |
| \`sapie push\` | Upload local changes to Sapie |
| \`sapie status\` | Preview changes (Phase 2) |
| \`sapie deck\` | Manage decks (Phase 2) |

## Concurrency warning

**Run \`sapie pull\` before editing in the web app.**
Metadata changes (renames, creates, deletes) are last-writer-wins in Phase 1.
The primary safety net is \`expectedRevision\` for body bytes.
Pessimistic locking will be added in Phase 3.

## Git workflow

This directory is designed to be a Git repo:

\`\`\`bash
git init
git add -A
git commit -m "Initial sync"
# After edits:
sapie pull && sapie push && git add -A && git commit -m "Sync $(date -I)"
\`\`\`

The \`.sapie/auth.json\` and \`.sapie/state.json\` files are gitignored automatically.
`;

  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Generate .gitignore at the workspace root on first pull.
 * Never overwrites an existing file.
 */
export async function generateGitignore(workspaceRoot: string): Promise<void> {
  const filePath = path.join(workspaceRoot, '.gitignore');
  try {
    await fs.access(filePath);
    return;
  } catch {
    // doesn't exist
  }

  const content = `# Sapie sync state
.sapie/auth.json
.sapie/state.json

# OS
.DS_Store
Thumbs.db

# Editor
*.swp
*.swo
*~
`;

  await fs.writeFile(filePath, content, 'utf-8');
}
