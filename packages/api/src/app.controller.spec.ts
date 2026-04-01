import * as request from 'supertest';
import { AppFixture } from './test-helpers/app.fixture';

describe('AppController', () => {
  let appFixture: AppFixture;

  beforeAll(async () => {
    appFixture = new AppFixture();
    await appFixture.withFakeAuth().buildAndInit();
  });

  it('should be using the correct environment', () => {
    expect(process.env.CURRENT_ENV).toBe('test-unit');
  });

  it('/api (GET)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(appFixture.getHttpServer()).get('/api').expect(200).expect('Sapie API');
  });

  afterAll(async () => {
    await appFixture.close();
  });
});
