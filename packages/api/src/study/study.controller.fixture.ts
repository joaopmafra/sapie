import { HttpStatus } from '@nestjs/common';
import * as supertest from 'supertest';

import { AppFixture } from '../test-helpers/app.fixture';
import { TEST_USER_ID_HEADER } from '../test-helpers/fake-auth.guard';
import type { Content } from '../content/entities/content.entity';
import type { Card } from '../cards/entities/card.entity';

export class StudyControllerFixture extends AppFixture {
  readonly API_CONTENT = '/api/content';
  readonly API_STUDY = '/api/study';
  readonly TEST_USER_ID = 'study-test-user';
  readonly OTHER_USER_ID = 'study-test-user-2';

  async init(): Promise<void> {
    this.createTestingModuleBuilder().withFakeAuth();
    await this.buildAndInit();
  }

  // ── Content seeding ──────────────────────────────────────────

  async seedRootDirectory(userId: string): Promise<Content> {
    const response = await supertest(this.getHttpServer())
      .get(`${this.API_CONTENT}/root`)
      .set(TEST_USER_ID_HEADER, userId)
      .expect(HttpStatus.OK);
    return response.body as Content;
  }

  /** Create a folder (type=directory) and return it. */
  async seedFolder(userId: string, name: string, parentId: string): Promise<Content> {
    const response = await supertest(this.getHttpServer())
      .post(this.API_CONTENT)
      .set(TEST_USER_ID_HEADER, userId)
      .send({ name, parentId, type: 'directory' })
      .expect(HttpStatus.CREATED);
    return response.body as Content;
  }

  /** Tag a folder via PATCH. */
  async tagFolder(userId: string, folderId: string, tags: string[]): Promise<void> {
    await supertest(this.getHttpServer())
      .patch(`${this.API_CONTENT}/${folderId}`)
      .set(TEST_USER_ID_HEADER, userId)
      .send({ tags })
      .expect(HttpStatus.OK);
  }

  /** Create a note and return it. */
  async seedNote(userId: string, name: string, parentId: string): Promise<Content> {
    const response = await supertest(this.getHttpServer())
      .post(this.API_CONTENT)
      .set(TEST_USER_ID_HEADER, userId)
      .send({ name, parentId })
      .expect(HttpStatus.CREATED);
    return response.body as Content;
  }

  /** Create a deck under a note and return it. */
  async seedDeck(userId: string, name: string, parentNoteId: string): Promise<Content> {
    const response = await supertest(this.getHttpServer())
      .post(this.API_CONTENT)
      .set(TEST_USER_ID_HEADER, userId)
      .send({ name, parentId: parentNoteId, type: 'deck' })
      .expect(HttpStatus.CREATED);
    return response.body as Content;
  }

  // ── Card seeding ─────────────────────────────────────────────

  async seedCard(userId: string, deckId: string, front: string, back: string): Promise<Card> {
    const response = await supertest(this.getHttpServer())
      .post(`${this.API_CONTENT}/${deckId}/cards`)
      .set(TEST_USER_ID_HEADER, userId)
      .send({ front, back })
      .expect(HttpStatus.CREATED);
    return response.body as Card;
  }

  // ── Study API calls ──────────────────────────────────────────

  callApiGetRoots(userId: string): supertest.Test {
    return supertest(this.getHttpServer())
      .get(`${this.API_CONTENT}/roots`)
      .set(TEST_USER_ID_HEADER, userId);
  }

  /** GET /api/study/due-cards?rootIds=... */
  callApiGetDueCards(userId: string, rootIds: string[]): supertest.Test {
    return supertest(this.getHttpServer())
      .get(`${this.API_STUDY}/due-cards`)
      .set(TEST_USER_ID_HEADER, userId)
      .query({ rootIds: rootIds.join(',') });
  }

  /** PATCH /api/content/:deckId/cards/:cardId/study-result */
  callApiRecordStudyResult(
    userId: string,
    deckId: string,
    cardId: string,
    result: 'know' | 'dont_know'
  ): supertest.Test {
    return supertest(this.getHttpServer())
      .patch(`${this.API_CONTENT}/${deckId}/cards/${cardId}/study-result`)
      .set(TEST_USER_ID_HEADER, userId)
      .send({ result });
  }
}
