import {
  Injectable,
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { ContentType } from '../entities/content.entity';
import { Attachment } from '../entities/attachment.entity';
import { AttachmentRepository } from '../repositories/attachment-repository.service';
import { ContentRepository } from '../repositories/content-repository.service';
import { ContentBodyStorageService } from './content-body-storage.service';
import { CONTENT_BODY_MAX_BYTES } from '../constants/content-body-limits';
import {
  isMediaTypeTooLong,
  isMultipartMediaType,
  normalizeBodyMimeType,
} from '../utils/body-mime-type';
import { parseReferencedAttachmentIds } from '../utils/parse-attachment-urls-from-markdown';

import type { Readable } from 'stream';

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);

  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly contentRepository: ContentRepository,
    private readonly contentBodyStorage: ContentBodyStorageService
  ) {}

  async createAttachment(noteId: string, ownerId: string): Promise<Attachment> {
    await this.assertNoteOwnedByUser(noteId, ownerId);

    const now = new Date();
    const id = randomUUID();
    const objectPath = this.contentBodyStorage.attachmentObjectPath(ownerId, noteId, id);

    return this.attachmentRepository.createMetadata({
      id,
      noteId,
      ownerId,
      objectPath,
      createdAt: now,
    });
  }

  async putAttachmentBody(
    noteId: string,
    attachmentId: string,
    ownerId: string,
    body: Buffer,
    contentTypeHeader: string | undefined
  ): Promise<Attachment> {
    await this.assertNoteOwnedByUser(noteId, ownerId);

    const existing = await this.attachmentRepository.findById(noteId, attachmentId);
    if (!existing || existing.ownerId !== ownerId) {
      throw new NotFoundException(`Attachment with ID ${attachmentId} not found`);
    }

    if (body.length > CONTENT_BODY_MAX_BYTES) {
      throw new PayloadTooLargeException(
        `Attachment body exceeds the maximum size of ${CONTENT_BODY_MAX_BYTES} bytes`
      );
    }

    const mimeType = normalizeBodyMimeType(contentTypeHeader);
    if (isMultipartMediaType(mimeType)) {
      throw new UnsupportedMediaTypeException(
        'Multipart is not supported on this endpoint; send a raw body with a concrete Content-Type (e.g. image/png).'
      );
    }
    if (isMediaTypeTooLong(mimeType)) {
      throw new BadRequestException('Content-Type media type is too long');
    }

    const { objectPath, size } = await this.contentBodyStorage.uploadAttachmentBody(
      ownerId,
      noteId,
      attachmentId,
      body,
      mimeType
    );
    const now = new Date();
    await this.attachmentRepository.updateBodyMetadata(
      noteId,
      attachmentId,
      objectPath,
      size,
      mimeType,
      now
    );

    const updated = await this.attachmentRepository.findById(noteId, attachmentId);
    if (!updated) {
      throw new Error(`Attachment ${attachmentId} disappeared after body update`);
    }
    return updated;
  }

  async getAttachmentBodyStream(
    noteId: string,
    attachmentId: string,
    ownerId: string
  ): Promise<{ stream: Readable; contentType: string }> {
    await this.assertNoteOwnedByUser(noteId, ownerId);

    const existing = await this.attachmentRepository.findById(noteId, attachmentId);
    if (!existing || existing.ownerId !== ownerId) {
      throw new NotFoundException(`Attachment with ID ${attachmentId} not found`);
    }

    if (existing.size === 0) {
      throw new NotFoundException('Attachment has no stored body yet');
    }

    const opened = await this.contentBodyStorage.openBodyReadStream(existing.uri);
    if (!opened) {
      throw new NotFoundException('Attachment body object not found in storage');
    }

    return {
      stream: opened.stream,
      contentType: existing.mimeType || opened.contentType,
    };
  }

  async deleteAttachment(noteId: string, attachmentId: string, ownerId: string): Promise<void> {
    await this.assertNoteOwnedByUser(noteId, ownerId);

    const existing = await this.attachmentRepository.findById(noteId, attachmentId);
    if (!existing || existing.ownerId !== ownerId) {
      throw new NotFoundException(`Attachment with ID ${attachmentId} not found`);
    }

    await this.contentBodyStorage.deleteObject(existing.uri);
    await this.attachmentRepository.deleteById(noteId, attachmentId);
  }

  /**
   * Deletes attachment subcollection docs (and GCS objects) under `noteId` that are not
   * referenced in the saved markdown. Idempotent on retry.
   */
  async reconcileAttachmentsFromMarkdown(
    noteId: string,
    ownerId: string,
    markdown: string
  ): Promise<void> {
    const referenced = parseReferencedAttachmentIds(markdown, noteId);
    const existing = await this.attachmentRepository.listByNoteId(noteId);

    for (const attachment of existing) {
      if (attachment.ownerId !== ownerId) {
        continue;
      }
      if (referenced.has(attachment.id)) {
        continue;
      }
      this.logger.debug(`Reconcile: deleting unreferenced attachment ${attachment.id}`);
      await this.contentBodyStorage.deleteObject(attachment.uri);
      await this.attachmentRepository.deleteById(noteId, attachment.id);
    }
  }

  private async assertNoteOwnedByUser(noteId: string, ownerId: string): Promise<void> {
    const note = await this.contentRepository.findById(noteId);
    if (!note || note.ownerId !== ownerId) {
      throw new NotFoundException(`Content with ID ${noteId} not found`);
    }
    if (note.type !== ContentType.NOTE) {
      throw new BadRequestException('Attachments can only be created under a note');
    }
  }
}
