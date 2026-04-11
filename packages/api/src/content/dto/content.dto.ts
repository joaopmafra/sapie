import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { Content, ContentType } from '../entities/content.entity';
import {
  CONTENT_NAME_MAX_LENGTH,
  CONTENT_NAME_MIN_LENGTH,
} from '../validation/content-name.validation';
import { IsContentNameSafeForFileName } from '../validation/content-name.validator';

export class ContentDto implements Content {
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

  @ApiProperty({
    description:
      'Object path of the content body in the default storage bucket (`ownerId/content/contentId`), ' +
      'without a `gs://` or `https://` prefix — portable across providers. Null until the first body save.',
    example: 'firebase-user-id/content/clq0e8k1j0000c8v9a1b2c3d4',
    required: false,
    nullable: true,
  })
  bodyUri?: string | null;

  @ApiProperty({
    description:
      'Byte size of the content body after the last `PUT …/body`; null for directories or before the first body save.',
    example: 1024,
    required: false,
    nullable: true,
  })
  size?: number | null;

  @ApiProperty({
    description:
      'IANA media type of the content body from the last `PUT …/body` (e.g. `text/plain`, `image/png`). ' +
      'Null until the first body save.',
    example: 'text/plain',
    required: false,
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

export class CreateContentDto {
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

export class ContentBodySignedUrlDto {
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

export class UpdateContentNameDto {
  @ApiProperty({
    description:
      `New display name (${CONTENT_NAME_MIN_LENGTH}–${CONTENT_NAME_MAX_LENGTH} chars). ` +
      'Spaces allowed. Cannot contain \\ / : * ? " < > | or control characters.',
    example: 'Renamed Item',
    minLength: CONTENT_NAME_MIN_LENGTH,
    maxLength: CONTENT_NAME_MAX_LENGTH,
  })
  @IsString()
  @Length(CONTENT_NAME_MIN_LENGTH, CONTENT_NAME_MAX_LENGTH)
  @IsContentNameSafeForFileName()
  name: string;
}
