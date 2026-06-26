/**
 * OpenAPI/axios `basePath` for the app’s generated clients (empty string = same origin / Vite proxy to `/api`).
 * Set in `.env*`: `VITE_API_BASE_URL` (see `README.md` and `vite-env.d.ts`).
 *
 * Value is bridged from Vite via `bridgeViteEnvToGlobal()` in `main.tsx` so Jest can import this module.
 */
export function getApiBaseUrl(): string {
  return (
    (globalThis as { __SAPIE_VITE_API_BASE_URL__?: string })
      .__SAPIE_VITE_API_BASE_URL__ ?? ''
  );
}
