import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Content } from '../entities/content.entity';
import { ContentRepository } from '../repositories/content-repository.service';
import { assertValidContentName } from '../validation/content-name.validation';

@Injectable()
export class ContentService {
  constructor(private readonly contentRepository: ContentRepository) {}

  async findByParentIdAndOwnerId(parentId: string, ownerId: string): Promise<Content[]> {
    return this.contentRepository.findByParentIdAndOwnerId(parentId, ownerId);
  }

  async create(name: string, parentId: string, ownerId: string): Promise<Content> {
    assertValidContentName(name);

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

  async renameContent(id: string, name: string, ownerId: string): Promise<Content> {
    assertValidContentName(name);

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
}
