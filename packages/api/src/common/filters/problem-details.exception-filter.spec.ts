import { ArgumentsHost } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import {
  ProblemDetailsBody,
  ProblemDetailsExceptionFilter,
} from './problem-details.exception-filter';

function createMockHost(reqUrl: string): {
  host: ArgumentsHost;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const setHeader = jest.fn().mockReturnValue({ json });
  const status = jest.fn().mockReturnValue({
    setHeader,
  });
  const res = { status } as unknown as Response;
  const req = { url: reqUrl } as Request;

  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => req,
    }),
  } as ArgumentsHost;

  return { host, status, json };
}

function getProblemBodyFromJsonMock(json: jest.Mock): ProblemDetailsBody {
  expect(json).toHaveBeenCalled();
  const calls = json.mock.calls as [[ProblemDetailsBody]];
  const first = calls[0];
  expect(first).toBeDefined();
  return first[0];
}

/** Asserts RFC 9457 core members present and typed (plus optional `errors`, optional `instance`). */
function assertProblemDetailsEnvelope(body: ProblemDetailsBody): void {
  expect(typeof body.type).toBe('string');
  expect(body.type.startsWith('https://')).toBe(true);
  expect(typeof body.title).toBe('string');
  expect(body.title.length).toBeGreaterThan(0);
  expect(typeof body.status).toBe('number');
  expect(typeof body.detail).toBe('string');
  if (body.instance !== undefined) {
    expect(typeof body.instance).toBe('string');
  }
  if (body.errors !== undefined) {
    expect(Array.isArray(body.errors)).toBe(true);
    for (const e of body.errors) {
      expect(typeof e.path).toBe('string');
      expect(Array.isArray(e.messages)).toBe(true);
    }
  }
}

describe('ProblemDetailsExceptionFilter', () => {
  let filter: ProblemDetailsExceptionFilter;

  beforeEach(() => {
    filter = new ProblemDetailsExceptionFilter();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps UnprocessableEntityException with errors to 422 problem+json with full shape', () => {
    const { host, status, json } = createMockHost('/api/content');
    const exception = new UnprocessableEntityException({
      message: 'Validation failed',
      errors: [{ path: '/name', messages: ['name should not be empty'] }],
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(422);
    const chain = status.mock.results[0].value as { setHeader: jest.Mock; json: jest.Mock };
    expect(chain.setHeader).toHaveBeenCalledWith('Content-Type', 'application/problem+json');
    expect(json).toHaveBeenCalledTimes(1);

    const body = getProblemBodyFromJsonMock(json);
    assertProblemDetailsEnvelope(body);
    expect(body).toMatchObject({
      type: 'https://httpstatuses.com/422',
      title: 'Unprocessable Entity',
      status: 422,
      detail: 'Validation failed',
      instance: '/api/content',
      errors: [{ path: '/name', messages: ['name should not be empty'] }],
    });
  });

  it('maps ConflictException to 409 problem+json with full shape', () => {
    const { host, status, json } = createMockHost('/api/content');
    filter.catch(new ConflictException('Name already taken'), host);

    expect(status).toHaveBeenCalledWith(409);
    const chain = status.mock.results[0].value as { setHeader: jest.Mock; json: jest.Mock };
    expect(chain.setHeader).toHaveBeenCalledWith('Content-Type', 'application/problem+json');

    const body = getProblemBodyFromJsonMock(json);
    assertProblemDetailsEnvelope(body);
    expect(body).toMatchObject({
      type: 'https://httpstatuses.com/409',
      title: 'Conflict',
      status: 409,
      detail: 'Name already taken',
      instance: '/api/content',
    });
    expect(body.errors).toBeUndefined();
  });

  it('maps NotFoundException to 404 problem+json with full shape', () => {
    const { host, status, json } = createMockHost('/api/content/abc');
    filter.catch(new NotFoundException('Content with ID abc not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    const body = getProblemBodyFromJsonMock(json);
    assertProblemDetailsEnvelope(body);
    expect(body).toMatchObject({
      type: 'https://httpstatuses.com/404',
      title: 'Not Found',
      status: 404,
      detail: 'Content with ID abc not found',
      instance: '/api/content/abc',
    });
  });

  it('maps BadRequestException to 400 problem+json with full shape', () => {
    const { host, status, json } = createMockHost('/api/content');
    filter.catch(new BadRequestException('property foo should not exist'), host);

    expect(status).toHaveBeenCalledWith(400);
    const body = getProblemBodyFromJsonMock(json);
    assertProblemDetailsEnvelope(body);
    expect(body).toMatchObject({
      type: 'https://httpstatuses.com/400',
      title: 'Bad Request',
      status: 400,
      detail: 'property foo should not exist',
      instance: '/api/content',
    });
  });

  it('maps generic HttpException with string response to problem+json', () => {
    const { host, status, json } = createMockHost('/x');
    filter.catch(new HttpException('Custom', 418), host);

    expect(status).toHaveBeenCalledWith(418);
    const body = getProblemBodyFromJsonMock(json);
    assertProblemDetailsEnvelope(body);
    expect(body).toMatchObject({
      type: 'https://httpstatuses.com/418',
      status: 418,
      detail: 'Custom',
      instance: '/x',
    });
  });

  it('omits instance when request URL is missing or blank', () => {
    const json = jest.fn();
    const setHeader = jest.fn().mockReturnValue({ json });
    const status = jest.fn().mockReturnValue({ setHeader });
    const res = { status } as unknown as Response;
    const req = { url: '' } as Request;

    const host = {
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => req,
      }),
    } as ArgumentsHost;

    filter.catch(new ConflictException('x'), host);

    const body = getProblemBodyFromJsonMock(json);
    assertProblemDetailsEnvelope(body);
    expect(body.instance).toBeUndefined();
  });

  it('maps non-Http Error to 500 problem+json with full shape', () => {
    const { host, status, json } = createMockHost('/api/x');
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    const chain = status.mock.results[0].value as { setHeader: jest.Mock; json: jest.Mock };
    expect(chain.setHeader).toHaveBeenCalledWith('Content-Type', 'application/problem+json');

    const body = getProblemBodyFromJsonMock(json);
    assertProblemDetailsEnvelope(body);
    expect(body).toMatchObject({
      type: 'https://httpstatuses.com/500',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
      instance: '/api/x',
    });
  });
});
