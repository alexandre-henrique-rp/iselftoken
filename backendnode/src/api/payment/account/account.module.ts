import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AuditModule } from 'src/common/audit/audit.module';
import { EfiModule } from '../efi/efi.module';

/**
 * AccountModule — Abertura de conta digital EFI Bank.
 *
 * Endpoints:
 * - POST /payment/account/open  — Solicita abertura de conta (auth required)
 * - GET  /payment/account       — Lista aberturas do usuário (auth required)
 * - POST /payment/account/webhook — Webhook EFI (sem auth)
 *
 * Usa in-memory Map para persistência (refere-se a EfiAccountOpening que
 * ainda não existe no schema.prisma principal — aguardando migration).
 * Quando o modelo for adicionado ao schema.prisma, substituir Map por Prisma.
 */
@Module({
  imports: [AuditModule, EfiModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
