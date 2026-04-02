import { BadRequestException } from '@nestjs/common';

/** Minimum length for content display names (after validation; trimming is not applied). */
export const CONTENT_NAME_MIN_LENGTH = 1;

/** Maximum length for content display names (JavaScript string length / UTF-16 code units). */
export const CONTENT_NAME_MAX_LENGTH = 200;

/**
 * Characters unsafe or invalid in common file systems (Windows + portable subset).
 * Space (U+0020) is allowed; other ASCII control characters (U+0000–U+001F) are not.
 */
const ILLEGAL_FILE_NAME_CHAR = /[/\\:*?"<>|]/;

function containsAsciiControlCharacter(name: string): boolean {
  for (let i = 0; i < name.length; i++) {
    if (name.charCodeAt(i) < 0x20) {
      return true;
    }
  }
  return false;
}

export function assertValidContentName(name: unknown): asserts name is string {
  if (typeof name !== 'string') {
    throw new BadRequestException('Name must be a string');
  }
  if (name.length < CONTENT_NAME_MIN_LENGTH) {
    throw new BadRequestException(
      `Name must be at least ${CONTENT_NAME_MIN_LENGTH} character(s) long`
    );
  }
  if (name.length > CONTENT_NAME_MAX_LENGTH) {
    throw new BadRequestException(
      `Name must be at most ${CONTENT_NAME_MAX_LENGTH} characters long`
    );
  }
  if (ILLEGAL_FILE_NAME_CHAR.test(name) || containsAsciiControlCharacter(name)) {
    throw new BadRequestException(
      'Name cannot contain path separators (\\, /), colons, wildcards (*, ?), ' +
        'quotes, angle brackets, pipes, or control characters'
    );
  }
}
