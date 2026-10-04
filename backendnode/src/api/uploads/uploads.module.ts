/**
 * Módulo de uploads.
 *
 * Orquestra storage provider, processamento síncrono, quotas e cleanup.
 * O domínio de uploads não registra producer ou consumer de filas.
 *
 * @module UploadsModule
 */
import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageProviderModule } from '../../common/storage/storage-provider.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserPlanHelper } from './helpers/user-plan.helper';
import { CleanupJob } from './jobs/cleanup.job';
import { MulterConfigService } from './multer-config.service';
import { ImageProcessorService } from './services/image-processor.service';
import { QuotaService } from './services/quota.service';
import { VariantGeneratorService } from './services/variant-generator.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    MulterModule.register({
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB global limit
      },
    }),
    forwardRef(() => StorageProviderModule),
  ],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    MulterConfigService,
    CleanupJob,
    ImageProcessorService,
    VariantGeneratorService,
    QuotaService,
    UserPlanHelper,
  ],
  exports: [UploadsService, QuotaService, UserPlanHelper],
})
export class UploadsModule {}
