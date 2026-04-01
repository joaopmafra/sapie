import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAdminService } from '../../firebase';
import { Content, ContentDocument, ContentType } from '../entities/content.entity';

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
}
