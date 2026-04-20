import { noteBodyVersionKey } from './content-body-cache-policy';
import type { Content } from './types';
import { ContentType } from './types';

describe('noteBodyVersionKey', () => {
  it('returns null for directories', () => {
    const dir: Content = {
      id: 'r',
      name: 'Root',
      type: ContentType.DIRECTORY,
      parentId: null,
      ownerId: 'u',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(noteBodyVersionKey(dir)).toBeNull();
  });

  it('returns null when a note has no stored body yet', () => {
    const note: Content = {
      id: 'n',
      name: 'N',
      type: ContentType.NOTE,
      parentId: 'p',
      ownerId: 'u',
      body: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(noteBodyVersionKey(note)).toBeNull();
  });

  it('returns body.updatedAt ISO for notes with a body', () => {
    const t = new Date('2026-04-19T12:00:00.000Z');
    const note: Content = {
      id: 'n',
      name: 'N',
      type: ContentType.NOTE,
      parentId: 'p',
      ownerId: 'u',
      body: {
        mimeType: 'text/markdown',
        size: 1,
        createdAt: t,
        updatedAt: t,
      },
      createdAt: t,
      updatedAt: t,
    };
    expect(noteBodyVersionKey(note)).toBe(t.toISOString());
  });
});
