import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { FirebaseAdminService } from '../firebase';
import { clearFirestoreData } from './firestore.helper';

describe('clearFirestoreData', () => {
  let app: INestApplication;
  let firebaseAdminService: FirebaseAdminService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    firebaseAdminService = moduleFixture.get(FirebaseAdminService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should delete seeded documents from Firestore emulator', async () => {
    const firestore = firebaseAdminService.getFirestore();
    const collectionName = `tmp-clear-helper-${Date.now()}`;

    await firestore.collection(collectionName).doc('doc-1').set({ value: 'seeded' });

    await clearFirestoreData();

    const snapshot = await firestore.collection(collectionName).get();
    expect(snapshot.empty).toBe(true);
  });
});
