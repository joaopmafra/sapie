/**
 * Blob content-type ↔ file extension mapping for CLI blob sync.
 * Supports common image formats. Unknown types fall back to .bin or application/octet-stream.
 */

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/** Map a MIME content-type to a file extension (with leading dot). Falls back to .bin. */
export function contentTypeToExtension(contentType: string): string {
  const normalized = contentType.split(';')[0]?.trim().toLowerCase();
  return MIME_TO_EXT[normalized] ?? '.bin';
}

/** Map a file extension (with or without leading dot) to a MIME content-type. Falls back to application/octet-stream. */
export function extensionToContentType(ext: string): string {
  const normalized = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return EXT_TO_MIME[normalized] ?? 'application/octet-stream';
}
