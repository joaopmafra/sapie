import type { Content } from './types';
import { ContentType } from './types';

/** `body.updatedAt` ISO for cache keys; `null` when there is no stored body yet. */
export function noteBodyVersionKey(note: Content | undefined): string | null {
  if (!note || note.type !== ContentType.NOTE) return null;
  return note.body?.updatedAt?.toISOString() ?? null;
}
