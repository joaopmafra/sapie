import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth';
import { ContentModule } from './content';

@Module({
  imports: [
    // https://docs.nestjs.com/techniques/configuration
    // https://stackoverflow.com/questions/63285055/nestjs-how-to-use-env-variables-in-main-app-module-file-for-database-connecti/63285574#63285574
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        /*`.env.${process.env.NODE_ENV}`, '.env'*/
      ],
    }),
    HealthModule,
    AuthModule,
    ContentModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
