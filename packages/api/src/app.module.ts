import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth';

@Module({
  imports: [
    // The nestjs config support doesn't work with Firebase. We're keeping this for now because it can be useful if
    // running the app locally, outside Firebase Emulator.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
    }),
    HealthModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
