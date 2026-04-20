import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, ValidateIf } from 'class-validator';
import { Content, ContentType } from '../entities/content.entity';
import {
  CONTENT_NAME_MAX_LENGTH,
  CONTENT_NAME_MIN_LENGTH,
} from '../validation/content-name.validation';
import { IsContentNameSafeForFileName } from '../validation/content-name.validator';

/**
 * Public HTTP summary of a stored note body (no storage path / internal URI).
 */
export class ContentBodySummaryResponse {
  @ApiProperty({
    description:
      'IANA media type of the stored body from the last successful `PUT …/body` (e.g. `text/plain`, `image/png`).',
    example: 'text/plain',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Byte size of the stored body after the last `PUT …/body`.',
    example: 1024,
  })
  size: number;

  @ApiProperty({
    description: 'When the body object was first written for this note.',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description:
      'When the body bytes last changed. Clients use this (not top-level `updatedAt`) to decide whether to re-download body bytes.',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;
}

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
      '**Notes only.** Public summary of the stored body. Omitted for directories. `null` before the first `PUT …/body`.',
    type: ContentBodySummaryResponse,
    nullable: true,
  })
  body?: ContentBodySummaryResponse | null;

  @ApiProperty({
    description: 'Timestamp when the content was created',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description:
      'Timestamp when content metadata last changed (e.g. rename). Distinct from `body.updatedAt`, which tracks body bytes.',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;
}

/**
 * Map persisted content to the HTTP metadata shape.
 * Directories omit `body`; notes include `body: null` until the first body save.
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
  if (content.type !== ContentType.DIRECTORY) {
    if (content.body) {
      const summary = new ContentBodySummaryResponse();
      summary.mimeType = content.body.mimeType;
      summary.size = content.body.size;
      summary.createdAt = content.body.createdAt;
      summary.updatedAt = content.body.updatedAt;
      response.body = summary;
    } else {
      response.body = null;
    }
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
 * Body storage is updated only via `PUT …/body`, not here.
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
