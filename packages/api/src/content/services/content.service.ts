import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Content, ContentType } from '../entities/content.entity';
import { ContentRepository } from '../repositories/content-repository.service';
import { NoteBodyStorageService } from './note-body-storage.service';

@Injectable()
export class ContentService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly noteBodyStorage: NoteBodyStorageService
  ) {}

  async findByParentIdAndOwnerId(parentId: string, ownerId: string): Promise<Content[]> {
    return this.contentRepository.findByParentIdAndOwnerId(parentId, ownerId);
  }

  /**
   * Returns a single content item if it exists and is owned by the user.
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
  async renameContent(id: string, name: string, ownerId: string): Promise<Content> {
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
   * Returns a signed read URL for the note body. Wrong owner yields 403; missing item 404;
   * directory or empty body yields 4xx as specified for the HTTP API.
   */
  async getNoteBodySignedUrl(
    id: string,
    ownerId: string
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const existing = await this.contentRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (existing.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }

    if (existing.type === ContentType.DIRECTORY) {
      throw new BadRequestException('Note body storage is not applicable for directories');
    }

    if (existing.bodyUri == null || existing.bodyUri === '') {
      throw new NotFoundException('Note has no stored body yet');
    }

    const { signedUrl, expiresAt } = await this.noteBodyStorage.getSignedReadUrl(existing.bodyUri);

    return { signedUrl, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Uploads markdown for a note and updates Firestore metadata.
   */
  async putNoteBody(id: string, ownerId: string, markdown: string): Promise<Content> {
    const existing = await this.contentRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (existing.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }

    if (existing.type === ContentType.DIRECTORY) {
      throw new BadRequestException('Note body storage is not applicable for directories');
    }

    const { bodyUri, size } = await this.noteBodyStorage.uploadMarkdown(ownerId, id, markdown);
    const now = new Date();
    await this.contentRepository.updateNoteBodyMetadata(id, bodyUri, size, now);

    const updated = await this.contentRepository.findById(id);
    if (!updated) {
      throw new Error(`Content with ID ${id} disappeared after body update`);
    }
    return updated;
  }
}
