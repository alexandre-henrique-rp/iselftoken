import { Test, TestingModule } from '@nestjs/testing';
import { PayoutAuditService } from './payout-audit.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('PayoutAuditService (S1-T10)', () => {
  let service: PayoutAuditService;
  let prisma: { auditLog: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = { auditLog: { create: jest.fn().mockResolvedValue({ id: 1 }) } };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutAuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(PayoutAuditService);
  });

  it('grava action/entity/entityId + actorId + actorRole em newValue', async () => {
    await service.record({
      action: 'PAYOUT_FINALIZE',
      entity: 'Repasse',
      entityId: 10,
      actorId: 7,
      actorRole: 'COMPLIANCE',
      details: { numeroParcelas: 24 },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 7,
        action: 'PAYOUT_FINALIZE',
        entity: 'Repasse',
        entityId: '10',
        newValue: expect.objectContaining({
          actorRole: 'COMPLIANCE',
          numeroParcelas: 24,
        }),
      }),
    });
  });

  it('inclui justification quando fornecida (rejeição)', async () => {
    await service.record({
      action: 'PAYOUT_INSTALLMENT_REJECT',
      entity: 'Installment',
      entityId: 3,
      actorId: 5,
      actorRole: 'FINANCEIRO',
      justification: 'Relatório do mês incompleto',
    });
    const arg = prisma.auditLog.create.mock.calls[0][0];
    expect(arg.data.newValue.justification).toBe('Relatório do mês incompleto');
  });

  it('aceita actorId null (ação de sistema)', async () => {
    await service.record({
      action: 'PAYOUT_INSTALLMENT_MARK_PAID',
      entity: 'Installment',
      entityId: 3,
      actorId: null,
    });
    const arg = prisma.auditLog.create.mock.calls[0][0];
    expect(arg.data.userId).toBeNull();
    expect(arg.data.newValue.actorRole).toBeNull();
  });

  it('não propaga erro se o create falhar (auditoria não bloqueia negócio)', async () => {
    prisma.auditLog.create.mockRejectedValueOnce(new Error('db down'));
    await expect(
      service.record({
        action: 'PAYOUT_EXTEND',
        entity: 'Repasse',
        entityId: 1,
        actorId: 1,
      }),
    ).resolves.toBeUndefined();
  });
});
