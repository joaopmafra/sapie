import { AppFixture } from '../../test-helpers/app.fixture';
import * as supertest from 'supertest';
import { TEST_USER_ID_HEADER } from '../../test-helpers/fake-auth.guard';
import { Content } from '../entities/content.entity';
import { HttpStatus } from '@nestjs/common';

export class ContentControllerFixture extends AppFixture {
  readonly API_CONTENT = '/api/content';
  readonly API_CONTENT_ROOT = `${this.API_CONTENT}/root`;
  readonly TEST_USER_ID = 'content-test-user';

  async init(): Promise<void> {
    await this.createTestingModuleBuilder().withFakeAuth().buildAndInit();
  }

  async callGetApiContentRootExpectingOk(testUserId: string): Promise<supertest.Response> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return supertest(this.getHttpServer())
      .get(this.API_CONTENT_ROOT)
      .set(TEST_USER_ID_HEADER, testUserId)
      .expect(HttpStatus.OK);
  }

  async callApiGetRootDirectoryExpectingOkAsContent(testUserId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await supertest(this.getHttpServer())
      .get(this.API_CONTENT_ROOT)
      .set(TEST_USER_ID_HEADER, testUserId)
      .expect(HttpStatus.OK);

    return response.body as Content;
  }

  async callApiCreateNoteExpectingCreated(
    testUserId: string,
    payload: { name: string; parentId: string }
  ): Promise<supertest.Response> {
    return this.callApiCreateNote(testUserId, payload).expect(HttpStatus.CREATED);
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
}
