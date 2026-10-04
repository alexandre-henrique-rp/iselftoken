import { Module } from '@nestjs/common';
import { DepoimentoService } from './depoimento.service';
import { DepoimentoController } from './depoimento.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DepoimentoController],
  providers: [DepoimentoService],
  exports: [DepoimentoService],
})
export class DepoimentoModule {}
