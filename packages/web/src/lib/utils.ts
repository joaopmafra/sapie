// TODO: rename this file to something like 'error-message-utils'

import { AxiosError } from 'axios';

import type { ProblemDetailsDto } from './api-client';

export type {
  ProblemDetailsDto,
  ProblemDetailsErrorItemDto,
} from './api-client';

/**
 * JSON Pointer for the note/content `name` field in create/rename bodies (matches API flattening).
 *
 * TODO: do we really need a constant for this? And in this file?
 *
 * @see packages/api/src/common/validation/flatten-validation-errors.ts
 */
export const PROBLEM_DETAILS_JSON_POINTER_NAME = '/name' as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * True when `data` matches the API's RFC 9457 JSON shape ({@link ProblemDetailsDto}).
 */
export function isProblemDetailsDto(data: unknown): data is ProblemDetailsDto {
  if (!isRecord(data)) {
    return false;
  }
  return (
    typeof data.type === 'string' &&
    typeof data.title === 'string' &&
    typeof data.status === 'number' &&
    typeof data.detail === 'string' &&
    (data.instance === undefined || typeof data.instance === 'string')
  );
}

/**
 * Collects validation messages from `ProblemDetailsDto.errors`, in API order.
 *
 * @param data
 * @param jsonPointer - If set (RFC 6901, e.g. `/name`), only entries with that `path` are included;
 *   every string in each matching `messages` array is kept. If omitted, all errors and all messages are included.
 */
export function collectProblemValidationMessages(
  data: ProblemDetailsDto,
  jsonPointer?: string
): string[] {
  const errors = data.errors;
  const out: string[] = [];
  if (!Array.isArray(errors)) {
    return out;
  }
  for (const entry of errors) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    if (jsonPointer !== undefined && entry.path !== jsonPointer) {
      continue;
    }
    const messages = entry.messages;
    if (!Array.isArray(messages)) {
      continue;
    }
    for (const m of messages) {
      if (typeof m === 'string' && m.trim()) {
        out.push(m.trim());
      }
    }
  }
  return out;
}

/**
 * Builds a single-line string from RFC 9457 `detail` and all validation messages
 * (for logs or non-field-specific fallbacks).
 */
function messageFromProblemDetails(data: ProblemDetailsDto): string {
  const detail = data.detail.trim();
  const messages = collectProblemValidationMessages(data);
  if (messages.length === 0) {
    return detail;
  }
  const specifics = messages.join('; ');
  if (messages.length === 1 && specifics === detail) {
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

  if (isProblemDetailsDto(data)) {
    const parsed = messageFromProblemDetails(data);
    if (parsed) {
      return parsed;
    }
  }

  return messageFromLegacyNestBody(data);
}

// TODO: simplify this
export type ClientErrorAlertModel =
  | { kind: 'plain'; text: string }
  | {
      kind: 'bulletList';
      items: string[];
      /** When set, shown as a heading above the list (e.g. full-form summary). Omitted for per-field alerts. */
      detail?: string;
    };

export type GetClientErrorAlertModelOptions = {
  /**
   * When set, only messages for this JSON Pointer are shown (per-field errors under one input).
   * When omitted, every message from every `errors` entry is shown (all errors at top of form).
   */
  problemDetailJsonPointer?: string;
};

/**
 * Maps an API/client error to content for {@link ClientErrorAlert}.
 * With `problemDetailJsonPointer`, a single message is plain text; multiple messages are a list without the problem `detail` heading.
 * Without a pointer, `detail` is shown above the full list (summary at top of form).
 */
export function getClientErrorAlertModel(
  error: unknown,
  defaultMessage: string,
  options?: GetClientErrorAlertModelOptions
): ClientErrorAlertModel {
  if (error instanceof AxiosError && error.response?.data !== undefined) {
    const data = error.response.data;
    if (isProblemDetailsDto(data)) {
      const detail = data.detail.trim();
      const items = collectProblemValidationMessages(
        data,
        options?.problemDetailJsonPointer
      );
      if (items.length > 0) {
        if (options?.problemDetailJsonPointer !== undefined) {
          if (items.length === 1) {
            return { kind: 'plain', text: items[0] };
          }
          return { kind: 'bulletList', items };
        }
        return { kind: 'bulletList', detail, items };
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
