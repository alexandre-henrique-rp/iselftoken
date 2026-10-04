import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { AuditService } from '../../common/audit/audit.service';

/**
 * AdminWithdrawalsService
 *
 * Decide sobre saques (Withdrawal) solicitados por fundadores:
 *  - approve(id, adminId): REQUESTED → PROCESSING (admin assume execução)
 *  - reject(id, adminId):  REQUESTED → REJECTED  (recusa definitiva)
 *
 * Status flow (model Withdrawal):
 *   REQUESTED → PROCESSING → COMPLETED
 *                  ↓
 *               REJECTED
 *
 * Transições só partem de REQUESTED. Decisões são gravadas em `approvedBy`
 * (audit trail mínimo). Caso de borda PROCESSING → COMPLETED pertence a
 * outro fluxo (comprovante + txIdBancario) e fica para sprint futura.
 */
@Injectable()
export class AdminWithdrawalsService {
  private readonly logger = new Logger(AdminWithdrawalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async approve(id: number, adminId: number) {
    try {
      const existing = await this.prisma.withdrawal.findUnique({
        where: { id },
      });

      if (!existing) {
        return ResponseDto.error('Withdrawal não encontrado', 404, null);
      }
      if (existing.status !== 'REQUESTED') {
        return ResponseDto.error(
          `Transição inválida: status atual é ${existing.status}, esperado REQUESTED`,
          409,
          { code: 'INVALID_STATE', currentStatus: existing.status },
        );
      }

      const updated = await this.prisma.withdrawal.update({
        where: { id },
        data: { status: 'PROCESSING', approvedBy: adminId },
      });

      this.logger.log(
        `Withdrawal ${id} approved by admin ${adminId} → PROCESSING`,
      );

      await this.auditService.log({
        userId: adminId,
        action: 'WITHDRAWAL_APPROVED',
        entity: 'Withdrawal',
        entityId: String(id),
        oldValue: { status: existing.status, amount: existing.amount },
        newValue: { status: 'PROCESSING' },
      });

      return ResponseDto.success('Resgate aprovado', 200, updated);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error approving withdrawal ${id}: ${msg}`);
      return ResponseDto.error('Erro ao aprovar resgate', 500, error);
    }
  }

  async reject(id: number, adminId: number) {
    try {
      const existing = await this.prisma.withdrawal.findUnique({
        where: { id },
      });

      if (!existing) {
        return ResponseDto.error('Withdrawal não encontrado', 404, null);
      }
      if (existing.status !== 'REQUESTED') {
        return ResponseDto.error(
          `Transição inválida: status atual é ${existing.status}, esperado REQUESTED`,
          409,
          { code: 'INVALID_STATE', currentStatus: existing.status },
        );
      }

      const updated = await this.prisma.withdrawal.update({
        where: { id },
        data: { status: 'REJECTED', approvedBy: adminId },
      });

      this.logger.log(
        `Withdrawal ${id} rejected by admin ${adminId} → REJECTED`,
      );

      await this.auditService.log({
        userId: adminId,
        action: 'WITHDRAWAL_REJECTED',
        entity: 'Withdrawal',
        entityId: String(id),
        oldValue: { status: existing.status, amount: existing.amount },
        newValue: { status: 'REJECTED' },
      });

      return ResponseDto.success('Resgate rejeitado', 200, updated);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error rejecting withdrawal ${id}: ${msg}`);
      return ResponseDto.error('Erro ao rejeitar resgate', 500, error);
    }
  }
}
