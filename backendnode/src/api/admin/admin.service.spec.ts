import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../common/audit/audit.service';
import { SessionService } from '../../auth/session/session.service';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SealsService } from '../seals/seals.service';
import { AdminService } from './admin.service';

/**
 * Testes unitários de AdminService.listUsers (endpoint GET /admin/users).
 *
 * Cobre:
 *  - Paginação básica (page, limit, total)
 *  - Filtro de busca (nome OU email, case insensitive)
 *  - Filtro de role
 *  - Filtro de status (active/suspended → isActive boolean)
 *  - Filtro de createdFrom (data ISO → createdAt >=)
 *  - Combinação de filtros (AND)
 *  - Select de campos: id, email, nome, role, isActive, createdAt, avatar
 *  - Order by createdAt desc
 *
 * Estes testes validam o contrato atual do AdminService e a consulta compatível
 * com o provider SQLite configurado no projeto.
 */
describe('AdminService.listUsers', () => {
  let service: AdminService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    // Cobertura mínima para o `createReviewDecision` chamado em
    // `updateStartupStatus` quando status = APPROVED/REJECTED. Sem este
    // mock o teste loga warning de "Cannot read 'create' of undefined".
    startupReviewDecision: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockSeals = {
    autoAssignVerified: jest.fn(),
  };

  const mockEmail = {
    sendRejectionNotification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SealsService, useValue: mockSeals },
        { provide: EmailService, useValue: mockEmail },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: SessionService,
          useValue: { refreshUserProfile: jest.fn().mockResolvedValue(0) },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  const stubEmpty = () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);
  };

  describe('paginação', () => {
    it('should return paginated list with default page=1 and limit=25', async () => {
      stubEmpty();
      const result = await service.listUsers({});

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 0,
        }),
      );
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.pagina).toBe(1);
    });

    it('should compute skip from page and limit', async () => {
      stubEmpty();
      await service.listUsers({ page: 3, limit: 10 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });
  });

  describe('filtro de busca (search)', () => {
    it('should match nome OR email with SQLite-compatible contains', async () => {
      stubEmpty();
      await service.listUsers({ search: 'joão' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { nome: { contains: 'joão' } },
              { email: { contains: 'joão' } },
            ],
          }),
        }),
      );
    });

    it('should not add OR clause when search is empty', async () => {
      stubEmpty();
      await service.listUsers({ search: '' });

      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeUndefined();
    });
  });

  describe('filtro de role', () => {
    it('should filter by role when provided', async () => {
      stubEmpty();
      await service.listUsers({ role: 'FOUNDER' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'FOUNDER' }),
        }),
      );
    });
  });

  describe('filtro de status', () => {
    it('should map status=active to isActive=true', async () => {
      stubEmpty();
      await service.listUsers({ status: 'active' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should map status=suspended to isActive=false', async () => {
      stubEmpty();
      await service.listUsers({ status: 'suspended' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('should not add isActive filter when status is empty/undefined', async () => {
      stubEmpty();
      await service.listUsers({});

      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.where.isActive).toBeUndefined();
    });
  });

  describe('filtro de createdFrom', () => {
    it('should filter createdAt >= parsed ISO date', async () => {
      stubEmpty();
      const dateStr = '2026-01-15';
      await service.listUsers({ createdFrom: dateStr });

      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.where.createdAt).toBeDefined();
      expect(call.where.createdAt.gte).toBeInstanceOf(Date);
      // Deve ser início do dia UTC
      const d = call.where.createdAt.gte as Date;
      expect(d.toISOString()).toMatch(/^2026-01-15T00:00:00/);
    });

    it('should ignore createdFrom when empty', async () => {
      stubEmpty();
      await service.listUsers({ createdFrom: '' });

      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.where.createdAt).toBeUndefined();
    });
  });

  describe('combinação de filtros (AND)', () => {
    it('should combine search + role + status + createdFrom', async () => {
      stubEmpty();
      await service.listUsers({
        search: 'maria',
        role: 'USER',
        status: 'active',
        createdFrom: '2026-01-01',
      });

      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.where.role).toBe('USER');
      expect(call.where.isActive).toBe(true);
      expect(call.where.OR).toBeDefined();
      expect(call.where.createdAt).toBeDefined();
    });
  });

  describe('filtro de KYC', () => {
    it('aplica o status KYC no where antes da paginação', async () => {
      stubEmpty();
      await service.listUsers({ kycStatus: 'PENDING' });

      const call = mockPrisma.user.findMany.mock.calls[0][0];
      const countCall = mockPrisma.user.count.mock.calls[0][0];
      expect(call.where.avatar).toEqual({ status: 'PENDING' });
      expect(countCall.where.avatar).toEqual({ status: 'PENDING' });
    });
  });

  describe('select de campos (precisa ter role + isActive + avatar.status)', () => {
    it('should select role, isActive, avatar status for frontend display', async () => {
      stubEmpty();
      await service.listUsers({});

      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.select.role).toBe(true);
      expect(call.select.isActive).toBe(true);
      expect(call.select.avatar).toEqual(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            url_sm: true,
            status: true,
          }),
        }),
      );
    });
  });

  describe('order by createdAt desc', () => {
    it('should order by createdAt desc', async () => {
      stubEmpty();
      await service.listUsers({});

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });
});

describe('AdminService.toggleUserStatus', () => {
  let service: AdminService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSeals = { autoAssignVerified: jest.fn() };
  const mockEmail = { sendRejectionNotification: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SealsService, useValue: mockSeals },
        { provide: EmailService, useValue: mockEmail },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: SessionService,
          useValue: { refreshUserProfile: jest.fn().mockResolvedValue(0) },
        },
      ],
    }).compile();
    service = module.get<AdminService>(AdminService);
  });

  it('should disable user when isActive=false', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 1, isActive: true });
    mockPrisma.user.update.mockResolvedValueOnce({
      id: 1,
      publicId: 'pub-1',
      email: 'a@b.com',
      nome: 'A',
      role: 'USER',
      isActive: false,
    });

    const result = await service.toggleUserStatus(1, false);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isActive: false },
      select: expect.any(Object),
    });
    expect(result.error).toBe(false);
    expect(result.data.isActive).toBe(false);
  });

  it('should enable user when isActive=true', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      isActive: false,
    });
    mockPrisma.user.update.mockResolvedValueOnce({
      id: 1,
      publicId: 'pub-1',
      email: 'a@b.com',
      nome: 'A',
      role: 'USER',
      isActive: true,
    });

    const result = await service.toggleUserStatus(1, true);

    expect(result.data.isActive).toBe(true);
  });

  it('should return 404 when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const result = await service.toggleUserStatus(999, false);

    expect(result.error).toBe(true);
    expect(result.codigo).toBe(404);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

/**
 * Testes de AdminService.updateStartupStatus — foco nos gates por fase:
 *
 *  - Fase 1 (Cadastro + Reserva)  → startup.status = APPROVED, NÃO abre campanha
 *  - Fase 2 (Edição Cadastro)    → startup.status = APPROVED, NÃO abre campanha
 *  - Fase 3 (Detalhes Captação)  → startup.status = APPROVED + SÓ abre campanha
 *    se (a) DRAFT preenchida E (b) COMPLIANCE_FEE PAID
 *  - Legacy (sem phase)          → comportamento legado (sempre tenta abrir)
 *
 * Auditoria é gravada em todos os casos de APPROVED/REJECTED.
 * Evento `startup.approved` só é emitido quando a campanha realmente abriu.
 * Caso contrário, emite `startup.phase_approved` com `campaignOpened: false`.
 */
describe('AdminService.updateStartupStatus (gate por fase)', () => {
  let service: AdminService;

  const mockPrisma: any = {
    startup: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    campaign: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
    },
    startupReviewDecision: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const mockSeals = {
    autoAssignVerified: jest.fn().mockResolvedValue(undefined),
    autoAssignStage: jest.fn().mockResolvedValue(undefined),
    autoAssignFastDeploy: jest.fn().mockResolvedValue(undefined),
  };
  const mockEmail = { sendRejectionNotification: jest.fn() };
  const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
  const mockEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SealsService, useValue: mockSeals },
        { provide: EmailService, useValue: mockEmail },
        { provide: AuditService, useValue: mockAudit },
        {
          provide: SessionService,
          useValue: { refreshUserProfile: jest.fn().mockResolvedValue(0) },
        },
        {
          provide: (await import('@nestjs/event-emitter')).EventEmitter2,
          useValue: mockEmitter,
        },
      ],
    }).compile();
    service = module.get<AdminService>(AdminService);

    mockPrisma.startup.findUnique.mockResolvedValue({
      id: 3,
      status: 'PENDING',
    });
    mockPrisma.startup.update.mockResolvedValue({ id: 3, status: 'APPROVED' });
  });

  describe('Fase 1 — Cadastro + Reserva', () => {
    it('APPROVED em fase 1: muda Startup.status mas NÃO abre campanha (gate por fase)', async () => {
      const res = await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 1,
      });

      expect(res.error).toBeFalsy();
      expect(mockPrisma.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 3 },
          data: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
      // Gate por fase: openCampaignOnApproval NÃO deve ser consultado
      expect(mockPrisma.campaign.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
      // Evento de fase (não o de captação liberada)
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'startup.phase_approved',
        expect.objectContaining({
          startupId: 3,
          phase: 1,
          campaignOpened: false,
        }),
      );
      expect(mockEmitter.emit).not.toHaveBeenCalledWith(
        'startup.approved',
        expect.anything(),
      );
    });
  });

  describe('Fase 2 — Edição do Cadastro', () => {
    it('APPROVED em fase 2: muda Startup.status mas NÃO abre campanha (gate por fase)', async () => {
      const res = await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 2,
      });

      expect(res.error).toBeFalsy();
      expect(mockPrisma.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 3 },
          data: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
      expect(mockPrisma.campaign.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'startup.phase_approved',
        expect.objectContaining({
          startupId: 3,
          phase: 2,
          campaignOpened: false,
        }),
      );
    });
  });

  describe('Fase 3 — Detalhes de Captação', () => {
    it('APPROVED em fase 3 com DRAFT preenchida + COMPLIANCE_FEE PAID (sem FAST_DEPLOY): AGENDA publicação (+24h), mantém DRAFT e emite startup.approved(scheduled)', async () => {
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null) // não há OPEN
        .mockResolvedValueOnce({
          id: 77,
          deadline: null,
          targetAmount: 500000,
          valuation: 5_000_000,
          tokenPrice: 40,
          totalTokens: 12500,
          fastDeploy: false,
        }); // DRAFT preenchida, sem Publicação Rápida
      mockPrisma.payment.findFirst.mockResolvedValueOnce({ id: 9 }); // COMPLIANCE_FEE PAID
      mockPrisma.campaign.update.mockResolvedValue({ id: 77 });

      const res = await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 3,
      });

      expect(res.error).toBeFalsy();
      // Agenda: grava scheduledPublishAt e NÃO abre OPEN.
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 77 },
          data: expect.objectContaining({
            scheduledPublishAt: expect.any(Date),
          }),
        }),
      );
      const updateCall = mockPrisma.campaign.update.mock.calls.find(
        (c: any) => c[0].where.id === 77,
      );
      expect(updateCall[0].data.status).toBeUndefined(); // continua DRAFT
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'startup.approved',
        expect.objectContaining({
          startupId: 3,
          fastDeploy: false,
          scheduled: true,
        }),
      );
    });

    it('APPROVED em fase 3 com FAST_DEPLOY=true: abre campanha IMEDIATAMENTE (OPEN) e emite startup.approved(fastDeploy)', async () => {
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null) // não há OPEN
        .mockResolvedValueOnce({
          id: 77,
          deadline: null,
          targetAmount: 500000,
          valuation: 5_000_000,
          tokenPrice: 40,
          totalTokens: 12500,
          fastDeploy: true,
        }); // DRAFT preenchida COM Publicação Rápida
      mockPrisma.payment.findFirst.mockResolvedValueOnce({ id: 9 }); // COMPLIANCE_FEE PAID
      mockPrisma.campaign.update.mockResolvedValue({ id: 77, status: 'OPEN' });

      const res = await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 3,
      });

      expect(res.error).toBeFalsy();
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 77 },
          data: expect.objectContaining({ status: 'OPEN' }),
        }),
      );
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'startup.approved',
        expect.objectContaining({
          startupId: 3,
          fastDeploy: true,
          scheduled: false,
        }),
      );
      expect(mockEmitter.emit).not.toHaveBeenCalledWith(
        'startup.phase_approved',
        expect.anything(),
      );
    });

    it('APPROVED em fase 3 com DRAFT vazia: NÃO abre campanha e emite startup.phase_approved', async () => {
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null) // não há OPEN
        .mockResolvedValueOnce({
          id: 77,
          deadline: null,
          targetAmount: null,
          valuation: null,
          tokenPrice: null,
          totalTokens: 0,
        }); // DRAFT vazia
      // Não deve nem consultar pagamento se a DRAFT está vazia

      const res = await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 3,
      });

      expect(res.error).toBeFalsy();
      expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'startup.phase_approved',
        expect.objectContaining({
          startupId: 3,
          phase: 3,
          campaignOpened: false,
          reason: 'draft_campaign_not_filled',
        }),
      );
      expect(mockEmitter.emit).not.toHaveBeenCalledWith(
        'startup.approved',
        expect.anything(),
      );
    });

    it('APPROVED em fase 3 com DRAFT preenchida mas COMPLIANCE_FEE não pago: NÃO abre campanha', async () => {
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 77,
          deadline: null,
          targetAmount: 500000,
          valuation: 5_000_000,
          tokenPrice: 40,
          totalTokens: 12500,
        });
      mockPrisma.payment.findFirst.mockResolvedValueOnce(null); // COMPLIANCE_FEE não PAID

      const res = await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 3,
      });

      expect(res.error).toBeFalsy();
      expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'startup.phase_approved',
        expect.objectContaining({
          startupId: 3,
          phase: 3,
          campaignOpened: false,
          reason: 'compliance_fee_not_paid',
        }),
      );
    });

    it('APPROVED em fase 3 idempotente: se já há campanha OPEN, não duplica e emite startup.approved', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 90 }); // já OPEN

      const res = await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 3,
      });

      expect(res.error).toBeFalsy();
      expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'startup.approved',
        expect.objectContaining({ startupId: 3 }),
      );
    });

    it('APPROVED em fase 3 sem DRAFT: NÃO quebra aprovação e emite phase_approved', async () => {
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null); // não há DRAFT

      const res = await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 3,
      });

      expect(res.error).toBeFalsy();
      expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'startup.phase_approved',
        expect.objectContaining({
          startupId: 3,
          phase: 3,
          campaignOpened: false,
          reason: 'no_draft_campaign',
        }),
      );
    });
  });

  // ─── BUG-FT-007 — Selos automáticos na aprovação ──────────────────────
  // Quando admin aprova Fase 3, o sistema deve auto-aplicar:
  //  - `startup_verificada` (sempre)
  //  - Selo de estágio (somente Fase 3 ou caso legado sem phase)
  //  - `lancamento` (somente quando campanha abriu OPEN com FAST_DEPLOY)

  describe('Selos automáticos (BUG-FT-007)', () => {
    it('Fase 1: chama APENAS autoAssignVerified (não chama autoAssignStage)', async () => {
      await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 1,
      });

      expect(mockSeals.autoAssignVerified).toHaveBeenCalledWith(3);
      expect(mockSeals.autoAssignStage).not.toHaveBeenCalled();
      expect(mockSeals.autoAssignFastDeploy).not.toHaveBeenCalled();
    });

    it('Fase 2: chama APENAS autoAssignVerified (não chama autoAssignStage)', async () => {
      await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 2,
      });

      expect(mockSeals.autoAssignVerified).toHaveBeenCalledWith(3);
      expect(mockSeals.autoAssignStage).not.toHaveBeenCalled();
      expect(mockSeals.autoAssignFastDeploy).not.toHaveBeenCalled();
    });

    it('Fase 3 + sem FAST_DEPLOY (scheduled +24h): chama autoAssignVerified + autoAssignStage, NÃO chama autoAssignFastDeploy', async () => {
      mockPrisma.startup.findUnique.mockResolvedValueOnce({
        id: 3,
        status: 'PENDING',
        estagio: 'tracao',
      });
      mockPrisma.startup.update.mockResolvedValueOnce({
        id: 3,
        status: 'APPROVED',
        estagio: 'tracao',
      });
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null) // não há OPEN
        .mockResolvedValueOnce({
          id: 77,
          deadline: null,
          targetAmount: 500000,
          valuation: 5_000_000,
          tokenPrice: 40,
          totalTokens: 12500,
          fastDeploy: false, // SEM FAST_DEPLOY
        });
      mockPrisma.payment.findFirst.mockResolvedValueOnce({ id: 9 });
      mockPrisma.campaign.update.mockResolvedValue({ id: 77 });

      await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 3,
      });

      expect(mockSeals.autoAssignVerified).toHaveBeenCalledWith(3);
      expect(mockSeals.autoAssignStage).toHaveBeenCalledWith(3, 'tracao');
      // Sem FAST_DEPLOY → sem selo de Lançamento (apenas agendado)
      expect(mockSeals.autoAssignFastDeploy).not.toHaveBeenCalled();
    });

    it('Fase 3 + FAST_DEPLOY: chama autoAssignVerified + autoAssignStage + autoAssignFastDeploy', async () => {
      mockPrisma.startup.findUnique.mockResolvedValueOnce({
        id: 3,
        status: 'PENDING',
        estagio: 'mvp',
      });
      mockPrisma.startup.update.mockResolvedValueOnce({
        id: 3,
        status: 'APPROVED',
        estagio: 'mvp',
      });
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null) // não há OPEN
        .mockResolvedValueOnce({
          id: 77,
          deadline: null,
          targetAmount: 500000,
          valuation: 5_000_000,
          tokenPrice: 40,
          totalTokens: 12500,
          fastDeploy: true, // COM FAST_DEPLOY
        });
      mockPrisma.payment.findFirst.mockResolvedValueOnce({ id: 9 });
      mockPrisma.campaign.update.mockResolvedValue({ id: 77, status: 'OPEN' });

      await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 3,
      });

      expect(mockSeals.autoAssignVerified).toHaveBeenCalledWith(3);
      expect(mockSeals.autoAssignStage).toHaveBeenCalledWith(3, 'mvp');
      // FAST_DEPLOY + campanha abriu → selo Lançamento aplicado
      expect(mockSeals.autoAssignFastDeploy).toHaveBeenCalledWith(3);
    });

    it('Fase 3 + FAST_DEPLOY mas DRAFT vazia: NÃO chama autoAssignFastDeploy (campanha não abriu)', async () => {
      mockPrisma.startup.findUnique.mockResolvedValueOnce({
        id: 3,
        status: 'PENDING',
        estagio: 'ideacao',
      });
      mockPrisma.startup.update.mockResolvedValueOnce({
        id: 3,
        status: 'APPROVED',
        estagio: 'ideacao',
      });
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 77,
          deadline: null,
          targetAmount: null,
          valuation: null,
          tokenPrice: null,
          totalTokens: 0,
          fastDeploy: true, // FAST_DEPLOY mas DRAFT vazia
        });
      // DRAFT vazia → campaignOpenResult.ok = false

      await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 3,
      });

      expect(mockSeals.autoAssignVerified).toHaveBeenCalledWith(3);
      expect(mockSeals.autoAssignStage).toHaveBeenCalledWith(3, 'ideacao');
      // DRAFT vazia → campaignOpenResult.ok=false → sem Lançamento
      expect(mockSeals.autoAssignFastDeploy).not.toHaveBeenCalled();
    });

    it('Legacy (sem phase): chama autoAssignVerified + autoAssignStage (preserva comportamento)', async () => {
      mockPrisma.startup.findUnique.mockResolvedValueOnce({
        id: 3,
        status: 'PENDING',
        estagio: 'breakeven',
      });
      mockPrisma.startup.update.mockResolvedValueOnce({
        id: 3,
        status: 'APPROVED',
        estagio: 'breakeven',
      });
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null); // não há DRAFT

      await service.updateStartupStatus(3, 'APPROVED');

      expect(mockSeals.autoAssignVerified).toHaveBeenCalledWith(3);
      expect(mockSeals.autoAssignStage).toHaveBeenCalledWith(3, 'breakeven');
      // Sem campaignOpenResult.ok → sem Lançamento
      expect(mockSeals.autoAssignFastDeploy).not.toHaveBeenCalled();
    });

    it('Falha em autoAssign* NÃO quebra a aprovação (best-effort)', async () => {
      mockSeals.autoAssignVerified.mockRejectedValueOnce(
        new Error('redis down'),
      );
      mockSeals.autoAssignStage.mockRejectedValueOnce(new Error('redis down'));

      // Mesmo com falhas nos selos, a aprovação deve retornar sucesso
      const res = await service.updateStartupStatus(3, 'APPROVED', undefined, {
        phase: 1,
      });
      expect(res.error).toBeFalsy();
      expect(mockPrisma.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });

    it('startup.estagio=null: autoAssignStage recebe null (não falha)', async () => {
      mockPrisma.startup.findUnique.mockResolvedValueOnce({
        id: 3,
        status: 'PENDING',
        estagio: null,
      });
      mockPrisma.startup.update.mockResolvedValueOnce({
        id: 3,
        status: 'APPROVED',
        estagio: null,
      });
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null); // sem DRAFT

      await service.updateStartupStatus(3, 'APPROVED', undefined, { phase: 3 });

      expect(mockSeals.autoAssignStage).toHaveBeenCalledWith(3, null);
    });
  });

  describe('Legacy (sem phase)', () => {
    it('APPROVED sem phase com DRAFT preenchida + COMPLIANCE_FEE PAID: abre campanha e emite startup.approved', async () => {
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null) // não há OPEN
        .mockResolvedValueOnce({
          id: 77,
          deadline: null,
          targetAmount: 500000,
          valuation: 5_000_000,
          tokenPrice: 40,
          totalTokens: 12500,
        });
      mockPrisma.payment.findFirst.mockResolvedValueOnce({ id: 9 });
      mockPrisma.campaign.update.mockResolvedValue({ id: 77, status: 'OPEN' });

      const res = await service.updateStartupStatus(3, 'APPROVED');

      expect(res.error).toBeFalsy();
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 77 } }),
      );
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'startup.approved',
        expect.objectContaining({ startupId: 3 }),
      );
    });

    it('APPROVED sem phase com DRAFT vazia: NÃO abre campanha (gate aplica mesmo sem phase)', async () => {
      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 77,
          deadline: null,
          targetAmount: 0,
          valuation: 0,
          tokenPrice: 0,
          totalTokens: 0,
        });

      const res = await service.updateStartupStatus(3, 'APPROVED');

      expect(res.error).toBeFalsy();
      expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'startup.phase_approved',
        expect.objectContaining({
          startupId: 3,
          phase: null,
          campaignOpened: false,
          reason: 'draft_campaign_not_filled',
        }),
      );
    });
  });

  describe('REJECTED', () => {
    it('REJECTED: não abre campanha nem emite startup.approved/phase_approved', async () => {
      const res = await service.updateStartupStatus(
        3,
        'REJECTED',
        'motivo qualquer',
      );

      expect(res.error).toBeFalsy();
      expect(mockPrisma.campaign.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
      // Não emite variantes de aprovação
      expect(mockEmitter.emit).not.toHaveBeenCalledWith(
        'startup.approved',
        expect.anything(),
      );
      expect(mockEmitter.emit).not.toHaveBeenCalledWith(
        'startup.phase_approved',
        expect.anything(),
      );
    });

    it('REJECTED: emite startup.rejected com phase + reason para notificar o founder (S34)', async () => {
      const res = await service.updateStartupStatus(
        3,
        'REJECTED',
        'Documentação incompleta — falta contrato social.',
        {
          phase: 2,
          adminUserId: 1,
          adminName: 'Alexandre Admin',
          adminEmail: 'admin@iselftoken.com',
          ip: null,
        },
      );

      expect(res.error).toBeFalsy();
      // S34: o listener `@OnEvent('startup.rejected')` em
      // StartupNotificationService.onStartupRejected depende desse evento
      // para enviar in-app + e-mail. Sem ele, founder fica sem feedback da
      // rejeição e não sabe que precisa corrigir.
      expect(mockEmitter.emit).toHaveBeenCalledWith('startup.rejected', {
        startupId: 3,
        phase: 2,
        reason: 'Documentação incompleta — falta contrato social.',
      });
    });

    it('REJECTED sem phase (legado) emite startup.rejected com phase null', async () => {
      const res = await service.updateStartupStatus(3, 'REJECTED', 'motivo');

      expect(res.error).toBeFalsy();
      expect(mockEmitter.emit).toHaveBeenCalledWith('startup.rejected', {
        startupId: 3,
        phase: null,
        reason: 'motivo',
      });
    });
  });
});

/**
 * Testes de getStartupPaymentStatus — foco no comprovante da Fase 3.
 *
 * Regra (pedido do produto): a Fase 3 exibe o pagamento da Taxa de Compliance
 * (COMPLIANCE_FEE) com valor original, desconto e valor pago; o status PAID
 * libera o botão "Aprovar Etapa 3" (unlocked=true).
 */
describe('AdminService.getStartupPaymentStatus', () => {
  let service: AdminService;

  const mockPrisma = {
    startup: { findUnique: jest.fn() },
    payment: { findMany: jest.fn() },
    startupReviewDecision: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SealsService, useValue: { autoAssignVerified: jest.fn() } },
        {
          provide: EmailService,
          useValue: { sendRejectionNotification: jest.fn() },
        },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: SessionService,
          useValue: { refreshUserProfile: jest.fn().mockResolvedValue(0) },
        },
      ],
    }).compile();
    service = module.get<AdminService>(AdminService);
  });

  it('Fase 3: retorna COMPLIANCE_FEE com valores e unlocked quando PAID', async () => {
    mockPrisma.startup.findUnique.mockResolvedValue({
      id: 24,
      campaigns: [{ id: 100 }],
    });
    const now = new Date('2026-09-20T10:00:00Z');
    const paidAt = new Date('2026-09-21T12:00:00Z');
    mockPrisma.payment.findMany.mockResolvedValue([
      {
        purpose: 'COMPLIANCE_FEE',
        status: 'PAID',
        createdAt: now,
        paidAt,
        amount: 900,
        originalAmount: 1000,
        discountAmount: 100,
        paidAmount: 900,
      },
    ]);

    const res = await service.getStartupPaymentStatus(24);
    const phase3 = (res.data as any).phases[3];

    expect(res.error).toBeFalsy();
    expect(phase3.gate).toBe('COMPLIANCE_FEE');
    expect(phase3.status).toBe('PAID');
    expect(phase3.unlocked).toBe(true);
    expect(phase3.originalAmount).toBe(1000);
    expect(phase3.discountAmount).toBe(100);
    expect(phase3.paidAmount).toBe(900);
    expect(phase3.paidAt).toEqual(paidAt);
  });

  it('Fase 3: COMPLIANCE_FEE PENDING não libera (unlocked=false) e sem desconto reporta 0', async () => {
    mockPrisma.startup.findUnique.mockResolvedValue({
      id: 24,
      campaigns: [{ id: 100 }],
    });
    mockPrisma.payment.findMany.mockResolvedValue([
      {
        purpose: 'COMPLIANCE_FEE',
        status: 'PENDING',
        createdAt: new Date('2026-09-20T10:00:00Z'),
        paidAt: null,
        amount: 1000,
        originalAmount: 1000,
        discountAmount: null,
        paidAmount: null,
      },
    ]);

    const res = await service.getStartupPaymentStatus(24);
    const phase3 = (res.data as any).phases[3];

    expect(phase3.unlocked).toBe(false);
    expect(phase3.reason).toContain('Taxa de Compliance');
    expect(phase3.originalAmount).toBe(1000);
    expect(phase3.discountAmount).toBe(0);
    // paidAmount cai no fallback para `amount` quando paidAmount é null.
    expect(phase3.paidAmount).toBe(1000);
  });
});
