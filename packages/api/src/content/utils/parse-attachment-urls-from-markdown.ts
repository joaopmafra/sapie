/**
 * Matches markdown / API paths for note attachment bodies:
 * `/api/content/{noteId}/attachments/{attachmentId}/body` (optional origin prefix).
 */
const ATTACHMENT_BODY_URL_RE =
  /(?:^|[\s("'[(])(?:https?:\/\/[^/\s"'[(]+)?(\/api\/content\/([^/?#\s"'[\]]+)\/attachments\/([^/?#\s"'[\]]+)\/body)/g;

/**
 * Returns attachment ids referenced in markdown for the given note.
 * Ignores references to other notes' attachment paths.
 */
export function parseReferencedAttachmentIds(markdown: string, noteId: string): Set<string> {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(ATTACHMENT_BODY_URL_RE)) {
    const refNoteId = match[2];
    const attachmentId = match[3];
    if (refNoteId === noteId && attachmentId) {
      ids.add(attachmentId);
    }
  }
  return ids;
}
