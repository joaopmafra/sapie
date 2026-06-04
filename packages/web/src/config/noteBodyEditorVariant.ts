/**
 * Rich MDXEditor is the default in the browser (after `bridgeViteEnvToGlobal()` in `main.tsx`).
 * Jest defaults to plain unless `VITE_NOTE_EDITOR=rich` is set for focused MDXEditor tests.
 */
export function getNoteBodyEditorVariant(): 'rich' | 'plain' {
  if (
    typeof process !== 'undefined' &&
    process.env.JEST_WORKER_ID !== undefined
  ) {
    if (process.env.VITE_NOTE_EDITOR === 'rich') {
      return 'rich';
    }
    return 'plain';
  }

  const explicit = (globalThis as { __SAPIE_VITE_NOTE_EDITOR__?: string })
    .__SAPIE_VITE_NOTE_EDITOR__;
  if (explicit === 'plain') {
    return 'plain';
  }
  if (explicit === 'rich') {
    return 'rich';
  }
  return 'rich';
}
