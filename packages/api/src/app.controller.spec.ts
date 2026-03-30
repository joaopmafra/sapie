import { Test, TestingModule } from '@nestjs/testing';
import { ConsoleLogger, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('AppController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      logger: new ConsoleLogger({ logLevels: ['error'] }),
    });
    await app.init();
  });

  it('should be using the correct environment', () => {
    expect(process.env.CURRENT_ENV).toBe('test-unit');
  });

  it('/api (GET)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(app.getHttpServer()).get('/api').expect(200).expect('Sapie API');
  });

  // cleans up resources; see https://www.google.com/search?q=nestjs+e2e+test+aftereach+app.close
  afterEach(async () => {
    await app.close();
  });
});
