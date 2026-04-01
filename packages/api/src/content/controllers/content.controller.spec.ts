import * as request from 'supertest';
import { AppFixture } from '../../test-helpers/app.fixture';

describe('ContentController', () => {
  let appFixture: AppFixture;

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

  it('/api/content/root (GET) uses FakeAuthGuard user from header', async () => {
    const testUserId = 'content-test-user';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(appFixture.getHttpServer())
      .get('/api/content/root')
      .set('X-Test-User-Id', testUserId)
      .expect(200);

    expect(response.body).toHaveProperty('ownerId', testUserId);
    expect(response.body).toHaveProperty('type', 'directory');
    expect(response.body).toHaveProperty('parentId', null);
  });
});
