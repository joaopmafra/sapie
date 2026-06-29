import type { Content } from './types';
import { ContentType } from './types';

/** `body.updatedAt` ISO for cache keys; `null` when there is no stored body yet. */
export function noteBodyVersionKey(note: Content | undefined): string | null {
  if (!note || note.type !== ContentType.NOTE) return null;
  return note.body?.updatedAt?.toISOString() ?? null;
}

/** `body.updatedAt` ISO for optimistic locking; empty string before first save. */
export function noteBodyExpectedRevision(note: Content | undefined): string {
  if (!note || note.type !== ContentType.NOTE) return '';
  return note.body?.updatedAt?.toISOString() ?? '';
}
