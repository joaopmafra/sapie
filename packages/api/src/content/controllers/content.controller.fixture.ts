import { AppFixture } from '../../test-helpers/app.fixture';
import * as supertest from 'supertest';
import { TEST_USER_ID_HEADER } from '../../test-helpers/fake-auth.guard';
import { Content } from '../entities/content.entity';
import { HttpStatus } from '@nestjs/common';

export class ContentControllerFixture extends AppFixture {
  readonly API_CONTENT = '/api/content';
  readonly API_CONTENT_ROOT = `${this.API_CONTENT}/root`;

  readonly TEST_USER_ID = 'content-test-user';
  readonly OTHER_USER_ID = 'content-test-user-2';

  async init(): Promise<void> {
    await this.createTestingModuleBuilder().withFakeAuth().buildAndInit();
  }

  async callGetApiContentRootExpectingOk(userId: string): Promise<supertest.Response> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return supertest(this.getHttpServer())
      .get(this.API_CONTENT_ROOT)
      .set(TEST_USER_ID_HEADER, userId)
      .expect(HttpStatus.OK);
  }

  async callApiGetRootDirectoryExpectingOkAsContent(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await supertest(this.getHttpServer())
      .get(this.API_CONTENT_ROOT)
      .set(TEST_USER_ID_HEADER, userId)
      .expect(HttpStatus.OK);

    return response.body as Content;
  }

  async seedRootDirectory(userId: string): Promise<Content> {
    return this.callApiGetRootDirectoryExpectingOkAsContent(userId);
  }

  async callApiCreateNoteExpectingCreated(
    testUserId: string,
    payload: { name: string; parentId: string }
  ): Promise<supertest.Response> {
    return this.callApiCreateNote(testUserId, payload).expect(HttpStatus.CREATED);
  }

  async seedNote(userId: string, name: string, parentId: string): Promise<Content> {
    const response = await this.callApiCreateNoteExpectingCreated(userId, { name, parentId });
    return response.body as Content;
  }

  callApiCreateNote(
    testUserId: string,
    payload: { name: string; parentId: string }
  ): supertest.Test {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return supertest(this.getHttpServer())
      .post(this.API_CONTENT)
      .set(TEST_USER_ID_HEADER, testUserId)
      .send(payload);
  }

  async callApiGetContentByParentIdExpectingOkAsContentArray(
    testUserId: string,
    parentId: string
  ): Promise<Content[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await supertest(this.getHttpServer())
      .get(this.API_CONTENT)
      .query({ parentId })
      .set(TEST_USER_ID_HEADER, testUserId)
      .expect(HttpStatus.OK);

    return response.body as Content[];
  }
}
