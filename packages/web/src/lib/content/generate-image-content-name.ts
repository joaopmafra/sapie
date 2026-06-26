import { CONTENT_NAME_MAX_LENGTH } from './content-name-limits';
import { sanitizeImageContentName } from './sanitize-image-content-name';

function randomSuffix(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function splitStemAndExt(sanitized: string): { stem: string; ext: string } {
  const dotIndex = sanitized.lastIndexOf('.');
  const hasExt =
    dotIndex > 0 &&
    dotIndex < sanitized.length - 1 &&
    dotIndex >= sanitized.length - 6;
  if (hasExt) {
    return {
      stem: sanitized.slice(0, dotIndex),
      ext: sanitized.slice(dotIndex + 1),
    };
  }
  return { stem: sanitized, ext: 'png' };
}

/**
 * Builds a unique Firestore content name for an inline image attachment.
 * Always appends a random suffix so repeated uploads (e.g. clipboard `image.png`) do not 409.
 */
export function generateUniqueImageContentName(
  fileName: string,
  nameStemOverride?: string
): string {
  const sanitizedOverride = nameStemOverride?.trim()
    ? sanitizeImageContentName(nameStemOverride.trim())
    : '';
  const sanitizedFile = sanitizeImageContentName(fileName);
  const { ext } = splitStemAndExt(sanitizedFile);
  const rawStem =
    sanitizedOverride || splitStemAndExt(sanitizedFile).stem || 'image';
  const stem = rawStem.replace(/\.[^.]+$/, '') || 'image';
  const suffix = randomSuffix();
  const maxStemLength =
    CONTENT_NAME_MAX_LENGTH - ext.length - suffix.length - 2;
  const trimmedStem =
    stem.length > maxStemLength
      ? stem.slice(0, Math.max(maxStemLength, 1))
      : stem;
  return `${trimmedStem}-${suffix}.${ext}`;
}
