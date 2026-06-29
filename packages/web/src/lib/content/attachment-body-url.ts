import { getApiBaseUrl } from '../apiBaseUrl.ts';

const ATTACHMENT_BODY_PATH_RE =
  /^(?:(?:https?:\/\/[^/]+)?)(\/api\/content\/([^/?#]+)\/attachments\/([^/?#]+)\/body)(?:[?#].*)?$/;

/** Stable markdown/API path for a note attachment body. */
export function attachmentBodyApiPath(
  noteId: string,
  attachmentId: string
): string {
  return `/api/content/${noteId}/attachments/${attachmentId}/body`;
}

/**
 * URL to embed in note markdown. Uses `VITE_API_BASE_URL` when set (cross-origin dev).
 */
export function attachmentBodyMarkdownUrl(
  noteId: string,
  attachmentId: string
): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const path = attachmentBodyApiPath(noteId, attachmentId);
  return base ? `${base}${path}` : path;
}

export function parseAttachmentBodyUrl(
  src: string
): { noteId: string; attachmentId: string } | null {
  const trimmed = src.trim();
  const match = ATTACHMENT_BODY_PATH_RE.exec(trimmed);
  if (!match?.[2] || !match?.[3]) {
    return null;
  }
  return { noteId: match[2], attachmentId: match[3] };
}

export function isAttachmentBodyUrl(src: string): boolean {
  return parseAttachmentBodyUrl(src) != null;
}

/** @deprecated Legacy Story 71 content-body URLs; kept for preview fallback during migration. */
export { isContentBodyUrl, parseContentBodyUrl } from './content-body-url';
