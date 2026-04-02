import { AppModule } from '../app.module';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { AuthGuard } from '../auth';
import { FakeAuthGuard } from './fake-auth.guard';
import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { MillisecondLogger } from '../logger/millisecond.logger';
import { LoggerService } from '@nestjs/common/services/logger.service';
import { clearFirestoreData } from './firestore.helper';

export class AppFixture {
  protected testingModuleBuilder: TestingModuleBuilder;
  protected testingModule: TestingModule;
  protected logger: LoggerService;
  protected app: INestApplication;

  createTestingModuleBuilder() {
    this.testingModuleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });
    return this;
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
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
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

  getComponent<T>(token: Type<T>): T {
    return this.testingModule.get(token);
  }
}
