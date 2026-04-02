import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * One validation failure in a problem details payload (`errors` extension).
 * Each `path` is a JSON Pointer (RFC 6901).
 */
export class ProblemDetailsErrorItemDto {
  @ApiProperty({
    description: 'JSON Pointer to the invalid value',
    example: '/name',
  })
  path!: string;

  @ApiProperty({
    description: 'Human-readable messages for this pointer',
    type: [String],
    example: ['name contains characters not allowed in regular file names'],
  })
  messages!: string[];
}

/**
 * RFC 9457 Problem Details for HTTP APIs, as returned by {@link ProblemDetailsExceptionFilter}.
 * Response `Content-Type` is `application/problem+json`.
 */
export class ProblemDetailsDto {
  @ApiProperty({
    description: 'URI reference that identifies the problem type',
    example: 'https://httpstatuses.com/422',
  })
  type!: string;

  @ApiProperty({
    description: 'Short, human-readable summary of the problem type',
    example: 'Unprocessable Entity',
  })
  title!: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 422,
  })
  status!: number;

  @ApiProperty({
    description: 'Human-readable explanation specific to this occurrence',
    example: 'Validation failed',
  })
  detail!: string;

  @ApiProperty({
    description: 'URI reference identifying this specific occurrence',
    example: '/api/content/clq0e8k1j0000c8v9a1b2c3d4',
  })
  instance!: string;

  @ApiPropertyOptional({
    type: ProblemDetailsErrorItemDto,
    isArray: true,
    description: 'Per-field validation failures (extension member)',
  })
  errors?: ProblemDetailsErrorItemDto[];
}

/** JSON body shape produced by {@link ProblemDetailsExceptionFilter}. */
export type ProblemDetailsBody = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: Array<{ path: string; messages: string[] }>;
};

/** Use with `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, etc. */
export const apiProblemDetailsSchema = { type: ProblemDetailsDto } as const;
