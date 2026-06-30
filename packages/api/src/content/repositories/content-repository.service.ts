import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../../firebase';
import {
  Content,
  ContentBody,
  ContentBodyDocument,
  ContentDocument,
  ContentType,
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
      const data = doc.data() as ContentDocument;
      const content = this.convertDocumentToContent(doc.id, data);
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
    const content = this.convertDocumentToContent(doc.id, doc.data() as ContentDocument);
    // Skip soft-deleted items (they should not block name reuse)
    return content.deleted ? null : content;
  }

  async findById(id: string): Promise<Content | null> {
    const doc = await this.firestore.collection(this.contentCollection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return this.convertDocumentToContent(doc.id, doc.data() as ContentDocument);
  }

  async findByParentIdAndOwnerId(parentId: string, ownerId: string): Promise<Content[]> {
    const snapshot = await this.firestore
      .collection(this.contentCollection)
      .where('parentId', '==', parentId)
      .where('ownerId', '==', ownerId)
      .get();
    return snapshot.docs
      .map(d => this.convertDocumentToContent(d.id, d.data() as ContentDocument))
      .filter(c => !c.deleted);
  }

  async addNote(params: {
    name: string;
    parentId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<Content> {
    return this.addContentWithType({ ...params, type: ContentType.NOTE });
  }

  private async addContentWithType(params: {
    name: string;
    parentId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    type: ContentType;
    folderId?: string | null;
  }): Promise<Content> {
    const newContentData: Record<string, unknown> = {
      name: params.name,
      type: params.type,
      parentId: params.parentId,
      ownerId: params.ownerId,
      body: null,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    };
    if (params.folderId !== undefined) {
      newContentData.folderId = params.folderId;
    }

    const docRef = await this.firestore.collection(this.contentCollection).add(newContentData);

    return {
      id: docRef.id,
      name: newContentData.name as string,
      type: newContentData.type as ContentType,
      parentId: newContentData.parentId as string | null,
      folderId: (newContentData.folderId as string) ?? null,
      ownerId: newContentData.ownerId as string,
      body: null,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    };
  }

  async addDeck(params: {
    name: string;
    parentId: string;
    folderId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<Content> {
    return this.addContentWithType({
      ...params,
      type: ContentType.DECK,
    });
  }

  async addDirectory(params: {
    name: string;
    parentId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<Content> {
    const newContentData = {
      name: params.name,
      type: ContentType.DIRECTORY,
      parentId: params.parentId,
      ownerId: params.ownerId,
      body: null,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    };

    const docRef = await this.firestore.collection(this.contentCollection).add(newContentData);

    return {
      id: docRef.id,
      name: newContentData.name,
      type: newContentData.type,
      parentId: newContentData.parentId,
      ownerId: newContentData.ownerId,
      body: null,
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
        const docData = doc.data() as ContentDocument;
        // Skip soft-deleted descendants (shouldn't exist but defensive)
        if (!docData.deleted) {
          result.push(doc.id);
          if (docData.type === (ContentType.DIRECTORY as string)) {
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
    return snapshot.docs.filter(d => !(d.data() as ContentDocument).deleted).length;
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
    const data = snap.data() as ContentDocument | undefined;
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

  private convertDocumentToContent(id: string, data: ContentDocument): Content {
    const base = {
      id,
      name: data.name,
      type: data.type as ContentType,
      parentId: data.parentId,
      folderId: data.folderId ?? null,
      ownerId: data.ownerId,
      deleted: data.deleted,
      deletedAt: data.deletedAt?.toDate() ?? null,
      deletedBy: data.deletedBy ?? null,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };

    if (this.isContentBodyDocument(data.body)) {
      return { ...base, body: this.bodyFromNested(data.body) };
    }

    return { ...base, body: null };
  }
}
