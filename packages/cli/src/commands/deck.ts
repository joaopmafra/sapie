import * as fs from 'fs';
import * as path from 'path';
import * as fsp from 'fs/promises';
import type { Argv } from 'yargs';
import { LocalDeck, LocalCard } from '../lib/state/sync-state';

function readDeckFile(deckPath: string): LocalDeck {
  if (!fs.existsSync(deckPath)) {
    console.error(`✗ Deck file not found: ${deckPath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(deckPath, 'utf-8');
  return JSON.parse(raw) as LocalDeck;
}

function writeDeckFile(deckPath: string, deck: LocalDeck): void {
  fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2), 'utf-8');
}

async function handleCreate(args: { notePath: string; name: string }): Promise<void> {
  const noteDir = args.notePath;

  let stat;
  try {
    stat = fs.statSync(noteDir);
  } catch {
    console.error(`✗ Note directory not found: ${noteDir}`);
    process.exit(1);
  }

  if (!stat.isDirectory()) {
    console.error(`✗ Not a note directory: ${noteDir}`);
    process.exit(1);
  }

  const indexPath = path.join(noteDir, 'index.md');
  if (!fs.existsSync(indexPath)) {
    console.error(`✗ Not a note directory (missing index.md): ${noteDir}`);
    process.exit(1);
  }

  const decksDir = path.join(noteDir, 'decks');
  await fsp.mkdir(decksDir, { recursive: true });

  const safeName = args.name.replace(/[\\/:*?"<>|]/g, '_');
  const deckFilePath = path.join(decksDir, `${safeName}.json`);

  if (fs.existsSync(deckFilePath)) {
    console.error(`✗ Deck already exists: ${deckFilePath}`);
    process.exit(1);
  }

  const deck: LocalDeck = { name: args.name, cards: [] };
  writeDeckFile(deckFilePath, deck);
  console.log(`✓ Created deck "${args.name}" at ${deckFilePath}`);
}

async function handleList(args: { deckPath: string }): Promise<void> {
  const deck = readDeckFile(args.deckPath);

  if (deck.cards.length === 0) {
    console.log('No cards.');
    return;
  }

  console.log(`Deck: ${deck.name} (${deck.cards.length} cards)`);
  for (let i = 0; i < deck.cards.length; i++) {
    const card = deck.cards[i];
    console.log(`[${i}] Q: ${card.front} | A: ${card.back}`);
  }
}

async function handleAdd(args: { deckPath: string; front: string; back: string }): Promise<void> {
  const deck = readDeckFile(args.deckPath);

  const card: LocalCard = { id: null, front: args.front, back: args.back };
  deck.cards.push(card);
  writeDeckFile(args.deckPath, deck);

  console.log(`✓ Added card [${deck.cards.length - 1}]: Q: ${args.front} | A: ${args.back}`);
}

async function handleEdit(args: {
  deckPath: string;
  index: number;
  front?: string;
  back?: string;
}): Promise<void> {
  if (args.front === undefined && args.back === undefined) {
    console.error('✗ Must specify --front and/or --back.');
    process.exit(1);
  }

  const deck = readDeckFile(args.deckPath);

  if (args.index < 0 || args.index >= deck.cards.length) {
    console.error(
      `✗ Invalid index: ${args.index}. Deck has ${deck.cards.length} card(s) (0–${deck.cards.length - 1}).`
    );
    process.exit(1);
  }

  const card = deck.cards[args.index];
  if (args.front !== undefined) card.front = args.front;
  if (args.back !== undefined) card.back = args.back;

  writeDeckFile(args.deckPath, deck);
  console.log(`✓ Updated card [${args.index}]: Q: ${card.front} | A: ${card.back}`);
}

async function handleRemove(args: { deckPath: string; index: number }): Promise<void> {
  const deck = readDeckFile(args.deckPath);

  if (args.index < 0 || args.index >= deck.cards.length) {
    console.error(
      `✗ Invalid index: ${args.index}. Deck has ${deck.cards.length} card(s) (0–${deck.cards.length - 1}).`
    );
    process.exit(1);
  }

  const removed = deck.cards.splice(args.index, 1)[0];
  writeDeckFile(args.deckPath, deck);

  console.log(`✓ Removed card [${args.index}]: Q: ${removed.front} | A: ${removed.back}`);
}

export const deckCommand = {
  command: 'deck <action>',
  describe: 'Manage flashcard decks',
  builder: (y: Argv) =>
    y
      .command(
        'create <notePath>',
        'Create a new flashcard deck in a note',
        (builder: Argv) =>
          builder
            .positional('notePath', {
              type: 'string' as const,
              demandOption: true,
              description: 'Path to the note directory (e.g. folder/MyNote.md)',
            })
            .option('name', {
              type: 'string' as const,
              demandOption: true,
              description: 'Deck name',
            }),
        (args) => handleCreate(args as { notePath: string; name: string })
      )
      .command(
        'ls <deckPath>',
        'List cards in a deck',
        (builder: Argv) =>
          builder.positional('deckPath', {
            type: 'string' as const,
            demandOption: true,
            description: 'Path to the deck JSON file (e.g. folder/MyNote.md/decks/mycards.json)',
          }),
        (args) => handleList(args as { deckPath: string })
      )
      .command(
        'add <deckPath>',
        'Add a card to a deck',
        (builder: Argv) =>
          builder
            .positional('deckPath', {
              type: 'string' as const,
              demandOption: true,
              description: 'Path to the deck JSON file',
            })
            .option('front', {
              type: 'string' as const,
              demandOption: true,
              description: 'Front side text (question)',
            })
            .option('back', {
              type: 'string' as const,
              demandOption: true,
              description: 'Back side text (answer)',
            }),
        (args) => handleAdd(args as { deckPath: string; front: string; back: string })
      )
      .command(
        'edit <deckPath>',
        'Edit a card in a deck',
        (builder: Argv) =>
          builder
            .positional('deckPath', {
              type: 'string' as const,
              demandOption: true,
              description: 'Path to the deck JSON file',
            })
            .option('index', {
              type: 'number' as const,
              demandOption: true,
              description: 'Card index (0-based)',
            })
            .option('front', {
              type: 'string' as const,
              description: 'New front side text',
            })
            .option('back', {
              type: 'string' as const,
              description: 'New back side text',
            }),
        (args) =>
          handleEdit(
            args as {
              deckPath: string;
              index: number;
              front?: string;
              back?: string;
            }
          )
      )
      .command(
        'rm <deckPath>',
        'Remove a card from a deck',
        (builder: Argv) =>
          builder
            .positional('deckPath', {
              type: 'string' as const,
              demandOption: true,
              description: 'Path to the deck JSON file',
            })
            .option('index', {
              type: 'number' as const,
              demandOption: true,
              description: 'Card index (0-based)',
            }),
        (args) => handleRemove(args as { deckPath: string; index: number })
      ),
  handler: () => {
    // Subcommands handle their own execution; this is only reached when no subcommand matches.
    console.error('✗ Please specify an action: create, ls, add, edit, rm');
    process.exit(1);
  },
};

// Re-exports for testing
export { handleCreate, handleList, handleAdd, handleEdit, handleRemove };
