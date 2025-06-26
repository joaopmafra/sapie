import * as admin from 'firebase-admin';

/**
 * Content Type Enumeration
 *
 * Defines the types of content that can be stored in the system.
 */
export enum ContentType {
  DIRECTORY = 'directory',
  NOTE = 'note',
}

/**
 * Content Entity Interface
 *
 * Represents a content item in the system, which can be either a directory or a note.
 * This interface is used for in-memory representation and API responses.
 */
export interface Content {
  /** Unique identifier for the content item */
  id: string;

  /** Display name of the content item */
  name: string;

  /** Type of content (directory or note) */
  type: ContentType;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;

  /** ID of the user who owns this content */
  ownerId: string;

  /** URL to the actual content file (only for files, not directories) */
  contentUrl?: string | null;

  /** Size of the content in bytes (only for files, not directories) */
  size?: number | null;

  /** Timestamp when the content was created */
  createdAt: Date;

  /** Timestamp when the content was last updated */
  updatedAt: Date;
}

/**
 * Content Document Interface
 *
 * Represents how content is stored in Firestore.
 * This interface handles the serialization differences between JavaScript Date objects
 * and Firestore Timestamp objects.
 */
export interface ContentDocument {
  /** Display name of the content item */
  name: string;

  /** Type of content (directory or note) */
  type: string;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;

  /** ID of the user who owns this content */
  ownerId: string;

  /** URL to the actual content file (only for files, not directories) */
  contentUrl?: string;

  /** Size of the content in bytes (only for files, not directories) */
  size?: number;

  /** Firestore timestamp when the content was created */
  createdAt: admin.firestore.Timestamp;

  /** Firestore timestamp when the content was last updated */
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Create Content Request Interface
 *
 * Represents the data required to create a new content item.
 */
export interface CreateContentRequest {
  /** Display name of the content item */
  name: string;

  /** Type of content (directory or note) */
  type: ContentType;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;

  /** URL to the actual content file (only for files, not directories) */
  contentUrl?: string;

  /** Size of the content in bytes (only for files, not directories) */
  size?: number;
}

/**
 * Update Content Request Interface
 *
 * Represents the data that can be updated for an existing content item.
 */
export interface UpdateContentRequest {
  /** Display name of the content item */
  name?: string;

  /** ID of the parent directory */
  parentId?: string | null;

  /** URL to the actual content file (only for files, not directories) */
  contentUrl?: string;

  /** Size of the content in bytes (only for files, not directories) */
  size?: number;
}
