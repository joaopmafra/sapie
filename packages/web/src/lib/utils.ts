import { AxiosError } from 'axios';

/**
 * RFC 9457 Problem Details (`application/problem+json`) as produced by
 * `ProblemDetailsExceptionFilter` in `@sapie/api`, including the `errors` extension.
 *
 * @see packages/api/src/common/filters/problem-details.exception-filter.ts
 */
type ProblemDetailsLike = {
  detail: string;
  errors?: Array<{ path?: string; messages?: string[] }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProblemDetailsLike(
  data: Record<string, unknown>
): data is ProblemDetailsLike {
  return typeof data.detail === 'string';
}

function extractProblemDetailAndFirstMessages(data: ProblemDetailsLike): {
  detail: string;
  firstMessages: string[];
} {
  const detail = data.detail.trim();
  const errors = data.errors;
  const firstMessages: string[] = [];
  if (!Array.isArray(errors)) {
    return { detail, firstMessages };
  }
  for (const entry of errors) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const messages = entry.messages;
    if (!Array.isArray(messages)) {
      continue;
    }
    const first = messages[0];
    if (typeof first === 'string' && first.trim()) {
      firstMessages.push(first.trim());
    }
  }
  return { detail, firstMessages };
}

/**
 * Builds a single-line / semicolon string from RFC 9457 `detail` and
 * `errors[*].messages[0]` (e.g. for logs or non-Alert UIs).
 */
function messageFromProblemDetails(data: ProblemDetailsLike): string {
  const { detail, firstMessages } = extractProblemDetailAndFirstMessages(data);
  if (firstMessages.length === 0) {
    return detail;
  }
  const specifics = firstMessages.join('; ');
  if (firstMessages.length === 1 && specifics === detail) {
    return detail;
  }
  return `${detail}: ${specifics}`;
}

function messageFromLegacyNestBody(
  data: Record<string, unknown>
): string | null {
  const msg = data.message;
  if (typeof msg === 'string' && msg.trim()) {
    return msg.trim();
  }
  if (Array.isArray(msg)) {
    const strings = msg.filter(
      (m): m is string => typeof m === 'string' && m.trim().length > 0
    );
    if (strings.length > 0) {
      return strings.join('; ');
    }
  }
  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error.trim();
  }
  return null;
}

function messageFromAxiosResponseData(data: unknown): string | null {
  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }
  if (!isRecord(data)) {
    return null;
  }

  if (isProblemDetailsLike(data)) {
    const parsed = messageFromProblemDetails(data);
    if (parsed) {
      return parsed;
    }
  }

  return messageFromLegacyNestBody(data);
}

export type ClientErrorAlertModel =
  | { kind: 'bulletList'; detail: string; items: string[] }
  | { kind: 'plain'; text: string };

/**
 * Maps an API/client error to content for {@link ClientErrorAlert}.
 * For RFC 9457 bodies with field errors, returns a bullet list (`detail` + `errors[*].messages[0]`).
 */
export function getClientErrorAlertModel(
  error: unknown,
  defaultMessage: string
): ClientErrorAlertModel {
  if (error instanceof AxiosError && error.response?.data !== undefined) {
    const data = error.response.data;
    if (isRecord(data) && isProblemDetailsLike(data)) {
      const { detail, firstMessages } =
        extractProblemDetailAndFirstMessages(data);
      if (firstMessages.length > 0) {
        return { kind: 'bulletList', detail, items: firstMessages };
      }
      if (detail) {
        return { kind: 'plain', text: detail };
      }
    }
    const flat = messageFromAxiosResponseData(error.response.data);
    if (flat) {
      return { kind: 'plain', text: flat };
    }
  }
  if (error instanceof Error) {
    return { kind: 'plain', text: error.message };
  }
  if (typeof error === 'string' && error.trim()) {
    return { kind: 'plain', text: error.trim() };
  }
  return { kind: 'plain', text: defaultMessage };
}

export function getErrorMessageOr(error: unknown, defaultMessage: string) {
  if (error instanceof AxiosError && error.response?.data !== undefined) {
    const fromBody = messageFromAxiosResponseData(error.response.data);
    if (fromBody) {
      return fromBody;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
}

export function getErrorMessageOrDefault(error: unknown) {
  return getErrorMessageOr(error, 'An unknown error occurred.');
}
