import * as request from 'supertest';
import { AppFixture } from '../test-helpers/app.fixture';

describe('HealthController', () => {
  let appFixture: AppFixture;

  beforeAll(async () => {
    appFixture = new AppFixture();
    await appFixture.createTestingModuleBuilder().withFakeAuth().buildAndInit();
  });

  afterAll(async () => {
    await appFixture.close();
  });

  it('/api/health (GET)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(appFixture.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});
