import {
  Inject,
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  UnsupportedMediaTypeException,
  Logger,
} from '@nestjs/common';
import { Content, ContentType } from '../entities/content.entity';
import { ContentRepository } from '../repositories/content-repository.service';
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
    return this.contentRepository.findByParentIdAndOwnerId(parentId, ownerId);
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

  async create(name: string, parentId: string, ownerId: string): Promise<Content> {
    const parent = await this.contentRepository.findById(parentId);

    if (!parent) {
      throw new Error(`Parent with ID ${parentId} not found`);
    }

    if (parent.ownerId !== ownerId) {
      throw new ForbiddenException('User is not the owner of the parent folder');
    }

    const nameCollision = await this.contentRepository.findFirstByParentIdAndName(parentId, name);
    if (nameCollision) {
      throw new ConflictException(`Content with name "${name}" already exists in this location`);
    }

    const now = new Date();
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

    if (!existing.size || !existing.bodyUri) {
      throw new NotFoundException('Content has no stored body yet');
    }

    const { signedUrl, expiresAt } = await this.contentBodyReadService.getSignedReadUrl(
      existing.bodyUri
    );

    return { signedUrl, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Uploads raw bytes for a content body and updates Firestore metadata (`bodyUri`, `size`, `bodyMimeType`).
   */
  async putContentBody(
    id: string,
    ownerId: string,
    body: Buffer,
    contentTypeHeader: string | undefined
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

    const mimeType = normalizeBodyMimeType(contentTypeHeader);
    if (isMultipartMediaType(mimeType)) {
      throw new UnsupportedMediaTypeException(
        'Multipart is not supported on this endpoint; send a raw body with a concrete Content-Type (e.g. image/png).'
      );
    }
    if (isMediaTypeTooLong(mimeType)) {
      throw new BadRequestException('Content-Type media type is too long');
    }

    const { bodyUri, size } = await this.contentBodyStorage.uploadBody(ownerId, id, body, mimeType);
    const now = new Date();
    await this.contentRepository.updateContentBodyMetadata(id, bodyUri, size, now, mimeType);

    const updated = await this.contentRepository.findById(id);
    if (!updated) {
      throw new Error(`Content with ID ${id} disappeared after body update`);
    }
    return updated;
  }
}
