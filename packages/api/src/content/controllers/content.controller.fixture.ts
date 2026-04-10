import { AppFixture } from '../../test-helpers/app.fixture';
import * as supertest from 'supertest';
import { TEST_USER_ID_HEADER } from '../../test-helpers/fake-auth.guard';
import { Content } from '../entities/content.entity';
import { HttpStatus } from '@nestjs/common';

export class ContentControllerFixture extends AppFixture {
  readonly API_CONTENT = '/api/content';
  readonly API_CONTENT_ROOT = `${this.API_CONTENT}/root`;
  readonly API_CONTENT_CHILDREN = `${this.API_CONTENT}/:id/children`;

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

  callApiPatchContentName(
    testUserId: string,
    contentId: string,
    payload: { name: string }
  ): supertest.Test {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return supertest(this.getHttpServer())
      .patch(`${this.API_CONTENT}/${contentId}`)
      .set(TEST_USER_ID_HEADER, testUserId)
      .send(payload);
  }

  async callApiPatchContentNameExpectingOk(
    testUserId: string,
    contentId: string,
    payload: { name: string }
  ): Promise<supertest.Response> {
    return this.callApiPatchContentName(testUserId, contentId, payload).expect(HttpStatus.OK);
  }

  async callApiGetContentByParentIdExpectingOkAsContentArray(
    testUserId: string,
    parentId: string
  ): Promise<Content[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await supertest(this.getHttpServer())
      .get(this.API_CONTENT_CHILDREN.replace(':id', parentId))
      .set(TEST_USER_ID_HEADER, testUserId)
      .expect(HttpStatus.OK);

    return response.body as Content[];
  }

  callApiGetContentById(testUserId: string, contentId: string): supertest.Test {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return supertest(this.getHttpServer())
      .get(`${this.API_CONTENT}/${contentId}`)
      .set(TEST_USER_ID_HEADER, testUserId);
  }

  async callApiGetContentByIdExpectingOkAsContent(
    testUserId: string,
    contentId: string
  ): Promise<Content> {
    const response = await this.callApiGetContentById(testUserId, contentId).expect(HttpStatus.OK);
    return response.body as Content;
  }
}
