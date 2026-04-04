import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import type { ProblemDetailsBody } from '../dto/problem-details.dto';

export type { ProblemDetailsBody } from '../dto/problem-details.dto';

function typeUriForStatus(status: number): string {
  return `https://httpstatuses.com/${status}`;
}

const TITLE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

function titleForHttpStatus(status: number): string {
  return TITLE_BY_STATUS[status] ?? 'Error';
}

function normalizeTitle(status: number, nestErrorField?: string): string {
  if (nestErrorField && typeof nestErrorField === 'string') {
    return nestErrorField;
  }
  return titleForHttpStatus(status);
}

function extractDetail(
  raw: string | Record<string, unknown>,
  status: number
): { detail: string; errors?: ProblemDetailsBody['errors'] } {
  if (typeof raw === 'string') {
    return { detail: raw };
  }

  const message = raw.message;
  if (Array.isArray(raw.errors)) {
    const detail =
      typeof message === 'string' && message.length > 0 ? message : 'Request validation failed';
    return {
      detail,
      errors: raw.errors as ProblemDetailsBody['errors'],
    };
  }

  if (typeof message === 'string') {
    return { detail: message };
  }
  if (Array.isArray(message)) {
    const strings = message.filter((m): m is string => typeof m === 'string');
    if (strings.length > 0) {
      return { detail: strings.join('; ') };
    }
  }

  if (typeof raw.error === 'string') {
    return { detail: raw.error };
  }

  return { detail: titleForHttpStatus(status) };
}

function applyRequestInstance(body: ProblemDetailsBody, req: Request): void {
  const url = req.url?.trim();
  if (url) {
    body.instance = url;
  }
}

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const rawResponse = exception.getResponse();
      const rawObject =
        typeof rawResponse === 'object' && rawResponse !== null && !Array.isArray(rawResponse)
          ? (rawResponse as Record<string, unknown>)
          : undefined;

      const nestErrorField =
        rawObject && typeof rawObject.error === 'string' ? rawObject.error : undefined;

      const extractInput: string | Record<string, unknown> =
        typeof rawResponse === 'string' ? rawResponse : (rawObject ?? 'Request failed');

      const { detail, errors } = extractDetail(extractInput, status);

      const body: ProblemDetailsBody = {
        type: typeUriForStatus(status),
        title: normalizeTitle(status, nestErrorField),
        status,
        detail,
      };

      applyRequestInstance(body, req);

      if (errors) {
        body.errors = errors;
      }

      res.status(status).setHeader('Content-Type', 'application/problem+json').json(body);
      return;
    }

    const err = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(err.message, err.stack);

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const body: ProblemDetailsBody = {
      type: typeUriForStatus(status),
      title: titleForHttpStatus(status),
      status,
      detail: 'An unexpected error occurred',
    };

    applyRequestInstance(body, req);

    res.status(status).setHeader('Content-Type', 'application/problem+json').json(body);
  }
}
