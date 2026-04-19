import { Module } from '@nestjs/common';

import { FakeStorageReadController } from './fake-storage-read.controller';

@Module({
  controllers: [FakeStorageReadController],
})
export class FakeStorageModule {
  static isEnabled() {
    return !!process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  }
}
