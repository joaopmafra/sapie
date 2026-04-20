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
      return this.convertDocumentToContent(doc.id, data);
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
    return this.convertDocumentToContent(doc.id, doc.data() as ContentDocument);
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
    return snapshot.docs.map(d => this.convertDocumentToContent(d.id, d.data() as ContentDocument));
  }

  async addNote(params: {
    name: string;
    parentId: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<Content> {
    const newContentData = {
      name: params.name,
      type: ContentType.NOTE,
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
    if (this.isContentBodyDocument(data.body)) {
      return {
        id,
        name: data.name,
        type: data.type as ContentType,
        parentId: data.parentId,
        ownerId: data.ownerId,
        body: this.bodyFromNested(data.body),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    }

    return {
      id,
      name: data.name,
      type: data.type as ContentType,
      parentId: data.parentId,
      ownerId: data.ownerId,
      body: null,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}
