import { Global, Module } from '@nestjs/common';
import { BackupInterceptor } from './backup.interceptor';
import { BackupService } from './backup.service';

@Global()
@Module({
  providers: [BackupService, BackupInterceptor],
  exports: [BackupService, BackupInterceptor],
})
export class BackupModule {}
