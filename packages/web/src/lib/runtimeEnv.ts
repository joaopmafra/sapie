/** True when running the Vite dev server or a dev build. False in production. */
export function isViteDev(): boolean {
  return typeof import.meta !== 'undefined' && Boolean(import.meta.env.DEV);
}
