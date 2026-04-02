import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../../firebase';
import { Content, ContentType } from '../entities/content.entity';
import { ContentRepository } from '../repositories/content-repository.service';

/**
 * Root Directory Service
 *
 * This service handles the creation and management of user root directories.
 * It ensures each user has a "My Contents" directory as their entry point
 * into the content management system.
 */
@Injectable()
export class RootDirectoryService {
  private readonly logger = new Logger(RootDirectoryService.name);
  private readonly contentCollection = 'content';

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly rootDirectoryRepository: ContentRepository
  ) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseAdminService.getFirestore();
  }

  /**
   * Ensures a root directory exists for the specified user.
   * Creates the directory if it doesn't exist.
   * This is an idempotent operation - safe to call multiple times.
   *
   * @param userId - The ID of the user who needs a root directory
   * @returns Promise<Content> - The user's root directory
   */
  async ensureRootDirectory(userId: string): Promise<Content> {
    try {
      this.logger.debug(`Ensuring root directory exists for user: ${userId}`);

      // First, try to find existing root directory
      const existingRoot = await this.rootDirectoryRepository.findRootDirectory(userId);
      if (existingRoot) {
        this.logger.debug(`Root directory already exists for user: ${userId}`);
        return existingRoot;
      }

      // Create new root directory
      this.logger.debug(`Creating new root directory for user: ${userId}`);
      return await this.createRootDirectory(userId);
    } catch (error) {
      this.logger.error(`Failed to ensure root directory for user ${userId}:`, error);
      throw new Error(
        `Failed to ensure root directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Creates a new root directory for a user.
   *
   * @param userId - The ID of the user
   * @returns Promise<Content> - The newly created root directory
   */
  private async createRootDirectory(userId: string): Promise<Content> {
    try {
      const now = new Date();
      const rootDirectoryData = {
        name: 'My Contents',
        type: ContentType.DIRECTORY,
        parentId: null,
        ownerId: userId,
        contentUrl: null,
        size: null,
        // Firestore will convert Date to Timestamp
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await this.firestore.collection(this.contentCollection).add(rootDirectoryData);

      this.logger.debug(
        `Successfully created root directory with ID: ${docRef.id} for user: ${userId}`
      );

      return {
        id: docRef.id,
        name: rootDirectoryData.name,
        type: rootDirectoryData.type,
        parentId: rootDirectoryData.parentId,
        ownerId: rootDirectoryData.ownerId,
        contentUrl: rootDirectoryData.contentUrl,
        size: rootDirectoryData.size,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      this.logger.error(`Failed to create root directory for user ${userId}:`, error);
      throw error;
    }
  }
}
