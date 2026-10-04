/**
 * InstallmentRequestsModule (FIN-10).
 *
 * Modulo do Fundador para criar/re-submeter InstallmentRequest e consultar
 * dashboard do Repasse.
 *
 * Dependencias:
 * - PrismaModule (DB)
 * - AuthModule (AuthGuard)
 * - RepassesModule (para servicos compartilhados — futuro)
 * - TransparencyModule (TransparencyAutoPostService lanca eventos no FIN-09)
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { RepassesModule } from 'src/api/repasses/repasses.module';
import { TransparencyModule } from 'src/api/transparency/transparency.module';
import { InstallmentRequestController } from './installment-requests.controller';
import { InstallmentRequestService } from './installment-requests.service';
import { SlaCalculatorService } from 'src/common/sla/sla-calculator.service';
import { AllocationConverterService } from 'src/common/allocation/allocation-converter.service';

@Module({
  imports: [PrismaModule, AuthModule, RepassesModule, TransparencyModule],
  controllers: [InstallmentRequestController],
  providers: [
    InstallmentRequestService,
    SlaCalculatorService,
    AllocationConverterService,
  ],
  exports: [
    InstallmentRequestService,
    SlaCalculatorService,
    AllocationConverterService,
  ],
})
export class InstallmentRequestsModule {}
