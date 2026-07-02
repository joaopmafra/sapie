import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  handleCreate,
  handleList,
  handleAdd,
  handleEdit,
  handleRemove,
} from '../../src/commands/deck';

describe('deck commands', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `sapie-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await fsp.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  /** Helper: create a temp note directory with index.md, suitable for handleCreate. */
  async function setupNoteDir(name = 'test-note'): Promise<string> {
    const dir = path.join(tmpDir, name);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, 'index.md'), '# Test Note\n');
    return dir;
  }

  /** Helper: create a deck JSON file and return its path. */
  function createDeckFile(
    dir: string,
    deckName: string,
    cards: Array<{ front: string; back: string }> = []
  ): string {
    const safeName = deckName.replace(/[\\/:*?"<>|]/g, '_');
    const decksDir = path.join(dir, 'decks');
    fs.mkdirSync(decksDir, { recursive: true });
    const filePath = path.join(decksDir, `${safeName}.json`);
    const deck = {
      name: deckName,
      cards: cards.map((c) => ({ id: null, front: c.front, back: c.back })),
    };
    fs.writeFileSync(filePath, JSON.stringify(deck, null, 2), 'utf-8');
    return filePath;
  }

  // ---------------------------------------------------------------------------
  // handleCreate
  // ---------------------------------------------------------------------------
  describe('handleCreate', () => {
    it('D1: creates deck file with empty cards array', async () => {
      const dir = await setupNoteDir();
      await handleCreate({ notePath: dir, name: 'My Deck' });

      const deckFile = path.join(dir, 'decks', 'My Deck.json');
      expect(fs.existsSync(deckFile)).toBe(true);

      const raw = fs.readFileSync(deckFile, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.name).toBe('My Deck');
      expect(parsed.cards).toEqual([]);
    });

    it('D2: fails if deck file already exists', async () => {
      const dir = await setupNoteDir();
      const decksDir = path.join(dir, 'decks');
      fs.mkdirSync(decksDir, { recursive: true });
      const existingPath = path.join(decksDir, 'My Deck.json');
      fs.writeFileSync(existingPath, '{}', 'utf-8');

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(handleCreate({ notePath: dir, name: 'My Deck' })).rejects.toThrow('exit');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Deck already exists'));

      exitSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // handleList
  // ---------------------------------------------------------------------------
  describe('handleList', () => {
    it('D3: lists cards with indices', async () => {
      const dir = await setupNoteDir();
      const dp = createDeckFile(dir, 'Test', [
        { front: 'Q1', back: 'A1' },
        { front: 'Q2', back: 'A2' },
      ]);

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await handleList({ deckPath: dp });

      expect(logSpy).toHaveBeenCalledWith('Deck: Test (2 cards)');
      expect(logSpy).toHaveBeenCalledWith('[0] Q: Q1 | A: A1');
      expect(logSpy).toHaveBeenCalledWith('[1] Q: Q2 | A: A2');

      logSpy.mockRestore();
    });

    it('D4: empty deck prints "No cards."', async () => {
      const dir = await setupNoteDir();
      const dp = createDeckFile(dir, 'Empty', []);

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await handleList({ deckPath: dp });

      expect(logSpy).toHaveBeenCalledWith('No cards.');

      logSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // handleAdd
  // ---------------------------------------------------------------------------
  describe('handleAdd', () => {
    it('D5: appends card with id:null', async () => {
      const dir = await setupNoteDir();
      const dp = createDeckFile(dir, 'AddDeck', [{ front: 'Existing', back: 'A' }]);

      await handleAdd({ deckPath: dp, front: 'New Q', back: 'New A' });

      const raw = fs.readFileSync(dp, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.cards).toHaveLength(2);
      expect(parsed.cards[1]).toMatchObject({
        id: null,
        front: 'New Q',
        back: 'New A',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // handleEdit
  // ---------------------------------------------------------------------------
  describe('handleEdit', () => {
    it('D6: updates card front', async () => {
      const dir = await setupNoteDir();
      const dp = createDeckFile(dir, 'EditDeck', [
        { front: 'Old Q', back: 'Old A' },
        { front: 'Keep', back: 'Keep A' },
      ]);

      await handleEdit({ deckPath: dp, index: 0, front: 'New Q' });

      const raw = fs.readFileSync(dp, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.cards[0].front).toBe('New Q');
      expect(parsed.cards[0].back).toBe('Old A'); // unchanged
      expect(parsed.cards[1].front).toBe('Keep'); // untouched
    });

    it('D7: fails with invalid index', async () => {
      const dir = await setupNoteDir();
      const dp = createDeckFile(dir, 'EditDeck', [{ front: 'Q', back: 'A' }]);

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(handleEdit({ deckPath: dp, index: 5, front: 'Bad' })).rejects.toThrow('exit');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid index: 5'));

      exitSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // handleRemove
  // ---------------------------------------------------------------------------
  describe('handleRemove', () => {
    it('D8: removes card', async () => {
      const dir = await setupNoteDir();
      const dp = createDeckFile(dir, 'RemoveDeck', [
        { front: 'Remove Me', back: 'A1' },
        { front: 'Keep Me', back: 'A2' },
      ]);

      await handleRemove({ deckPath: dp, index: 0 });

      const raw = fs.readFileSync(dp, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.cards).toHaveLength(1);
      expect(parsed.cards[0].front).toBe('Keep Me');
    });

    it('D9: fails with invalid index', async () => {
      const dir = await setupNoteDir();
      const dp = createDeckFile(dir, 'RemoveDeck', [{ front: 'Q', back: 'A' }]);

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(handleRemove({ deckPath: dp, index: 10 })).rejects.toThrow('exit');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid index: 10'));

      exitSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
