import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { AuthGuard } from '../../auth';
import { FakeAuthGuard } from '../../test-helpers/fake-auth.guard';

describe('ContentController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useClass(FakeAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/content/root (GET) uses FakeAuthGuard user from header', async () => {
    const testUserId = 'content-test-user';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get('/api/content/root')
      .set('X-Test-User-Id', testUserId)
      .expect(200);

    expect(response.body).toHaveProperty('ownerId', testUserId);
    expect(response.body).toHaveProperty('type', 'directory');
    expect(response.body).toHaveProperty('parentId', null);
  });
});
