/**
 * Content Type Enumeration
 *
 * Defines the types of content that can be stored in the system.
 * This matches the backend ContentType enum.
 */
export enum ContentType {
  DIRECTORY = 'directory',
  NOTE = 'note',
}

/**
 * Content Entity Interface
 *
 * Represents a content item in the system, which can be either a directory or a note.
 * This interface matches the backend Content interface.
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
  contentUrl?: string;

  /** Size of the content in bytes (only for files, not directories) */
  size?: number;

  /** Timestamp when the content was created */
  createdAt: Date;

  /** Timestamp when the content was last updated */
  updatedAt: Date;
}

/**
 * Tree Node Interface
 *
 * Represents a node in the content explorer tree, extending the base Content entity.
 */
export interface TreeNode extends Content {
  children?: TreeNode[];
}

/**
 * Create Content Request Interface
 *
 * Represents the data required to create a new content item.
 * This interface matches the backend CreateContentRequest interface.
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
 * This interface matches the backend UpdateContentRequest interface.
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
