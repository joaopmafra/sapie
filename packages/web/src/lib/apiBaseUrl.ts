/**
 * OpenAPI/axios `basePath` for the app’s generated clients (empty string = same origin / Vite proxy to `/api`).
 * Set in `.env*`: `VITE_API_BASE_URL` (see `README.md` and `vite-env.d.ts`).
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '';
}
