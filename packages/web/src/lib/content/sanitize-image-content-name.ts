import { CONTENT_NAME_MAX_LENGTH } from './content-name-limits';

const ILLEGAL_FILE_NAME_CHAR = /[/\\:*?"<>|]/g;

function stripAsciiControlCharacters(name: string): string {
  let result = '';
  for (let i = 0; i < name.length; i++) {
    if (name.charCodeAt(i) >= 0x20) {
      result += name[i];
    }
  }
  return result;
}

/** Derives a valid content display name from an uploaded file name. */
export function sanitizeImageContentName(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop()?.trim() ?? '';
  let sanitized = baseName
    .replace(ILLEGAL_FILE_NAME_CHAR, '-')
    .replace(/\s+/g, ' ');
  sanitized = stripAsciiControlCharacters(sanitized);

  if (!sanitized) {
    sanitized = 'image';
  }

  if (sanitized.length > CONTENT_NAME_MAX_LENGTH) {
    const extMatch = /\.([^.]+)$/.exec(sanitized);
    const ext = extMatch ? `.${extMatch[1]}` : '';
    const stemMax = CONTENT_NAME_MAX_LENGTH - ext.length;
    sanitized = `${sanitized.slice(0, Math.max(stemMax, 1))}${ext}`;
  }

  return sanitized;
}
