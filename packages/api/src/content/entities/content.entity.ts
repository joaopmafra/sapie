import * as admin from 'firebase-admin';

/**
 * Content Type Enumeration
 *
 * Defines the types of content that can be stored in the system.
 */
export enum ContentType {
  DIRECTORY = 'directory',
  NOTE = 'note',
  DECK = 'deck',
}

/**
 * Stored body metadata (Firestore + domain). **`uri` is server-only** — never exposed on HTTP.
 */
export interface ContentBody {
  /** Object path in the default bucket (`ownerId/content/contentId`), no `gs://` prefix. */
  uri: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  /** Canonical "body bytes changed" timestamp (rename must not advance this). */
  updatedAt: Date;
}

/**
 * Firestore shape for {@link ContentBody} (nested under document field `body`).
 */
export interface ContentBodyDocument {
  uri: string;
  size: number;
  mimeType: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Shared fields for all content types.
 */
export interface BaseContent {
  /** Unique identifier for the content (metadata record) */
  id: string;

  /** Display name of the content */
  name: string;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;

  /** ID of the user who owns this content */
  ownerId: string;

  /** True if the content has been soft-deleted */
  deleted?: boolean;

  /** Timestamp when the content was soft-deleted */
  deletedAt?: Date | null;

  /** User who deleted the content (for operation log / versioning) */
  deletedBy?: { uid: string } | null;

  /** Tags for categorization (e.g. 'content-root', 'knowledge-area'). Applicable to directories. */
  tags?: string[] | null;

  /** Timestamp when the content was created */
  createdAt: Date;

  /** Timestamp when content metadata last changed (e.g. rename); not the stored body version signal (`body.updatedAt`). */
  updatedAt: Date;
}

/**
 * Directory content — a folder in the sidebar tree.
 */
export interface Directory extends BaseContent {
  type: 'directory';
}

/**
 * Note content — a markdown document.
 */
export interface Note extends BaseContent {
  type: 'note';
  /**
   * Storage-backed body for notes; **null** until first `PUT …/body`.
   * The HTTP metadata DTO exposes a public summary under `body` without `uri`.
   */
  body: ContentBody | null;
}

/**
 * Deck content — a flashcard deck attached to a note.
 */
export interface Deck extends BaseContent {
  type: 'deck';
  /** Deck-level description — metadata-scale (<500 bytes). */
  description?: string;
  /** Card format: question-answer, cloze deletion, or open-ended. */
  cardStyle?: 'qa' | 'cloze' | 'open_ended';
  /** Default depth/conceptual level for cards in this deck. */
  defaultDepth?: 'foundation' | 'applied' | 'detail';
  /** Language code (e.g. 'en', 'pt') for TTS / language-specific study. */
  language?: string;
  /**
   * Denormalized ID of the directory containing this deck's parent note.
   * Enables efficient directory-level study queries (`WHERE directoryId = ? AND type = 'deck'`)
   * without traversing `deck.parentId → note.parentId → directory` chains.
   *
   * Set once at deck creation (snapshot of note.parentId). If the note is moved
   * to a different directory, this field must be repaired — currently handled by
   * the note-move operation updating all child decks.
   */
  directoryId: string | null;
}

/**
 * Content discriminated union.
 *
 * A single Firestore `content` collection stores all types. The `type` literal
 * discriminant lets the compiler enforce validity (e.g. `body` only exists on `Note`,
 * `directoryId` only exists on `Deck`). This is a domain-layer concern — Firestore
 * documents are flat and the `type` field drives type construction in
 * {@link convertDocumentToContent}.
 */
export type Content = Directory | Note | Deck;

/**
 * Shared Firestore shape for all content types.
 */
export interface BaseContentDocument {
  /** Display name of the content */
  name: string;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;

  /** ID of the user who owns this content */
  ownerId: string;

  /** True if the content has been soft-deleted */
  deleted?: boolean;

  /** Firestore timestamp when the content was soft-deleted */
  deletedAt?: admin.firestore.Timestamp | null;

  /** User who deleted the content (for operation log / versioning) */
  deletedBy?: { uid: string } | null;

  /** Tags for categorization (e.g. 'content-root', 'knowledge-area'). Applicable to directories. */
  tags?: string[] | null;

  /** Firestore timestamp when the content was created */
  createdAt: admin.firestore.Timestamp;

  /** Firestore timestamp when the content was last updated */
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Content Document — Firestore shape for the `content` collection.
 *
 * Uses `type: string` for Firestore compatibility (the discriminant is a string field).
 * Construct the domain type via {@link convertDocumentToContent}.
 */
export type ContentDocument =
  | (BaseContentDocument & { type: 'directory' })
  | (BaseContentDocument & {
      type: 'note';
      body?: ContentBodyDocument | null;
    })
  | (BaseContentDocument & {
      type: 'deck';
      /** Denormalized directory ID (for deck-type content). */
      directoryId: string | null;
      description?: string;
      cardStyle?: string;
      defaultDepth?: string;
      language?: string;
    });

/**
 * Fields used when persisting new content (metadata), e.g. from the repository layer.
 *
 * For the HTTP **command** shape (`POST /api/content`), use {@link CreateContentRequest} in `content.dto.ts`.
 */
export interface ContentCreationInput {
  /** Display name of the content */
  name: string;

  /** Type of content (directory, note, or deck) */
  type: ContentType;

  /** ID of the parent directory, null for root directory */
  parentId: string | null;
}

export interface DeckCreationInput {
  name: string;
  type: 'deck';
  parentId: string;
  directoryId: string;
}
