import { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import type { ProblemDetailsDto } from './api-client';
import {
  collectProblemValidationMessages,
  getClientErrorAlertModel,
  isProblemDetailsDto,
} from './error-messages-utils.ts';
import { PROBLEM_DETAILS_POINTERS } from './problemDetailsPointers.ts';

const NAME_POINTER = PROBLEM_DETAILS_POINTERS.CONTENT.name;

function axiosErrorWithResponseData(data: unknown): AxiosError {
  const err = new AxiosError('Request failed');
  err.response = {
    data,
    status: 422,
    statusText: 'Unprocessable Entity',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
  return err;
}

describe('isProblemDetailsDto', () => {
  it('accepts a full problem+json-shaped object', () => {
    const body: ProblemDetailsDto = {
      type: 'https://httpstatuses.com/422',
      title: 'Unprocessable Entity',
      status: 422,
      detail: 'Validation failed',
      instance: '/api/content/x',
    };
    expect(isProblemDetailsDto(body)).toBe(true);
  });

  it('rejects when required members are missing', () => {
    expect(isProblemDetailsDto({ detail: 'x' })).toBe(false);
  });

  it('allows optional instance', () => {
    expect(
      isProblemDetailsDto({
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Bad',
      })
    ).toBe(true);
  });
});

describe('collectProblemValidationMessages', () => {
  const base: ProblemDetailsDto = {
    type: 'https://httpstatuses.com/422',
    title: 'Unprocessable Entity',
    status: 422,
    detail: 'Validation failed',
    instance: '/api/x',
    errors: [
      {
        path: '/name',
        messages: ['first constraint', 'second constraint'],
      },
      { path: '/other', messages: ['other field'] },
    ],
  };

  it('returns all messages for a JSON Pointer when set', () => {
    expect(collectProblemValidationMessages(base, NAME_POINTER)).toEqual([
      'first constraint',
      'second constraint',
    ]);
  });

  it('returns all messages from all pointers when pointer omitted', () => {
    expect(collectProblemValidationMessages(base)).toEqual([
      'first constraint',
      'second constraint',
      'other field',
    ]);
  });
});

describe('getClientErrorAlertModel', () => {
  const problem: ProblemDetailsDto = {
    type: 'https://httpstatuses.com/422',
    title: 'Unprocessable Entity',
    status: 422,
    detail: 'Validation failed',
    instance: '/api/x',
    errors: [
      {
        path: '/name',
        messages: ['only one'],
      },
    ],
  };

  it('with field pointer: one message is plain text (no detail heading)', () => {
    const err = axiosErrorWithResponseData(problem);
    expect(
      getClientErrorAlertModel(err, 'default', {
        problemDetailJsonPointer: NAME_POINTER,
      })
    ).toEqual({ kind: 'plain', text: 'only one' });
  });

  it('with field pointer: multiple messages are bullets without detail', () => {
    const multi: ProblemDetailsDto = {
      ...problem,
      errors: [
        {
          path: '/name',
          messages: ['a', 'b'],
        },
      ],
    };
    const err = axiosErrorWithResponseData(multi);
    expect(
      getClientErrorAlertModel(err, 'default', {
        problemDetailJsonPointer: NAME_POINTER,
      })
    ).toEqual({ kind: 'bulletList', items: ['a', 'b'] });
  });

  it('without field pointer: includes detail above bullets', () => {
    const err = axiosErrorWithResponseData(problem);
    expect(getClientErrorAlertModel(err, 'default')).toEqual({
      kind: 'bulletList',
      detail: 'Validation failed',
      items: ['only one'],
    });
  });
});
