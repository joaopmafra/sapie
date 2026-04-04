import { ValidationError } from 'class-validator';

/** One field (JSON Pointer path) and its constraint messages. */
export interface FlattenedValidationError {
  /** JSON Pointer (RFC 6901), e.g. `/name` or `/address/street`. */
  path: string;
  messages: string[];
}

/**
 * Flattens `class-validator` tree errors into path + messages using JSON Pointer segments.
 */
export function flattenValidationErrors(errors: ValidationError[]): FlattenedValidationError[] {
  const byPath = new Map<string, string[]>();

  const visit = (error: ValidationError, parentPointer: string): void => {
    const segment = escapeJsonPointerSegment(error.property);
    const pointer = parentPointer === '' ? `/${segment}` : `${parentPointer}/${segment}`;

    if (error.constraints) {
      const msgs = Object.values(error.constraints);
      if (msgs.length > 0) {
        const existing = byPath.get(pointer) ?? [];
        byPath.set(pointer, [...existing, ...msgs]);
      }
    }

    for (const child of error.children ?? []) {
      visit(child, pointer);
    }
  };

  for (const error of errors) {
    visit(error, '');
  }

  return [...byPath.entries()].map(([path, messages]) => ({ path, messages }));
}

/**
 * Escapes `~` and `/` per RFC 6901 so property names are safe as pointer segments.
 */
function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}
