import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from '../validation/flatten-validation-errors';

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
    exceptionFactory: (errors: ValidationError[]) => {
      const flattened = flattenValidationErrors(errors);
      return new UnprocessableEntityException({
        message: 'Validation failed',
        errors: flattened,
      });
    },
  });
}
