import { ApiProperty } from '@nestjs/swagger';
import { Attachment } from '../entities/attachment.entity';

export class AttachmentResponse {
  @ApiProperty({
    description: 'Unique attachment id (UUID).',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({ description: 'Parent note id.', example: 'clq0e8k1j0000c8v9a1b2c3d4' })
  noteId: string;

  @ApiProperty({
    description: 'IANA media type from the last successful `PUT …/body`.',
    example: 'image/png',
  })
  mimeType: string;

  @ApiProperty({ description: 'Byte size after the last `PUT …/body`.', example: 4096 })
  size: number;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt: Date;
}

export function toAttachmentResponse(attachment: Attachment): AttachmentResponse {
  const response = new AttachmentResponse();
  response.id = attachment.id;
  response.noteId = attachment.noteId;
  response.mimeType = attachment.mimeType;
  response.size = attachment.size;
  response.createdAt = attachment.createdAt;
  response.updatedAt = attachment.updatedAt;
  return response;
}
