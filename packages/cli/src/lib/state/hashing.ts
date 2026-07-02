import * as crypto from 'crypto';
import { LocalCard } from './sync-state';

/**
 * Compute a canonical SHA-256 hash of card content (front/back only, no study state).
 * Canonicalization: sort by id → front → back, join with tab/newline, SHA-256.
 * This ensures reformatting the JSON produces the same hash.
 */
export function computeCardHash(cards: LocalCard[]): string {
  const normalized = cards
    .map((c) => ({ id: c.id, front: c.front, back: c.back }))
    .sort((a, b) => {
      if (a.id !== null && b.id !== null) return a.id.localeCompare(b.id);
      if (a.id === null && b.id === null) {
        const frontCmp = a.front.localeCompare(b.front);
        if (frontCmp !== 0) return frontCmp;
        return a.back.localeCompare(b.back);
      }
      return a.id === null ? 1 : -1;
    });

  const lines = normalized.map((c) => [c.id ?? '', c.front, c.back].join('\t'));
  const input = lines.join('\n');

  return sha256(input);
}

/**
 * Compute a canonical SHA-256 hash of note body bytes.
 * Normalizes line endings (CRLF → LF, bare CR → LF), strips BOM.
 * Trailing whitespace is preserved (may be intentional markdown).
 */
export function computeBodyHash(content: string | Buffer): string {
  let text = typeof content === 'string' ? content : content.toString('utf-8');

  // Strip leading BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Normalize line endings: CRLF → LF, bare CR → LF
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return sha256(text);
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf-8').digest('hex');
}
