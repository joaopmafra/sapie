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
    description: 'Unique identifier for the content item',
    example: 'clq0e8k1j0000c8v9a1b2c3d4',
  })
  id: string;

  @ApiProperty({
    description: 'Display name of the content item',
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
    description: 'URL to the actual content file (only for files)',
    example: 'https://storage.googleapis.com/...',
    required: false,
    nullable: true,
  })
  contentUrl?: string | null;

  @ApiProperty({
    description: 'Size of the content in bytes (only for files)',
    example: 1024,
    required: false,
    nullable: true,
  })
  size?: number | null;

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
