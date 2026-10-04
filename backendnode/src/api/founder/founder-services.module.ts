import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FounderServicesController } from './founder-services.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FounderServicesController],
})
export class FounderServicesModule {}
