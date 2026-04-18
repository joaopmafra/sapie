export const contentQueryKeys = {
  root: () => ['content', 'root'] as const,
  allChildren: () => ['content', 'children'] as const,
  children: (parentId: string) => ['content', 'children', parentId] as const,
  item: (id: string) => ['content', 'item', id] as const,
  /** Signed read URL for `GET /api/content/:id/body`. Invalidate after `PUT …/body` or when metadata `size` changes. */
  bodySignedUrl: (id: string) => ['content', 'body-signed-url', id] as const,
  /**
   * Fetched markdown bytes for a note. Key includes `signedUrl` so the cache stays correct when the URL rotates (~10m)
   * or after invalidation. Invalidate with prefix `['content', 'note-markdown', id]` after saves.
   */
  noteMarkdown: (id: string, signedUrl: string) =>
    ['content', 'note-markdown', id, signedUrl] as const,
} as const;
