/** Mirrors MDXEditor's internal defaultTranslation (not exported from the package). */
export function applyMdxEditorInterpolations(
  defaultValue: string,
  interpolations?: Record<string, unknown>
): string {
  let value = defaultValue;
  if (interpolations) {
    for (const [k, v] of Object.entries(interpolations)) {
      value = value.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return value;
}

export function noteBodyToolbarTranslation(
  key: string,
  defaultValue: string,
  interpolations?: Record<string, unknown>
): string {
  if (key === 'contentArea.editableMarkdown') {
    return 'Note body';
  }
  return applyMdxEditorInterpolations(defaultValue, interpolations);
}
