import { AppModule } from '../app.module';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { AuthGuard } from '../auth';
import { FakeAuthGuard } from './fake-auth.guard';
import { INestApplication } from '@nestjs/common';
import { MillisecondLogger } from '../logger/millisecond.logger';
import { LoggerService } from '@nestjs/common/services/logger.service';
import { clearFirestoreData } from './firestore.helper';

export class AppFixture {
  testingModuleBuilder: TestingModuleBuilder;
  testingModule: TestingModule;
  logger: LoggerService;
  app: INestApplication;

  constructor() {
    this.testingModuleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });
  }

  withFakeAuth() {
    this.testingModuleBuilder = this.testingModuleBuilder
      .overrideGuard(AuthGuard)
      .useClass(FakeAuthGuard);
    return this;
  }

  withLogger() {
    this.logger = new MillisecondLogger();
    return this;
  }

  async buildAndInit() {
    this.testingModule = await this.testingModuleBuilder.compile();
    this.app = this.testingModule.createNestApplication({
      logger: this.logger ?? undefined,
    });
    await this.app.init();
  }

  async clearDatabase() {
    await clearFirestoreData();
  }

  async close() {
    await this.app.close();
  }

  getHttpServer() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.app.getHttpServer();
  }
}
