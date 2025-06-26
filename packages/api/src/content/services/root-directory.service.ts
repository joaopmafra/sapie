import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirestore } from '../../config/firebase-admin.config';
import {
  Content,
  ContentDocument,
  ContentType,
} from '../entities/content.entity';

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
  private readonly firestore: admin.firestore.Firestore;
  private readonly contentCollection = 'content';

  constructor() {
    this.firestore = getFirestore();
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
      const existingRoot = await this.findRootDirectory(userId);
      if (existingRoot) {
        this.logger.debug(`Root directory already exists for user: ${userId}`);
        return existingRoot;
      }

      // Create new root directory
      this.logger.debug(`Creating new root directory for user: ${userId}`);
      return await this.createRootDirectory(userId);
    } catch (error) {
      this.logger.error(
        `Failed to ensure root directory for user ${userId}:`,
        error
      );
      throw new Error(
        `Failed to ensure root directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Finds the existing root directory for a user.
   *
   * @param userId - The ID of the user
   * @returns Promise<Content | null> - The root directory or null if not found
   */
  private async findRootDirectory(userId: string): Promise<Content | null> {
    try {
      const querySnapshot = await this.firestore
        .collection(this.contentCollection)
        .where('ownerId', '==', userId)
        .where('parentId', '==', null)
        .where('type', '==', ContentType.DIRECTORY)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data() as ContentDocument;
      return this.convertDocumentToContent(doc.id, data);
    } catch (error) {
      this.logger.error(
        `Failed to find root directory for user ${userId}:`,
        error
      );
      throw error;
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
        createdAt: now, // Firestore will convert Date to Timestamp
        updatedAt: now, // Firestore will convert Date to Timestamp
      };

      const docRef = await this.firestore
        .collection(this.contentCollection)
        .add(rootDirectoryData);

      this.logger.debug(
        `Successfully created root directory with ID: ${docRef.id} for user: ${userId}`
      );

      // Create the response object with proper Date objects
      const content: Content = {
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

      return content;
    } catch (error) {
      this.logger.error(
        `Failed to create root directory for user ${userId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Converts a Firestore document to a Content entity.
   *
   * @param id - The document ID
   * @param data - The document data
   * @returns Content - The converted content entity
   */
  private convertDocumentToContent(id: string, data: ContentDocument): Content {
    return {
      id,
      name: data.name,
      type: data.type as ContentType,
      parentId: data.parentId,
      ownerId: data.ownerId,
      contentUrl: data.contentUrl,
      size: data.size,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }

  /**
   * Gets the root directory for a user.
   * Throws an error if the root directory doesn't exist.
   *
   * @param userId - The ID of the user
   * @returns Promise<Content> - The user's root directory
   */
  async getRootDirectory(userId: string): Promise<Content> {
    try {
      const rootDirectory = await this.findRootDirectory(userId);
      if (!rootDirectory) {
        throw new Error(`Root directory not found for user: ${userId}`);
      }
      return rootDirectory;
    } catch (error) {
      this.logger.error(
        `Failed to get root directory for user ${userId}:`,
        error
      );
      throw error;
    }
  }
}
