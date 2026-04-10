import { isAxiosError } from 'axios';

/** Keep in sync with `queryClient` default `queries.retry`. */
export const CONTENT_QUERY_MAX_RETRIES = 2;

/**
 * For GET /api/content/:id, 404 means the id is not (or no longer) valid — retrying
 * only duplicates failed requests. Other 4xx responses are treated the same way.
 */
export function contentItemQueryRetry(
  failureCount: number,
  error: unknown
): boolean {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 404) return false;
    if (status != null && status >= 400 && status < 500) return false;
  }
  return failureCount < CONTENT_QUERY_MAX_RETRIES;
}
