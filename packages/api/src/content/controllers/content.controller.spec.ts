import * as request from 'supertest';
import { AppFixture } from '../../test-helpers/app.fixture';
import { Content } from '../entities/content.entity';

describe('ContentController', () => {
  let appFixture: AppFixture;
  const testUserId = 'content-test-user';

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

  async function callGetRootContent(testUserId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(appFixture.getHttpServer())
      .get('/api/content/root')
      .set('X-Test-User-Id', testUserId)
      .expect(200);
  }

  it('GET /api/content/root uses FakeAuthGuard user from header', async () => {
    const response = await callGetRootContent(testUserId);
    expect(response.body).toHaveProperty('ownerId', testUserId);
  });

  it('GET /api/content/root creates the root directory if it does not exist yet', async () => {
    const rootDirectory = await appFixture.getRootDirectoryService().findRootDirectory(testUserId);
    expect(rootDirectory).toBeNull();

    const response = await callGetRootContent(testUserId);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('ownerId', testUserId);
    expect(response.body).toHaveProperty('type', 'directory');
    expect(response.body).toHaveProperty('parentId', null);
  });

  it('GET /api/content/root is idempotent', async () => {
    const firstResponseBody = (await callGetRootContent(testUserId)).body as Content;
    const secondResponseBody = (await callGetRootContent(testUserId)).body as Content;

    expect(secondResponseBody.id).toBe(firstResponseBody.id);
  });
});
