import { getApiBaseUrl } from '../apiBaseUrl.ts';

const CONTENT_BODY_PATH_RE =
  /^(?:(?:https?:\/\/[^/]+)?)(\/api\/content\/([^/?#]+)\/body)(?:[?#].*)?$/;

/** Stable markdown/API path for a content body (`/api/content/{id}/body`). */
export function contentBodyApiPath(contentId: string): string {
  return `/api/content/${contentId}/body`;
}

/**
 * URL to embed in note markdown. Uses `VITE_API_BASE_URL` when set (cross-origin dev).
 */
export function contentBodyMarkdownUrl(contentId: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const path = contentBodyApiPath(contentId);
  return base ? `${base}${path}` : path;
}

/** Parses a content body URL/path and returns the content id, or null. */
export function parseContentBodyUrl(src: string): string | null {
  const trimmed = src.trim();
  const match = CONTENT_BODY_PATH_RE.exec(trimmed);
  return match?.[2] ?? null;
}

export function isContentBodyUrl(src: string): boolean {
  return parseContentBodyUrl(src) != null;
}
