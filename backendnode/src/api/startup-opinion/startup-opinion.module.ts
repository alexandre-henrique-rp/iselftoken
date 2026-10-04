import { Module } from '@nestjs/common';
import { StartupOpinionService } from './startup-opinion.service';
import { StartupOpinionController } from './startup-opinion.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StartupOpinionController],
  providers: [StartupOpinionService],
  exports: [StartupOpinionService],
})
export class StartupOpinionModule {}
