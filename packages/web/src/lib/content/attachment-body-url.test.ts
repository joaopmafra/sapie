import {
  blobApiPath,
  blobMarkdownUrl,
  parseBlobUrl,
  isBlobUrl,
} from './attachment-body-url';

describe('blobMarkdownUrl', () => {
  it('builds content-scoped blob path', () => {
    expect(blobApiPath('note-1', 'blob-abc123')).toBe(
      '/api/content/note-1/blobs/blob-abc123'
    );
    expect(blobMarkdownUrl('note-1', 'blob-abc123')).toMatch(
      /\/api\/content\/note-1\/blobs\/blob-abc123$/
    );
  });
});

describe('parseBlobUrl', () => {
  it('parses valid blob URLs', () => {
    expect(parseBlobUrl('/api/content/n-1/blobs/b-1')).toEqual({
      contentId: 'n-1',
      blobId: 'b-1',
    });
  });

  it('returns null for non-blob URLs', () => {
    expect(parseBlobUrl('/api/content/n-1/body')).toBeNull();
    expect(parseBlobUrl('/other/path')).toBeNull();
  });

  it('handles full URLs with origin', () => {
    expect(
      parseBlobUrl('https://example.com/api/content/n-1/blobs/b-1')
    ).toEqual({ contentId: 'n-1', blobId: 'b-1' });
  });
});

describe('isBlobUrl', () => {
  it('returns true for blob URLs', () => {
    expect(isBlobUrl('/api/content/n-1/blobs/b-1')).toBe(true);
  });

  it('returns false for non-blob URLs', () => {
    expect(isBlobUrl('/api/content/n-1/body')).toBe(false);
  });
});
