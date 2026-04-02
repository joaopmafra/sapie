# NestJS Error Responses

In [NestJS](https://docs.nestjs.com/techniques/validation), when using the built-in `ValidationPipe` with `class-validator`, the default response for a request that fails validation across multiple fields is a `400 Bad Request`.

## Default Validation Error Response

By default, the `message` property contains an array of all validation errors found in the request.

```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

## Customized Validation Error Response

To return a more structured response (e.g., mapping errors directly to field names), you can configure the `exceptionFactory` in your global validation pipe.

**Configuration in `main.ts`:**

```typescript
import { ValidationPipe, BadRequestException } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    exceptionFactory: (errors) => {
      const result = errors.map((error) => ({
        field: error.property,
        errors: Object.values(error.constraints),
      }));
      return new BadRequestException(result);
    },
    stopAtFirstError: false, // Ensure all fields are validated
  }),
);
```

**Resulting Structured Response:**

```json
{
  "statusCode": 400,
  "message": [
    {
      "field": "name",
      "errors": ["name should not be empty"]
    },
    {
      "field": "email",
      "errors": ["email must be an email"]
    }
  ],
  "error": "Bad Request"
}
```

## Key Configuration Options

- **`stopAtFirstError`**: When set to `false` (default), the validator continues checking all fields instead of stopping at the first failure.
- **`exceptionFactory`**: A callback that receives an array of `ValidationError` objects, allowing you to transform the final output.
- **`whitelist`**: If `true`, the validator will strip any properties from the request body that do not have validation decorators.
