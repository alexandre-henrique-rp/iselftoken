import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { AdminSealsController } from './admin-seals.controller';
import { SealsController } from './seals.controller';
import { SealsService } from './seals.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SealsController, AdminSealsController],
  providers: [SealsService],
  exports: [SealsService],
})
export class SealsModule {}
