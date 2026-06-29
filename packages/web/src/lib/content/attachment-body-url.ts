import { getApiBaseUrl } from '../apiBaseUrl.ts';

const BLOB_PATH_RE =
  /^(?:(?:https?:\/\/[^/]+)?)(\/api\/content\/([^/?#]+)\/blobs\/([^/?#]+))(?:[?#].*)?$/;

/** Stable API path for a note blob. */
export function blobApiPath(contentId: string, blobId: string): string {
  return `/api/content/${contentId}/blobs/${blobId}`;
}

/**
 * URL to embed in note markdown. Uses `VITE_API_BASE_URL` when set (cross-origin dev).
 */
export function blobMarkdownUrl(contentId: string, blobId: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const path = blobApiPath(contentId, blobId);
  return base ? `${base}${path}` : path;
}

/** Parses a blob URL/path and returns the content + blob ids, or null. */
export function parseBlobUrl(
  src: string
): { contentId: string; blobId: string } | null {
  const trimmed = src.trim();
  const match = BLOB_PATH_RE.exec(trimmed);
  if (!match?.[2] || !match?.[3]) {
    return null;
  }
  return { contentId: match[2], blobId: match[3] };
}

export function isBlobUrl(src: string): boolean {
  return parseBlobUrl(src) != null;
}

// Legacy re-exports for migration compatibility — used by preview fallback during transition.
export { isContentBodyUrl, parseContentBodyUrl } from './content-body-url';
