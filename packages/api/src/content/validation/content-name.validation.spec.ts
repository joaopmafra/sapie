import { BadRequestException } from '@nestjs/common';
import {
  assertValidContentName,
  CONTENT_NAME_MAX_LENGTH,
  CONTENT_NAME_MIN_LENGTH,
} from './content-name.validation';

describe('assertValidContentName', () => {
  it(`accepts length ${CONTENT_NAME_MIN_LENGTH} and spaces`, () => {
    expect(() => assertValidContentName('a')).not.toThrow();
    expect(() => assertValidContentName('My Note Title')).not.toThrow();
  });

  it(`accepts length ${CONTENT_NAME_MAX_LENGTH}`, () => {
    expect(() => assertValidContentName('x'.repeat(CONTENT_NAME_MAX_LENGTH))).not.toThrow();
  });

  it('rejects non-string', () => {
    expect(() => assertValidContentName(undefined)).toThrow(BadRequestException);
    expect(() => assertValidContentName(null)).toThrow(BadRequestException);
    expect(() => assertValidContentName(1 as unknown as string)).toThrow(BadRequestException);
  });

  it(`rejects length below ${CONTENT_NAME_MIN_LENGTH}`, () => {
    expect(() => assertValidContentName('')).toThrow(BadRequestException);
  });

  it(`rejects length above ${CONTENT_NAME_MAX_LENGTH}`, () => {
    expect(() => assertValidContentName('x'.repeat(CONTENT_NAME_MAX_LENGTH + 1))).toThrow(
      BadRequestException
    );
  });

  it.each(['/', '\\', ':', '*', '?', '"', '<', '>', '|'])(
    'rejects filename-illegal character %s',
    char => {
      expect(() => assertValidContentName(`note${char}x`)).toThrow(BadRequestException);
    }
  );

  it('rejects newline (control character)', () => {
    expect(() => assertValidContentName('a\nb')).toThrow(BadRequestException);
  });
});
