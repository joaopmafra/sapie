import { Dirent } from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { ContentType } from '../api/types';
import { LocalDeck } from '../state/sync-state';

const CONTENT_DIR_NAME_BLACKLIST = /^\./;
const CONTENT_NAME_BLACKLIST = /[\\/:*?"<>|]/g;
const SAFE_REPLACEMENT = '_';
/** Substructure directories that should never be treated as content items. */
const CONTAINER_DIR_NAMES = new Set(['blobs', 'decks']);

/** Sanitize a content name for use as a filesystem name. */
export function sanitizeName(name: string, type: ContentType): string {
  let safe = name.replace(CONTENT_NAME_BLACKLIST, SAFE_REPLACEMENT);
  if (type === ContentType.NOTE) {
    safe = safe + '.md';
  }
  return safe;
}

/** Strip the .md suffix from a note directory name. */
export function unsanitizeName(dirName: string): string {
  if (dirName.endsWith('.md')) {
    return dirName.slice(0, -3);
  }
  return dirName;
}

/** Check if a directory is a note (has index.md). */
export async function isNoteDir(dirPath: string): Promise<boolean> {
  try {
    await fsp.access(path.join(dirPath, 'index.md'));
    return true;
  } catch {
    return false;
  }
}

/** Compute local filesystem path for a content item. */
export function computeLocalPath(
  parentLocalPath: string | null,
  name: string,
  type: ContentType
): string {
  const safeName = sanitizeName(name, type);
  if (parentLocalPath === null) {
    return safeName;
  }
  return path.join(parentLocalPath, safeName);
}

/** Write a note body (index.md) to disk. */
export async function writeNoteBody(
  workspaceRoot: string,
  localPath: string,
  body: string | null
): Promise<void> {
  const dir = path.join(workspaceRoot, localPath);
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(dir, 'index.md'), body ?? '', 'utf-8');
}

/** Read a note body from disk. */
export async function readNoteBody(
  workspaceRoot: string,
  localPath: string
): Promise<string | null> {
  try {
    return await fsp.readFile(path.join(workspaceRoot, localPath, 'index.md'), 'utf-8');
  } catch {
    return null;
  }
}

/** Write a deck JSON file to disk. */
export async function writeDeck(
  workspaceRoot: string,
  noteLocalPath: string,
  deck: LocalDeck
): Promise<void> {
  const decksDir = path.join(workspaceRoot, noteLocalPath, 'decks');
  await fsp.mkdir(decksDir, { recursive: true });
  const safeName = deck.name.replace(CONTENT_NAME_BLACKLIST, SAFE_REPLACEMENT);
  await fsp.writeFile(
    path.join(decksDir, `${safeName}.json`),
    JSON.stringify(deck, null, 2),
    'utf-8'
  );
}

/** Read a deck JSON file from disk. */
export async function readDeck(
  workspaceRoot: string,
  noteLocalPath: string,
  deckFileName: string
): Promise<LocalDeck | null> {
  try {
    const raw = await fsp.readFile(
      path.join(workspaceRoot, noteLocalPath, 'decks', deckFileName),
      'utf-8'
    );
    return JSON.parse(raw) as LocalDeck;
  } catch {
    return null;
  }
}

/** Ensure a folder directory exists. */
export async function ensureFolder(workspaceRoot: string, localPath: string): Promise<void> {
  await fsp.mkdir(path.join(workspaceRoot, localPath), { recursive: true });
}

/** Recursively delete a local path. */
export async function deleteLocalPath(workspaceRoot: string, localPath: string): Promise<void> {
  await fsp.rm(path.join(workspaceRoot, localPath), { recursive: true, force: true });
}

/** List all deck JSON files in a note's decks/ directory. */
export async function listDeckFiles(
  workspaceRoot: string,
  noteLocalPath: string
): Promise<string[]> {
  try {
    const entries = await fsp.readdir(path.join(workspaceRoot, noteLocalPath, 'decks'), {
      withFileTypes: true,
    });
    return entries.filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name);
  } catch {
    return [];
  }
}

// ── Blob file I/O ──

/** Ensure the blobs/ directory exists for a note. */
export async function ensureBlobsDir(workspaceRoot: string, noteLocalPath: string): Promise<void> {
  await fsp.mkdir(path.join(workspaceRoot, noteLocalPath, 'blobs'), {
    recursive: true,
  });
}

/** Write a blob file to {noteLocalPath}/blobs/{blobId}.{ext}. Creates blobs/ dir if needed. */
export async function writeBlob(
  workspaceRoot: string,
  noteLocalPath: string,
  blobId: string,
  ext: string,
  data: Buffer
): Promise<void> {
  const extWithDot = ext.startsWith('.') ? ext : `.${ext}`;
  const blobDir = path.join(workspaceRoot, noteLocalPath, 'blobs');
  await fsp.mkdir(blobDir, { recursive: true });
  await fsp.writeFile(path.join(blobDir, `${blobId}${extWithDot}`), data);
}

/** Read a blob file given its blobId (searches for {blobId}.* in blobs/). Returns null if not found. */
export async function readBlob(
  workspaceRoot: string,
  noteLocalPath: string,
  blobId: string
): Promise<{ data: Buffer; ext: string } | null> {
  const blobDir = path.join(workspaceRoot, noteLocalPath, 'blobs');
  try {
    const entries = await fsp.readdir(blobDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const nameWithoutExt = entry.name.includes('.')
        ? entry.name.slice(0, entry.name.indexOf('.'))
        : entry.name;
      if (nameWithoutExt === blobId) {
        const ext = path.extname(entry.name);
        const data = await fsp.readFile(path.join(blobDir, entry.name));
        return { data, ext };
      }
    }
  } catch {
    // Directory doesn't exist or can't be read — no blobs
  }
  return null;
}

/** List all blob files in a note's blobs/ directory. Returns [{ blobId, ext }]. */
export async function listBlobFiles(
  workspaceRoot: string,
  noteLocalPath: string
): Promise<Array<{ blobId: string; ext: string }>> {
  const blobDir = path.join(workspaceRoot, noteLocalPath, 'blobs');
  try {
    const entries = await fsp.readdir(blobDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => {
        const ext = path.extname(e.name);
        const blobId = e.name.includes('.') ? e.name.slice(0, e.name.indexOf('.')) : e.name;
        return { blobId, ext };
      });
  } catch {
    return [];
  }
}

/** Walk the local filesystem tree and return discovered paths. */
export async function walkLocalTree(
  workspaceRoot: string
): Promise<Array<{ localPath: string; isNote: boolean }>> {
  const results: Array<{ localPath: string; isNote: boolean }> = [];
  await walkDir(workspaceRoot, '', results);
  return results;
}

async function walkDir(
  workspaceRoot: string,
  relativePath: string,
  results: Array<{ localPath: string; isNote: boolean }>
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await fsp.readdir(path.join(workspaceRoot, relativePath), {
      withFileTypes: true,
    });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (CONTENT_DIR_NAME_BLACKLIST.test(entry.name)) continue;
    if (CONTAINER_DIR_NAMES.has(entry.name)) continue;

    const childPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

    if (entry.name.endsWith('.md')) {
      results.push({ localPath: childPath, isNote: true });
      const deckFiles = await listDeckFiles(workspaceRoot, childPath);
      for (const df of deckFiles) {
        results.push({ localPath: path.join(childPath, 'decks', df), isNote: false });
      }
    } else {
      const note = await isNoteDir(path.join(workspaceRoot, childPath));
      results.push({ localPath: childPath, isNote: note });
      if (!note) {
        await walkDir(workspaceRoot, childPath, results);
      } else {
        const deckFiles = await listDeckFiles(workspaceRoot, childPath);
        for (const df of deckFiles) {
          results.push({ localPath: path.join(childPath, 'decks', df), isNote: false });
        }
      }
    }
  }
}
