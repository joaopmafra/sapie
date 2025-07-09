import { AxiosError } from 'axios';

export function getErrorMessageOr(error: unknown, defaultMessage: string) {
  let message = defaultMessage;
  if (error instanceof AxiosError && error.response?.data?.message) {
    message = error.response.data.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  return message;
}

export function getErrorMessageOrDefault(error: unknown) {
  return getErrorMessageOr(error, 'An unknown error occurred.');
}
