import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateContentNameDto } from '../dto/content.dto';
import { CONTENT_NAME_MAX_LENGTH, CONTENT_NAME_MIN_LENGTH } from './content-name.validation';

describe('content name validation (DTO)', () => {
  function validateName(name: unknown): string[] {
    const dto = plainToInstance(UpdateContentNameDto, { name });
    const errors = validateSync(dto);
    const nameErrors = errors.find(e => e.property === 'name');
    return nameErrors ? Object.values(nameErrors.constraints ?? {}) : [];
  }

  it(`accepts length ${CONTENT_NAME_MIN_LENGTH} and spaces`, () => {
    expect(validateName('a')).toEqual([]);
    expect(validateName('My Note Title')).toEqual([]);
  });

  it(`accepts length ${CONTENT_NAME_MAX_LENGTH}`, () => {
    expect(validateName('x'.repeat(CONTENT_NAME_MAX_LENGTH))).toEqual([]);
  });

  it('rejects non-string', () => {
    expect(validateName(undefined)).not.toEqual([]);
    expect(validateName(null)).not.toEqual([]);
    expect(validateName(1)).not.toEqual([]);
  });

  it(`rejects length below ${CONTENT_NAME_MIN_LENGTH}`, () => {
    expect(validateName('')).not.toEqual([]);
  });

  it(`rejects length above ${CONTENT_NAME_MAX_LENGTH}`, () => {
    expect(validateName('x'.repeat(CONTENT_NAME_MAX_LENGTH + 1))).not.toEqual([]);
  });

  it.each(['/', '\\', ':', '*', '?', '"', '<', '>', '|'])(
    'rejects filename-illegal character %s',
    char => {
      expect(validateName(`note${char}x`)).not.toEqual([]);
    }
  );

  it('rejects newline (control character)', () => {
    expect(validateName('a\nb')).not.toEqual([]);
  });
});
