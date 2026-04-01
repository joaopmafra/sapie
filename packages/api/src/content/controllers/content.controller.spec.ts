import * as request from 'supertest';
import { AppFixture } from '../../test-helpers/app.fixture';
import { Content } from '../entities/content.entity';
import { ContentRepository } from '../repositories/content-repository.service';
import { TEST_USER_ID_HEADER } from '../../test-helpers/fake-auth.guard';

const API_CONTENT = '/api/content';
const API_CONTENT_ROOT = `${API_CONTENT}/root`;

const TEST_USER_ID = 'content-test-user';

describe('ContentController', () => {
  let appFixture: AppFixture;

  async function callGetApiContentRootExpectingOk(testUserId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(appFixture.getHttpServer())
      .get(API_CONTENT_ROOT)
      .set(TEST_USER_ID_HEADER, testUserId)
      .expect(200);
  }

  async function callApiGetRootDirectoryExpectingOkAsContent(testUserId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(appFixture.getHttpServer())
      .get(API_CONTENT_ROOT)
      .set(TEST_USER_ID_HEADER, testUserId)
      .expect(200);

    return response.body as Content;
  }

  async function callApiCreateNoteExpectingCreated(
    testUserId: string,
    payload: { name: string; parentId: string }
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(appFixture.getHttpServer())
      .post(API_CONTENT)
      .set(TEST_USER_ID_HEADER, testUserId)
      .send(payload)
      .expect(201);
  }

  beforeAll(async () => {
    appFixture = new AppFixture();
    await appFixture.withFakeAuth().buildAndInit();
  });

  beforeEach(async () => {
    await appFixture.clearDatabase();
  });

  afterAll(async () => {
    await appFixture.close();
  });

  it(`GET ${API_CONTENT_ROOT} uses FakeAuthGuard user from header`, async () => {
    const response = await callGetApiContentRootExpectingOk(TEST_USER_ID);
    expect(response.body).toHaveProperty('ownerId', TEST_USER_ID);
  });

  it(`GET ${API_CONTENT_ROOT} creates the root directory if it does not exist yet`, async () => {
    const rootDirectory = await appFixture
      .getComponent(ContentRepository)
      .findRootDirectory(TEST_USER_ID);
    expect(rootDirectory).toBeNull();

    const response = await callGetApiContentRootExpectingOk(TEST_USER_ID);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('ownerId', TEST_USER_ID);
    expect(response.body).toHaveProperty('type', 'directory');
    expect(response.body).toHaveProperty('parentId', null);
  });

  it(`GET ${API_CONTENT_ROOT} is idempotent`, async () => {
    const firstResponseBody = await callApiGetRootDirectoryExpectingOkAsContent(TEST_USER_ID);
    const secondResponseBody = await callApiGetRootDirectoryExpectingOkAsContent(TEST_USER_ID);

    expect(secondResponseBody.id).toBe(firstResponseBody.id);
  });

  it(`POST ${API_CONTENT} creates a note (happy path)`, async () => {
    const rootDirectory = await callApiGetRootDirectoryExpectingOkAsContent(TEST_USER_ID);

    const response = await callApiCreateNoteExpectingCreated(TEST_USER_ID, {
      name: 'My Note',
      parentId: rootDirectory.id,
    });

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name', 'My Note');
    expect(response.body).toHaveProperty('type', 'note');
    expect(response.body).toHaveProperty('ownerId', TEST_USER_ID);
  });
});
