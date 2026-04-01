import { AppFixture } from '../../test-helpers/app.fixture';
import * as supertest from 'supertest';
import { TEST_USER_ID_HEADER } from '../../test-helpers/fake-auth.guard';
import { Content } from '../entities/content.entity';
import { Type } from '@nestjs/common';

export class ContentControllerFixture {
  readonly API_CONTENT = '/api/content';
  readonly API_CONTENT_ROOT = `${this.API_CONTENT}/root`;
  readonly TEST_USER_ID = 'content-test-user';

  private appFixture: AppFixture;

  async buildAndInit() {
    this.appFixture = new AppFixture();
    await this.appFixture.createTestingModuleBuilder().withFakeAuth().buildAndInit();
  }

  // TODO: replace with mixin pattern
  async clearDatabase() {
    await this.appFixture.clearDatabase();
  }

  // TODO: replace with mixin pattern
  async close() {
    await this.appFixture.close();
  }

  // TODO: replace with mixin pattern
  getComponent<T>(token: Type<T>): T {
    return this.appFixture.getComponent(token);
  }

  async callGetApiContentRootExpectingOk(testUserId: string): Promise<supertest.Response> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return supertest(this.appFixture.getHttpServer())
      .get(this.API_CONTENT_ROOT)
      .set(TEST_USER_ID_HEADER, testUserId)
      .expect(200);
  }

  async callApiGetRootDirectoryExpectingOkAsContent(testUserId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await supertest(this.appFixture.getHttpServer())
      .get(this.API_CONTENT_ROOT)
      .set(TEST_USER_ID_HEADER, testUserId)
      .expect(200);

    return response.body as Content;
  }

  async callApiCreateNoteExpectingCreated(
    testUserId: string,
    payload: { name: string; parentId: string }
  ): Promise<supertest.Response> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return supertest(this.appFixture.getHttpServer())
      .post(this.API_CONTENT)
      .set(TEST_USER_ID_HEADER, testUserId)
      .send(payload)
      .expect(201);
  }
}
