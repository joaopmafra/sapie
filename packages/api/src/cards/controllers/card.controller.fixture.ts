import { HttpStatus } from '@nestjs/common';
import * as supertest from 'supertest';

import { AppFixture } from '../../test-helpers/app.fixture';
import { TEST_USER_ID_HEADER } from '../../test-helpers/fake-auth.guard';
import { Content } from '../../content/entities/content.entity';

export class CardControllerFixture extends AppFixture {
  readonly API_CONTENT = '/api/content';
  readonly TEST_USER_ID = 'card-test-user';
  readonly OTHER_USER_ID = 'card-test-user-2';

  async init(): Promise<void> {
    this.createTestingModuleBuilder().withFakeAuth();
    await this.buildAndInit();
  }

  async callApiGetRootDirectoryExpectingOkAsContent(userId: string): Promise<Content> {
    const response = await supertest(this.getHttpServer())
      .get(`${this.API_CONTENT}/root`)
      .set(TEST_USER_ID_HEADER, userId)
      .expect(HttpStatus.OK);
    return response.body as Content;
  }

  async seedRootDirectory(userId: string): Promise<Content> {
    return this.callApiGetRootDirectoryExpectingOkAsContent(userId);
  }

  async seedNote(userId: string, name: string, parentId: string): Promise<Content> {
    const response = await supertest(this.getHttpServer())
      .post(this.API_CONTENT)
      .set(TEST_USER_ID_HEADER, userId)
      .send({ name, parentId })
      .expect(HttpStatus.CREATED);
    return response.body as Content;
  }

  async seedDeck(userId: string, name: string, parentNoteId: string): Promise<Content> {
    const response = await supertest(this.getHttpServer())
      .post(this.API_CONTENT)
      .set(TEST_USER_ID_HEADER, userId)
      .send({ name, parentId: parentNoteId, type: 'deck' })
      .expect(HttpStatus.CREATED);
    return response.body as Content;
  }

  callApiCreateCard(
    userId: string,
    deckId: string,
    body: { front: string; back: string }
  ): supertest.Test {
    return supertest(this.getHttpServer())
      .post(`${this.API_CONTENT}/${deckId}/cards`)
      .set(TEST_USER_ID_HEADER, userId)
      .send(body);
  }

  callApiGetCards(userId: string, deckId: string): supertest.Test {
    return supertest(this.getHttpServer())
      .get(`${this.API_CONTENT}/${deckId}/cards`)
      .set(TEST_USER_ID_HEADER, userId);
  }

  callApiUpdateCard(
    userId: string,
    deckId: string,
    cardId: string,
    body: { front: string; back: string }
  ): supertest.Test {
    return supertest(this.getHttpServer())
      .patch(`${this.API_CONTENT}/${deckId}/cards/${cardId}`)
      .set(TEST_USER_ID_HEADER, userId)
      .send(body);
  }

  callApiDeleteCard(userId: string, deckId: string, cardId: string): supertest.Test {
    return supertest(this.getHttpServer())
      .delete(`${this.API_CONTENT}/${deckId}/cards/${cardId}`)
      .set(TEST_USER_ID_HEADER, userId);
  }
}
