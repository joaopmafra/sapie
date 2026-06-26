/** Matches backend `CONTENT_BODY_MAX_BYTES` in `packages/api/src/content/constants/content-body-limits.ts`. */
export const CONTENT_BODY_MAX_BYTES = 2 * 1024 * 1024;

export function formatContentBodyMaxSizeMb(): string {
  return `${CONTENT_BODY_MAX_BYTES / (1024 * 1024)} MB`;
}

export function assertImageUploadWithinSizeLimit(file: File): void {
  if (file.size > CONTENT_BODY_MAX_BYTES) {
    throw new Error(
      `Image is too large (${Math.ceil(file.size / 1024)} KB). Maximum size is ${formatContentBodyMaxSizeMb()}.`
    );
  }
}
