/**
 * Specs T036 (B14) - Notificacao de reprovacao compliance.
 */
import { Test } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SealsService } from '../seals/seals.service';
import { EmailService } from '../../email/email.service';
import { AuditService } from '../../common/audit/audit.service';
import { SessionService } from '../../auth/session/session.service';

jest.mock('@sentry/nestjs', () => ({
  Sentry: { startSpan: jest.fn((_o: any, fn: any) => fn()) },
}));

describe('AdminService.decideStartup (T036)', () => {
  let service: AdminService;
  let prisma: any;
  let email: { sendRejectionNotification: jest.Mock };

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn(), update: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    email = {
      sendRejectionNotification: jest.fn().mockResolvedValue({ success: true }),
    };
    const m = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: SealsService, useValue: { autoAssignVerified: jest.fn() } },
        { provide: EmailService, useValue: email },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: SessionService,
          useValue: { refreshUserProfile: jest.fn().mockResolvedValue(0) },
        },
      ],
    }).compile();
    service = m.get(AdminService);
  });

  it('1. REJECTED sem reason -> 400 REASON_REQUIRED', async () => {
    const r: any = await service.decideStartup(1, 'REJECTED', '');
    expect(r.codigo).toBe(400);
    expect(r.detalhe?.code).toBe('REASON_REQUIRED');
  });

  it('2. REJECTED com reason > 500 chars -> 400 REASON_TOO_LONG (LGPD)', async () => {
    const long = 'a'.repeat(501);
    const r: any = await service.decideStartup(1, 'REJECTED', long);
    expect(r.codigo).toBe(400);
    expect(r.detalhe?.code).toBe('REASON_TOO_LONG');
    expect(r.detalhe?.maxLength).toBe(500);
  });

  it('3. REJECTED com reason <= 500 -> atualiza + audit log + email', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      id: 1,
      nome: 'Startup X',
      founder: { id: 42, email: 'founder@x.com', nome: 'Founder X' },
    });
    prisma.startup.update.mockResolvedValueOnce({ id: 1, status: 'REJECTED' });
    prisma.auditLog.create.mockResolvedValueOnce({ id: 1 });

    const r: any = await service.decideStartup(
      1,
      'REJECTED',
      'Documentos insuficientes',
      { id: 99 },
      '/founder/startup/edit',
    );

    expect(r.codigo).toBe(200);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'COMPLIANCE_REJECT',
          entity: 'startup',
          entityId: '1',
          newValue: expect.objectContaining({
            reason: 'Documentos insuficientes',
            redirectPath: '/founder/startup/edit',
          }),
        }),
      }),
    );
    expect(email.sendRejectionNotification).toHaveBeenCalledWith(
      'founder@x.com',
      expect.objectContaining({
        founderName: 'Founder X',
        startupName: 'Startup X',
        reason: 'Documentos insuficientes',
      }),
    );
  });

  it('4. APPROVED nao envia email de reprovacao', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      id: 1,
      nome: 'Startup X',
      founder: { id: 42, email: 'founder@x.com', nome: 'Founder X' },
    });
    prisma.startup.update.mockResolvedValueOnce({ id: 1, status: 'APPROVED' });

    await service.decideStartup(1, 'APPROVED', undefined);

    expect(email.sendRejectionNotification).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('5. founder sem email -> erro gracioso (nao bloqueia)', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      id: 1,
      nome: 'Startup X',
      founder: { id: 42, email: null, nome: 'Founder X' },
    });
    prisma.startup.update.mockResolvedValueOnce({ id: 1, status: 'REJECTED' });

    const r: any = await service.decideStartup(1, 'REJECTED', 'Teste');
    expect(r.codigo).toBe(200);
    expect(email.sendRejectionNotification).not.toHaveBeenCalled();
  });
});
