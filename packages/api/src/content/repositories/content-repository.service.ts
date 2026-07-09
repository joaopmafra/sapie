import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../../firebase';
import {
  BaseContent,
  Content,
  ContentBody,
  ContentBodyDocument,
  ContentType,
  Deck,
  Directory,
  Note,
} from '../entities/content.entity';

@Injectable()
export class ContentRepository {
  private readonly logger = new Logger(ContentRepository.name);
  private readonly contentCollection = 'content';

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  private get firestore(): admin.firestore.Firestore {
    return this.firebaseAdminService.getFirestore();
  }

  async findRootDirectory(userId: string): Promise<Content | null> {
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
      const data = doc.data();
      const content = this.convertDocumentToContent(doc.id, data);
      if (!content) return null;
      // Filter out soft-deleted roots (unlikely but defensive)
      return content.deleted ? null : content;
    } catch (error) {
      this.logger.error(`Failed to find root directory for user ${userId}:`, error);
      throw error;
    }
  }
  async findFirstByParentIdAndName(parentId: string | null, name: string): Promise<Content | null> {
    const querySnapshot = await this.firestore
      .collection(this.contentCollection)
      .where('parentId', '==', parentId)
      .where('name', '==', name)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const content = this.convertDocumentToContent(doc.id, doc.data());
    if (!content) return null;
    // Skip soft-deleted items (they should not block name reuse)
    return content.deleted ? null : content;
  }

  async findById(id: string): Promise<Content | null> {
    const doc = await this.firestore.collection(this.contentCollection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) return null;
    return this.convertDocumentToContent(doc.id, data);
  }

  async findByParentIdAndOwnerId(parentId: string, ownerId: string): Promise<Content[]> {
    const snapshot = await this.firestore
      .collection(this.contentCollection)
      .where('parentId', '==', parentId)
      .where('ownerId', '==', ownerId)
      .get();
    return snapshot.docs
      .map(d => this.convertDocumentToContent(d.id, d.data()))
      .filter((c): c is Content => c !== null && !c.deleted);
  }

  async addNote(params: {
    name: string;
    parentId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<Note> {
    const newContentData = {
      name: params.name,
      type: ContentType.NOTE as const,
      parentId: params.parentId,
      ownerId: params.ownerId,
      body: null,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    };

    const docRef = await this.firestore.collection(this.contentCollection).add(newContentData);

    return {
      id: docRef.id,
      type: 'note' as const,
      name: params.name,
      parentId: params.parentId,
      ownerId: params.ownerId,
      body: null,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    };
  }

  private async addContentWithType(params: {
    name: string;
    parentId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    type: ContentType;
    directoryId?: string | null;
  }): Promise<Content> {
    const newContentData: Record<string, unknown> = {
      name: params.name,
      type: params.type,
      parentId: params.parentId,
      ownerId: params.ownerId,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    };
    if (params.type === ContentType.NOTE) {
      newContentData.body = null;
    }
    if (params.directoryId !== undefined) {
      newContentData.directoryId = params.directoryId;
    }

    const docRef = await this.firestore.collection(this.contentCollection).add(newContentData);

    // Re-read to get the typed document back (avoids unsafe cast of unknown fields)
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error(`Content ${docRef.id} not found immediately after creation`);
    }
    const snapData = snap.data();
    if (!snapData) {
      throw new Error(`Content ${docRef.id} data is undefined`);
    }
    const created = this.convertDocumentToContent(docRef.id, snapData);
    if (!created) {
      throw new Error(`Content ${docRef.id} not found immediately after creation`);
    }
    return created;
  }

  async addDeck(params: {
    name: string;
    parentId: string;
    directoryId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<Deck> {
    const result = await this.addContentWithType({
      ...params,
      type: ContentType.DECK,
    });
    // addContentWithType returns Content; for deck creation the type is always Deck
    if (result.type !== 'deck') {
      throw new Error(`Expected deck, got ${result.type}`);
    }
    return result;
  }

  async addDirectory(params: {
    name: string;
    parentId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<Directory> {
    const newContentData = {
      name: params.name,
      type: ContentType.DIRECTORY as const,
      parentId: params.parentId,
      ownerId: params.ownerId,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    };

    const docRef = await this.firestore.collection(this.contentCollection).add(newContentData);

    return {
      id: docRef.id,
      type: 'directory' as const,
      name: params.name,
      parentId: params.parentId,
      ownerId: params.ownerId,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    };
  }

  async updateContentName(id: string, name: string, updatedAt: Date): Promise<void> {
    await this.firestore.collection(this.contentCollection).doc(id).update({
      name,
      updatedAt,
    });
  }

  /**
   * Soft-deletes content by setting `deleted: true`, `deletedAt`, and `deletedBy`.
   * Permanent deletion of Firestore documents and GCS objects is deferred to the versioning story.
   */
  async softDeleteContent(id: string, deletedAt: Date, deletedBy: string): Promise<void> {
    await this.firestore
      .collection(this.contentCollection)
      .doc(id)
      .update({
        deleted: true,
        deletedAt: admin.firestore.Timestamp.fromDate(deletedAt),
        deletedBy: { uid: deletedBy },
        updatedAt: admin.firestore.Timestamp.fromDate(deletedAt),
      });
  }

  /**
   * Recursively fetches all descendant IDs under a parent. Returns both folder and note IDs.
   * Firestore doesn't support recursive queries, so this fetches level by level.
   */
  async findAllDescendantIds(parentId: string, ownerId: string): Promise<string[]> {
    const result: string[] = [];
    const queue: string[] = [parentId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const snapshot = await this.firestore
        .collection(this.contentCollection)
        .where('parentId', '==', current)
        .where('ownerId', '==', ownerId)
        .get();

      for (const doc of snapshot.docs) {
        const docData = doc.data();
        const docDeleted = docData?.['deleted'];
        const docType = docData?.['type'];
        // Skip soft-deleted descendants (shouldn't exist but defensive)
        if (!docDeleted) {
          result.push(doc.id);
          if (docType === 'directory' || docType === 'note') {
            queue.push(doc.id);
          }
        }
      }
    }

    return result;
  }

  /**
   * Counts content children (e.g. flashcard decks) with the given parent that are not soft-deleted.
   * Used to block note deletion when children exist.
   */
  async findContentChildrenCount(parentId: string): Promise<number> {
    const snapshot = await this.firestore
      .collection(this.contentCollection)
      .where('parentId', '==', parentId)
      .get();
    return snapshot.docs.filter(d => !(d.data()).deleted).length;
  }

  async updateContentBodyMetadata(
    id: string,
    objectPath: string,
    size: number,
    updatedAt: Date,
    mimeType: string
  ): Promise<void> {
    const ref = this.firestore.collection(this.contentCollection).doc(id);
    const snap = await ref.get();
    const data = snap.data();
    const existingNested = data?.body;
    let createdAt = updatedAt;
    if (this.isContentBodyDocument(existingNested)) {
      createdAt = existingNested.createdAt.toDate();
    }

    const body: ContentBodyDocument = {
      uri: objectPath,
      size,
      mimeType,
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
      updatedAt: admin.firestore.Timestamp.fromDate(updatedAt),
    };

    await ref.update({
      body,
      updatedAt: admin.firestore.Timestamp.fromDate(updatedAt),
    });
  }

  /**
   * Updates the `tags` field and `updatedAt` timestamp for a content document.
   */
  async updateContentTags(id: string, tags: string[], updatedAt: Date): Promise<void> {
    const ref = this.firestore.collection(this.contentCollection).doc(id);
    await ref.update({
      tags,
      updatedAt: admin.firestore.Timestamp.fromDate(updatedAt),
    });
  }

  /**
   * Finds all folders tagged "content-root" owned by the given user (non-deleted).
   */
  async findRootsByOwnerId(ownerId: string): Promise<Directory[]> {
    const snapshot = await this.firestore
      .collection(this.contentCollection)
      .where('type', '==', ContentType.DIRECTORY)
      .where('tags', 'array-contains', 'content-root')
      .where('ownerId', '==', ownerId)
      .get();

    return snapshot.docs
      .map(doc => this.convertDocumentToContent(doc.id, doc.data()))
      .filter((c): c is Directory => c !== null && !c.deleted && c.type === 'directory');
  }

  /**
   * Finds all non-deleted deck-type content whose `directoryId` is in the given list.
   */
  async findDecksByDirectoryIds(directoryIds: string[], ownerId: string): Promise<Deck[]> {
    if (directoryIds.length === 0) return [];

    // Firestore `in` query supports up to 30 values. For MVP we assume fewer than 30 directories per root.
    const snapshot = await this.firestore
      .collection(this.contentCollection)
      .where('type', '==', ContentType.DECK)
      .where('directoryId', 'in', directoryIds)
      .where('ownerId', '==', ownerId)
      .get();

    return snapshot.docs
      .map(doc => this.convertDocumentToContent(doc.id, doc.data()))
      .filter((c): c is Deck => c !== null && !c.deleted && c.type === 'deck');
  }

  private isContentBodyDocument(v: unknown): v is ContentBodyDocument {
    if (!v || typeof v !== 'object') return false;
    const o = v as ContentBodyDocument;
    return (
      typeof o.uri === 'string' &&
      typeof o.size === 'number' &&
      typeof o.mimeType === 'string' &&
      o.createdAt != null &&
      typeof o.createdAt.toDate === 'function' &&
      o.updatedAt != null &&
      typeof o.updatedAt.toDate === 'function'
    );
  }

  private bodyFromNested(b: ContentBodyDocument): ContentBody {
    return {
      uri: b.uri,
      size: b.size,
      mimeType: b.mimeType,
      createdAt: b.createdAt.toDate(),
      updatedAt: b.updatedAt.toDate(),
    };
  }

  /**
   * Converts a raw Firestore document to the correct discriminated Content type.
   * Uses the `type` field to discriminate and validate fields at runtime.
   */
  private convertDocumentToContent(id: string, data: FirebaseFirestore.DocumentData): Content | null {
    if (!data || typeof data !== 'object') return null;

    const rawType = data['type'];
    if (typeof rawType !== 'string') return null;

    const base: BaseContent = {
      id,
      name: typeof data['name'] === 'string' ? data['name'] : '',
      parentId: typeof data['parentId'] === 'string' ? data['parentId'] : null,
      ownerId: typeof data['ownerId'] === 'string' ? data['ownerId'] : '',
      deleted: typeof data['deleted'] === 'boolean' ? data['deleted'] : undefined,
      deletedAt: data['deletedAt'] && typeof data['deletedAt'].toDate === 'function' ? data['deletedAt'].toDate() : null,
      deletedBy: data['deletedBy'] && typeof data['deletedBy'] === 'object' ? data['deletedBy'] as { uid: string } : null,
      tags: Array.isArray(data['tags']) ? data['tags'] : null,
      createdAt: data['createdAt'] && typeof data['createdAt'].toDate === 'function' ? data['createdAt'].toDate() : new Date(),
      updatedAt: data['updatedAt'] && typeof data['updatedAt'].toDate === 'function' ? data['updatedAt'].toDate() : new Date(),
    };

    switch (rawType) {
      case 'directory':
        return { ...base, type: 'directory' as const };
      case 'note': {
        const body = this.isContentBodyDocument(data['body'])
          ? this.bodyFromNested(data['body'])
          : null;
        return { ...base, type: 'note' as const, body };
      }
      case 'deck': {
        const directoryId = typeof data['directoryId'] === 'string' ? data['directoryId'] : null;
        const description = typeof data['description'] === 'string' ? data['description'] : undefined;
        return { ...base, type: 'deck' as const, directoryId, description };
      }
      default:
        return null;
    }
  }
}
