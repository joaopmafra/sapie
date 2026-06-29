import {
  Inject,
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
  Logger,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { Content, ContentType } from '../entities/content.entity';
import { ContentRepository } from '../repositories/content-repository.service';
import { CONTENT_BODY_MAX_BYTES } from '../constants/content-body-limits';
import {
  isMediaTypeTooLong,
  isMultipartMediaType,
  normalizeBodyMimeType,
} from '../utils/body-mime-type';
import {
  CONTENT_BODY_READ_SERVICE,
  type ContentBodyReadService,
} from './content-body-read.service';
import { ContentBodyStorageService } from './content-body-storage.service';

import type { Readable } from 'stream';

const BLOB_ID_LENGTH = 12;

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly contentBodyStorage: ContentBodyStorageService,
    @Inject(CONTENT_BODY_READ_SERVICE)
    private readonly contentBodyReadService: ContentBodyReadService
  ) {}

  async findByParentIdAndOwnerId(parentId: string, ownerId: string): Promise<Content[]> {
    const children = await this.contentRepository.findByParentIdAndOwnerId(parentId, ownerId);
    return children.filter(
      child => child.type === ContentType.DIRECTORY || child.type === ContentType.NOTE
    );
  }

  /**
   * Returns a single content (metadata) if it exists and is owned by the user.
   * Same 404 semantics as rename: missing id or wrong owner yields NotFound (no id leakage).
   */
  async findByIdAndOwnerId(id: string, ownerId: string): Promise<Content> {
    const existing = await this.contentRepository.findById(id);

    if (!existing || existing.ownerId !== ownerId) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    return existing;
  }

  async create(
    name: string,
    parentId: string,
    ownerId: string,
    contentType: ContentType = ContentType.NOTE
  ): Promise<Content> {
    const parent = await this.contentRepository.findById(parentId);

    if (!parent) {
      throw new Error(`Parent with ID ${parentId} not found`);
    }

    if (parent.ownerId !== ownerId) {
      throw new ForbiddenException('User is not the owner of the parent folder');
    }

    if (contentType === ContentType.DIRECTORY && parent.type !== ContentType.DIRECTORY) {
      throw new BadRequestException('A folder can only be created inside another folder');
    }

    if (contentType === ContentType.NOTE && parent.type !== ContentType.DIRECTORY) {
      throw new BadRequestException('A note can only be created inside a folder');
    }

    const nameCollision = await this.contentRepository.findFirstByParentIdAndName(parentId, name);
    if (nameCollision) {
      throw new ConflictException(`Content with name "${name}" already exists in this location`);
    }

    const now = new Date();
    if (contentType === ContentType.DIRECTORY) {
      return this.contentRepository.addDirectory({
        name,
        parentId,
        ownerId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return this.contentRepository.addNote({
      name,
      parentId,
      ownerId,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * TODO: Currently we are allowing root directories renaming. Maybe this operation should not be allowed?
   */
  async patchContent(id: string, name: string, ownerId: string): Promise<Content> {
    const existing = await this.contentRepository.findById(id);

    if (!existing || existing.ownerId !== ownerId) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (existing.name === name) {
      return existing;
    }

    const nameCollision = await this.contentRepository.findFirstByParentIdAndName(
      existing.parentId,
      name
    );
    if (nameCollision && nameCollision.id !== id) {
      throw new ConflictException(`Content with name "${name}" already exists in this location`);
    }

    const now = new Date();
    await this.contentRepository.updateContentName(id, name, now);

    const updated = await this.contentRepository.findById(id);
    if (!updated) {
      throw new Error(`Content with ID ${id} disappeared after update`);
    }
    return updated;
  }

  /**
   * Returns a signed read URL for the stored content body. Wrong owner yields 403; missing item 404;
   * directory or empty body yields 4xx as specified for the HTTP API.
   */
  async getContentBodySignedUrl(
    id: string,
    ownerId: string
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const existing = await this.contentRepository.findById(id);
    this.logger.debug(`getContentBodySignedUrl; existing: ${JSON.stringify(existing)}`);

    if (!existing) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (existing.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }

    if (existing.type === ContentType.DIRECTORY) {
      throw new BadRequestException('Body storage is not applicable for directories');
    }

    if (!existing.body?.uri || existing.body.size == null) {
      throw new NotFoundException('Content has no stored body yet');
    }

    const { signedUrl, expiresAt } = await this.contentBodyReadService.getSignedReadUrl(
      existing.body.uri
    );

    return { signedUrl, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Streams stored body bytes for authenticated read (`GET …/body`).
   */
  async getContentBodyStream(
    id: string,
    ownerId: string
  ): Promise<{ stream: Readable; contentType: string }> {
    const existing = await this.contentRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (existing.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }

    if (existing.type === ContentType.DIRECTORY) {
      throw new BadRequestException('Body storage is not applicable for directories');
    }

    if (!existing.body?.uri || existing.body.size == null) {
      throw new NotFoundException('Content has no stored body yet');
    }

    const opened = await this.contentBodyStorage.openBodyReadStream(existing.body.uri);
    if (!opened) {
      throw new NotFoundException('Content body object not found in storage');
    }

    return {
      stream: opened.stream,
      contentType: existing.body.mimeType || opened.contentType,
    };
  }

  /**
   * Uploads raw bytes for a content body and updates nested Firestore `body` (incl. `body.updatedAt`) + top-level `updatedAt`.
   */
  async putContentBody(
    id: string,
    ownerId: string,
    body: Buffer,
    contentTypeHeader: string | undefined,
    expectedRevision?: string
  ): Promise<Content> {
    const existing = await this.contentRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (existing.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }

    if (existing.type === ContentType.DIRECTORY) {
      throw new BadRequestException('Body storage is not applicable for directories');
    }

    if (existing.type === ContentType.NOTE) {
      this.assertExpectedRevision(existing, expectedRevision);
    }

    if (body.length > CONTENT_BODY_MAX_BYTES) {
      throw new PayloadTooLargeException(
        `Content body exceeds the maximum size of ${CONTENT_BODY_MAX_BYTES} bytes`
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

    const { objectPath, size } = await this.contentBodyStorage.uploadBody(
      ownerId,
      id,
      body,
      mimeType
    );
    const now = new Date();
    await this.contentRepository.updateContentBodyMetadata(id, objectPath, size, now, mimeType);

    const updated = await this.contentRepository.findById(id);
    if (!updated) {
      throw new Error(`Content with ID ${id} disappeared after body update`);
    }
    return updated;
  }

  private assertExpectedRevision(existing: Content, expectedRevision?: string): void {
    if (expectedRevision === undefined) {
      throw new BadRequestException(
        'Request must include `expectedRevision` query parameter (use empty string when the note has no body yet).'
      );
    }

    const storedRevision = existing.body?.updatedAt.toISOString() ?? '';
    if (expectedRevision !== storedRevision) {
      throw new ConflictException('Note body revision mismatch; reload the note and try again.');
    }
  }

  /**
   * Validates the content is a note owned by the caller, returns it (or throws).
   */
  private async assertNoteOwnedByUser(contentId: string, ownerId: string): Promise<Content> {
    const content = await this.contentRepository.findById(contentId);
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }
    if (content.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }
    if (content.type !== ContentType.NOTE) {
      throw new BadRequestException('Blobs can only be attached to note-type content');
    }
    return content;
  }

  /**
   * Uploads a blob (inline image / attachment) for a note.
   */
  async uploadBlob(
    contentId: string,
    ownerId: string,
    body: Buffer,
    contentTypeHeader: string | undefined
  ): Promise<{ blobId: string; url: string }> {
    await this.assertNoteOwnedByUser(contentId, ownerId);

    if (body.length > CONTENT_BODY_MAX_BYTES) {
      throw new PayloadTooLargeException(
        `Blob body exceeds the maximum size of ${CONTENT_BODY_MAX_BYTES} bytes`
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

    const blobId = nanoid(BLOB_ID_LENGTH);
    await this.contentBodyStorage.uploadBlob(ownerId, contentId, blobId, body, mimeType);

    const url = `/api/content/${contentId}/blobs/${blobId}`;
    return { blobId, url };
  }

  /**
   * Streams a blob from GCS. Validates note ownership first.
   */
  async getBlobStream(
    contentId: string,
    blobId: string,
    ownerId: string
  ): Promise<{ stream: Readable; contentType: string }> {
    await this.assertNoteOwnedByUser(contentId, ownerId);

    const objectPath = this.contentBodyStorage.blobObjectPath(ownerId, contentId, blobId);
    const opened = await this.contentBodyStorage.openBlobReadStream(objectPath);
    if (!opened) {
      throw new NotFoundException(`Blob ${blobId} not found for content ${contentId}`);
    }

    return opened;
  }

  /**
   * Deletes content (note or directory) and cascades blob deletion for notes.
   */
  async deleteContent(contentId: string, ownerId: string): Promise<void> {
    const content = await this.contentRepository.findById(contentId);
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }
    if (content.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }

    // Cascade-delete all blobs for notes first
    if (content.type === ContentType.NOTE) {
      await this.contentBodyStorage.deleteBlobsByPrefix(ownerId, contentId);
    }

    // Delete the content document
    await this.contentRepository.deleteContent(contentId);
  }
}
