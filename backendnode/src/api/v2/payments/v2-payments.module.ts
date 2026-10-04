/**
 * @description Payments V2 Hub Module (PRD "Nova Central de Pagamentos").
 *
 * Este modulo expoe as rotas v2 em PARALELO ao `PaymentModule` legado.
 * Estrategia documentada no AGENTS.md do modulo de pagamento:
 * coexistir ambos ate a Fase 3 (deprecation + remocao das rotas v1).
 *
 * Services consumidos:
 * - PaymentService (existente) — operacoes de Payment + webhook
 * - FundTransferService (existente) — payouts / B12
 *
 * Webhooks EFI são recebidos pelo EfiController do PaymentModule.
 */
import { Module } from '@nestjs/common';
import { PaymentModule } from 'src/api/payment/payment.module';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CheckoutController } from './controllers/checkout.controller';
import { TransactionsController } from './controllers/transactions.controller';
import { PayoutsController } from './controllers/payouts.controller';
import { V2PaymentsService } from './services/v2-payments.service';

@Module({
  imports: [AuthModule, PrismaModule, PaymentModule],
  controllers: [CheckoutController, TransactionsController, PayoutsController],
  providers: [V2PaymentsService],
  exports: [V2PaymentsService],
})
export class V2PaymentsModule {}
