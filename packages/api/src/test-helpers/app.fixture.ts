import { AppModule } from '../app.module';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { AuthGuard } from '../auth';
import { FakeAuthGuard } from './fake-auth.guard';
import { INestApplication, Type } from '@nestjs/common';
import { MillisecondLogger } from '../logger/millisecond.logger';
import { LoggerService } from '@nestjs/common/services/logger.service';
import { clearFirestoreData } from './firestore.helper';
import { applyHttpAppConfiguration } from '../common/http/apply-http-app-configuration';
import { Server } from 'node:http';

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
    applyHttpAppConfiguration(this.app);
    await this.app.init();
    await this.listen();
  }

  /**
   * Starts the server and sets the API_EXTERNAL_BASE_URL environment variable.
   */
  async listen() {
    await this.app.listen(0, '127.0.0.1');
    const server = this.app.getHttpServer() as Server;
    const addressInfo = server.address();
    if (!addressInfo || typeof addressInfo !== 'object')
      throw new Error('Could not get address info');
    process.env.API_EXTERNAL_BASE_URL = `http://${addressInfo.address}:${addressInfo.port}`;
  }

  async clearDatabase() {
    await clearFirestoreData();
  }

  async close() {
    await this.app.close();
  }

  getHttpServer() {
    // TODO: replace by "return this.app.getHttpServer() as Server;"
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.app.getHttpServer();
  }

  getComponent<T>(token: Type<T>): T {
    return this.testingModule.get(token);
  }
}
