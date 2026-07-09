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
  forwardRef,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { Content, ContentType, Note } from '../entities/content.entity';
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


import { CardService } from '../../cards/services/card.service';

import type { Readable } from 'stream';

const BLOB_ID_LENGTH = 12;

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly contentBodyStorage: ContentBodyStorageService,
    @Inject(CONTENT_BODY_READ_SERVICE)
    private readonly contentBodyReadService: ContentBodyReadService,
    @Inject(forwardRef(() => CardService))
    private readonly cardService: CardService,
  ) {}

  async findByParentIdAndOwnerId(parentId: string, ownerId: string): Promise<Content[]> {
    const children = await this.contentRepository.findByParentIdAndOwnerId(parentId, ownerId);
    return children.filter(
      child =>
        child.type === ContentType.DIRECTORY ||
        child.type === ContentType.NOTE ||
        child.type === ContentType.DECK
    );
  }

  /**
   * Returns a single content (metadata) if it exists, is owned by the user, and is not soft-deleted.
   * Same 404 semantics as rename: missing id, wrong owner, or deleted yields NotFound (no id leakage).
   */
  async findByIdAndOwnerId(id: string, ownerId: string): Promise<Content> {
    const existing = await this.contentRepository.findById(id);

    if (!existing || existing.ownerId !== ownerId || existing.deleted) {
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

    if (parent.deleted) {
      throw new BadRequestException('Cannot create content under a deleted parent');
    }

    if (contentType === ContentType.DIRECTORY && parent.type !== ContentType.DIRECTORY) {
      throw new BadRequestException('A folder can only be created inside another folder');
    }

    if (contentType === ContentType.NOTE && parent.type !== ContentType.DIRECTORY) {
      throw new BadRequestException('A note can only be created inside a folder');
    }

    if (contentType === ContentType.DECK && parent.type !== ContentType.NOTE) {
      throw new BadRequestException('A deck can only be created under a note');
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

    if (contentType === ContentType.DECK) {
      // Denormalize directoryId from the parent note's parent directory
      return this.contentRepository.addDeck({
        name,
        parentId,
        directoryId: parent.parentId!,
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
   * Patches content metadata: rename (`name`) and/or update `tags`.
   * At least one of `name` or `tags` must be provided.
   * Tags are only supported for folder-type content.
   */
  async patchContent(
    id: string,
    ownerId: string,
    name?: string,
    tags?: string[]
  ): Promise<Content> {
    const existing = await this.contentRepository.findById(id);

    if (!existing || existing.ownerId !== ownerId || existing.deleted) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (tags !== undefined && existing.type !== ContentType.DIRECTORY) {
      throw new BadRequestException('Tags are only supported for folder-type content');
    }

    const now = new Date();
    let changed = false;

    // Handle rename
    if (name !== undefined && name !== existing.name) {
      const nameCollision = await this.contentRepository.findFirstByParentIdAndName(
        existing.parentId,
        name
      );
      if (nameCollision && nameCollision.id !== id) {
        throw new ConflictException(`Content with name "${name}" already exists in this location`);
      }
      await this.contentRepository.updateContentName(id, name, now);
      changed = true;
    }

    // Handle tags update
    if (tags !== undefined) {
      await this.contentRepository.updateContentTags(id, tags, now);
      changed = true;
    }

    if (!changed) {
      return existing;
    }

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

    if (!existing || existing.deleted) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (existing.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }

    if (existing.type === ContentType.DIRECTORY || existing.type === ContentType.DECK) {
      throw new BadRequestException('Body storage is not applicable for directories or decks');
    }

    // Narrowed to Note after the guard above
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

    if (!existing || existing.deleted) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (existing.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }

    if (existing.type === ContentType.DIRECTORY || existing.type === ContentType.DECK) {
      throw new BadRequestException('Body storage is not applicable for directories or decks');
    }

    // Narrowed to Note after the guard above
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

    if (!existing || existing.deleted) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (existing.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }

    if (existing.type === ContentType.DIRECTORY || existing.type === ContentType.DECK) {
      throw new BadRequestException('Body storage is not applicable for directories or decks');
    }

    if (existing.type === 'note') {
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

  private assertExpectedRevision(existing: Note, expectedRevision?: string): void {
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
   * Validates the content is a non-deleted note owned by the caller, returns it (or throws).
   */
  private async assertNoteOwnedByUser(contentId: string, ownerId: string): Promise<Note> {
    const content = await this.contentRepository.findById(contentId);
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }
    if (content.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }
    if (content.deleted) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }
    if (content.type !== 'note') {
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
   * Soft-deletes content (note or directory).
   *
   * - Notes: blocked (409) if content children exist unless `cascade` is true.
   *   Cloud Storage blobs are NOT deleted (deferred to versioning story).
   * - Directories: recursively soft-deletes all non-deleted descendants, then the folder itself.
   */

  /**
   * Returns content roots (folders tagged "content-root") for the current user
   * with due card counts computed server-side.
   */
  async getRoots(ownerId: string): Promise<{ id: string; name: string; dueCardCount: number }[]> {
    const roots = await this.contentRepository.findRootsByOwnerId(ownerId);

    const results: { id: string; name: string; dueCardCount: number }[] = [];
    for (const root of roots) {
      // Collect all descendant folder IDs + the root itself
      const descendantIds = await this.contentRepository.findAllDescendantIds(root.id, ownerId);
      const directoryIds = [root.id, ...descendantIds];

      // Find all non-deleted decks under those folders
      const decks = await this.contentRepository.findDecksByDirectoryIds(directoryIds, ownerId);

      // Count due cards for each deck
      let dueCardCount = 0;
      for (const deck of decks) {
        const count = await this.cardService.countDueCards(deck.id, ownerId);
        dueCardCount += count;
      }

      results.push({ id: root.id, name: root.name, dueCardCount });
    }

    return results;
  }
  async deleteContent(contentId: string, ownerId: string, cascade = false): Promise<void> {
    const content = await this.contentRepository.findById(contentId);
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }
    if (content.ownerId !== ownerId) {
      throw new ForbiddenException('User does not own this content');
    }
    if (content.deleted) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }

    const now = new Date();

    if (content.type === ContentType.NOTE) {
      const childCount = await this.contentRepository.findContentChildrenCount(contentId);
      if (childCount > 0 && !cascade) {
        throw new ConflictException(
          `Note has ${childCount} content child(ren) (e.g. flashcard decks). Use ?cascade=true to delete anyway.`
        );
      }

      // Soft-delete content children (e.g. flashcard decks) if cascading
      if (cascade && childCount > 0) {
        const childIds = await this.contentRepository.findAllDescendantIds(contentId, ownerId);
        const childDeletePromises = childIds.map(id =>
          this.contentRepository.softDeleteContent(id, now, ownerId)
        );
        await Promise.all(childDeletePromises);
      }

      // Soft-delete the note itself (blobs are NOT deleted per versioning plan)
      await this.contentRepository.softDeleteContent(contentId, now, ownerId);
    } else if (content.type === ContentType.DECK) {
      // Cascade-delete all cards in the deck subcollection
      await this.cardService.deleteCardsForDeck(contentId);

      // Soft-delete the deck itself
      await this.contentRepository.softDeleteContent(contentId, now, ownerId);
    } else {
      // Directory: fetch all descendants and soft-delete them, then the folder
      const descendantIds = await this.contentRepository.findAllDescendantIds(contentId, ownerId);
      const deletePromises = descendantIds.map(id =>
        this.contentRepository.softDeleteContent(id, now, ownerId)
      );
      await Promise.all(deletePromises);

      // Soft-delete the directory itself
      await this.contentRepository.softDeleteContent(contentId, now, ownerId);
    }
  }
}
