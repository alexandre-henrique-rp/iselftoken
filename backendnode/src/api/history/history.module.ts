import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

/** Histórico/auditoria unificado (visão global admin/compliance). */
@Module({
  imports: [PrismaModule],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
