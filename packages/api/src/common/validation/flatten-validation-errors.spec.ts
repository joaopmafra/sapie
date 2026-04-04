import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './flatten-validation-errors';

describe('flattenValidationErrors', () => {
  it('flattens nested properties to JSON Pointer paths', () => {
    const errors: ValidationError[] = [
      {
        property: 'address',
        children: [
          {
            property: 'street',
            constraints: { isString: 'street must be a string' },
          },
        ],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      { path: '/address/street', messages: ['street must be a string'] },
    ]);
  });

  it('merges multiple constraints on the same path', () => {
    const errors: ValidationError[] = [
      {
        property: 'name',
        constraints: {
          isString: 'name must be a string',
          minLength: 'name is too short',
        },
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      { path: '/name', messages: ['name must be a string', 'name is too short'] },
    ]);
  });

  it('escapes ~ and / in property names per RFC 6901', () => {
    const errors: ValidationError[] = [
      {
        property: 'a~b/c',
        constraints: { x: 'bad' },
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([{ path: '/a~0b~1c', messages: ['bad'] }]);
  });
});
