import { CONTENT_NAME_MAX_LENGTH } from './content-name-limits';

function randomSuffix(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export function extensionFromImageFile(file: File): string {
  const fromName = file.name
    .split(/[/\\]/)
    .pop()
    ?.split('.')
    .pop()
    ?.toLowerCase();
  if (fromName && /^(png|jpe?g|gif|webp)$/.test(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  const fromType = file.type.split('/')[1]?.toLowerCase();
  if (fromType === 'jpeg') {
    return 'jpg';
  }
  if (fromType && ['png', 'gif', 'webp', 'jpg'].includes(fromType)) {
    return fromType;
  }
  return 'png';
}

/**
 * Opaque Firestore content name for an inline image attachment.
 * User-facing identity is the content id in markdown, not this name.
 */
export function generateUniqueImageContentName(file: File): string {
  const ext = extensionFromImageFile(file);
  const suffix = randomSuffix();
  const stem = 'image';
  const maxStemLength =
    CONTENT_NAME_MAX_LENGTH - ext.length - suffix.length - 2;
  const trimmedStem =
    stem.length > maxStemLength
      ? stem.slice(0, Math.max(maxStemLength, 1))
      : stem;
  return `${trimmedStem}-${suffix}.${ext}`;
}
