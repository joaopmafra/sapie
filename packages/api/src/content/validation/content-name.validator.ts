import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isContentNameSafeForFileName } from './content-name.validation';

@ValidatorConstraint({ name: 'IsContentNameSafeForFileName', async: false })
export class IsContentNameSafeForFileNameConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isContentNameSafeForFileName(value);
  }

  defaultMessage(): string {
    return 'name contains characters not allowed in regular file names';
  }
}

export function IsContentNameSafeForFileName(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsContentNameSafeForFileNameConstraint,
    });
  };
}
