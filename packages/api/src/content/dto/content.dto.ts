import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, ValidateIf } from 'class-validator';
import { Content, ContentType } from '../entities/content.entity';
import {
  CONTENT_NAME_MAX_LENGTH,
  CONTENT_NAME_MIN_LENGTH,
} from '../validation/content-name.validation';
import { IsContentNameSafeForFileName } from '../validation/content-name.validator';

/**
 * HTTP response body: content (metadata) returned by the API.
 * Intentionally not `implements Content` so the wire shape can diverge from the domain entity.
 */
export class ContentResponse {
  @ApiProperty({
    description: 'Unique identifier for the content (metadata)',
    example: 'clq0e8k1j0000c8v9a1b2c3d4',
  })
  id: string;

  @ApiProperty({
    description: 'Display name of the content',
    example: 'My Document',
  })
  name: string;

  @ApiProperty({
    description: 'Type of content',
    enum: ContentType,
    example: ContentType.NOTE,
  })
  type: ContentType;

  @ApiProperty({
    type: String,
    description: 'ID of the parent directory, null for root directory',
    example: 'clq0e8k1j0000c8v9a1b2c3d4',
    nullable: true,
  })
  parentId: string | null;

  @ApiProperty({
    description: 'ID of the user who owns this content',
    example: 'firebase-user-id',
  })
  ownerId: string;

  @ApiPropertyOptional({
    description:
      '**Notes only.** Object path of the content body in the default storage bucket (`ownerId/content/contentId`), ' +
      'without a `gs://` or `https://` prefix — portable across providers. Omitted for directories. Null until the first body save.',
    example: 'firebase-user-id/content/clq0e8k1j0000c8v9a1b2c3d4',
    nullable: true,
  })
  bodyUri?: string | null;

  @ApiPropertyOptional({
    description:
      '**Notes only.** Byte size of the content body after the last `PUT …/body`. Omitted for directories. Null before the first body save.',
    example: 1024,
    nullable: true,
  })
  size?: number | null;

  @ApiPropertyOptional({
    description:
      '**Notes only.** IANA media type of the content body from the last `PUT …/body` (e.g. `text/plain`, `image/png`). ' +
      'Omitted for directories. Null until the first body save.',
    example: 'text/plain',
    nullable: true,
  })
  bodyMimeType?: string | null;

  @ApiProperty({
    description: 'Timestamp when the content was created',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the content was last updated',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;
}

/**
 * Map persisted content to the HTTP metadata shape.
 * Directories omit `bodyUri`, `size`, and `bodyMimeType` (not serialized).
 */
export function toContentResponse(content: Content): ContentResponse {
  const response = new ContentResponse();
  response.id = content.id;
  response.name = content.name;
  response.type = content.type;
  response.parentId = content.parentId;
  response.ownerId = content.ownerId;
  response.createdAt = content.createdAt;
  response.updatedAt = content.updatedAt;
  if (content.type === ContentType.NOTE) {
    response.bodyUri = content.bodyUri ?? null;
    response.size = content.size ?? null;
    response.bodyMimeType = content.bodyMimeType ?? null;
  }
  return response;
}

/** HTTP command body: create note (metadata) via `POST /api/content`. */
export class CreateContentRequest {
  @ApiProperty({
    description:
      `Display name (${CONTENT_NAME_MIN_LENGTH}–${CONTENT_NAME_MAX_LENGTH} chars). ` +
      'Spaces allowed. Cannot contain \\ / : * ? " < > | or control characters.',
    example: 'My New Note',
    minLength: CONTENT_NAME_MIN_LENGTH,
    maxLength: CONTENT_NAME_MAX_LENGTH,
  })
  @IsString()
  @Length(CONTENT_NAME_MIN_LENGTH, CONTENT_NAME_MAX_LENGTH)
  @IsContentNameSafeForFileName()
  name: string;

  @ApiProperty({
    description: 'ID of the parent directory',
    example: 'clq0e8k1j0000c8v9a1b2c3d4',
  })
  @IsString()
  parentId: string;
}

/** HTTP response body: signed read URL for a content body. */
export class ContentBodyUrlResponse {
  @ApiProperty({
    description: 'Short-lived HTTPS URL to download the content body object from Cloud Storage',
    example: 'https://storage.googleapis.com/...',
  })
  signedUrl: string;

  @ApiProperty({
    description: 'ISO-8601 instant when signedUrl expires',
    example: '2026-04-10T15:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  expiresAt: string;
}

/**
 * PATCH payload for `/api/content/:id`.
 *
 * Body storage fields (`bodyUri`, `size`, `bodyMimeType`) are updated only via `PUT …/body`, not here.
 */
export class UpdateContentRequest {
  @ApiPropertyOptional({
    type: String,
    description:
      `New display name (${CONTENT_NAME_MIN_LENGTH}–${CONTENT_NAME_MAX_LENGTH} chars). ` +
      'Spaces allowed. Cannot contain \\ / : * ? " < > | or control characters. ' +
      'Omit the property when only changing other fields (e.g. future `parentId` moves); do not send `null`.',
    example: 'Renamed Item',
    minLength: CONTENT_NAME_MIN_LENGTH,
    maxLength: CONTENT_NAME_MAX_LENGTH,
  })
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @Length(CONTENT_NAME_MIN_LENGTH, CONTENT_NAME_MAX_LENGTH)
  @IsContentNameSafeForFileName()
  name?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'Target parent folder id after a move/reparent. **Not implemented yet** — the API returns `400 Bad Request` ' +
      'if this property is present (including `null`).',
    example: 'clq0e8k1j0000c8v9a1b2c3d4',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  parentId?: string | null;
}
