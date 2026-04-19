const DEFAULT_MIME = 'application/octet-stream';
const MAX_MEDIA_TYPE_LENGTH = 255;

/**
 * Normalizes the request `Content-Type` for Storage metadata and Firestore.
 * Strips parameters (e.g. charset). Empty or missing header → `application/octet-stream`.
 */
export function normalizeBodyMimeType(contentTypeHeader: string | undefined): string {
  const raw = contentTypeHeader?.split(';')[0]?.trim() ?? '';
  if (!raw) {
    return DEFAULT_MIME;
  }
  return raw;
}

export function isMultipartMediaType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('multipart/');
}

export function isMediaTypeTooLong(mimeType: string): boolean {
  return mimeType.length > MAX_MEDIA_TYPE_LENGTH;
}
