/**
 * Specs do InstallmentRequestService (FIN-10).
 *
 * Regra: o fundador cria/re-submete InstallmentRequest para cada parcela.
 * - Soma allocationPercents = 100% (tolerancia 0.01).
 * - Parcela N-1 deve estar COMPLETED (sequencial). Parcela 1 e livre.
 * - bankInfoSnapshot vem da Startup.
 * - Resubmit incrementa attemptNumber.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { AllocationConverterService } from 'src/common/allocation/allocation-converter.service';
import { SlaCalculatorService } from 'src/common/sla/sla-calculator.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInstallmentRequestDto } from './dto/create-installment-request.dto';
import { InstallmentRequestService } from './installment-requests.service';

const validPercents = {
  marketing: 14.285,
  desenvolvimento: 14.285,
  infraestrutura: 14.285,
  pessoal: 14.285,
  juridico: 14.285,
  operacional: 14.29,
  reservaCaixa: 14.285,
};

describe('InstallmentRequestService', () => {
  let service: InstallmentRequestService;
  let prisma: any;
  let sla: any;
  let converter: any;

  const USER_ID = 100;
  const STARTUP_ID = 1;
  const CAMPAIGN_ID = 50;
  const INSTALLMENT_ID = 10;

  const baseStartup = {
    id: STARTUP_ID,
    founderId: USER_ID,
    banco: '001',
    agencia: '0001',
    conta: '12345-6',
    digito: 'X',
    tipo_conta: 'corrente',
    pix_key: 'founder@startup.com',
    titular: 'Founder',
    documento_titular: '***.***.***-**',
  };

  const baseInstallment = {
    id: INSTALLMENT_ID,
    repasseId: 5,
    numero: 1,
    valor: 33333.33,
    status: 'AWAITING_REQUEST',
    repasse: {
      id: 5,
      campaignId: 50,
      status: 'CONFIGURED',
      installments: [],
    },
  };

  const baseCreateDto: CreateInstallmentRequestDto = {
    allocationPercents: validPercents,
    observacao: 'OK',
  };

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn() },
      installment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      installmentRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      campaign: { findUnique: jest.fn() },
      repasse: { findFirst: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    sla = {
      addBusinessDays: jest
        .fn()
        .mockReturnValue(new Date('2026-12-31T12:00:00')),
      businessDaysBetween: jest.fn().mockReturnValue(3),
    };
    converter = {
      validatePercentsSum: jest.fn().mockReturnValue(true),
      percentsToValues: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstallmentRequestService,
        { provide: PrismaService, useValue: prisma },
        { provide: SlaCalculatorService, useValue: sla },
        { provide: AllocationConverterService, useValue: converter },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(InstallmentRequestService);
  });

  // ============ createOrResubmit ============

  describe('createOrResubmit', () => {
    it('cria InstallmentRequest valido (soma=100%, parcela 1 sem N-1)', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.installment.findUnique.mockResolvedValue(baseInstallment);
      prisma.installmentRequest.findFirst.mockResolvedValue(null);
      prisma.installmentRequest.create.mockResolvedValue({
        id: 200,
        installmentId: INSTALLMENT_ID,
        founderUserId: USER_ID,
        startupId: STARTUP_ID,
        allocationPercents: validPercents,
        bankInfoSnapshot: {
          banco: '001',
          agencia: '0001',
          conta: '12345-6',
          digito: 'X',
          tipo_conta: 'corrente',
          pix_key: 'founder@startup.com',
        },
        valorSolicitado: 33333.33,
        status: 'REQUESTED',
        submittedAt: new Date(),
        tsLimitePagamento: new Date('2026-12-31T12:00:00'),
        attemptNumber: 1,
      });
      prisma.installment.update.mockResolvedValue({
        ...baseInstallment,
        status: 'REQUESTED',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.createOrResubmit(
        STARTUP_ID,
        INSTALLMENT_ID,
        baseCreateDto,
        USER_ID,
        false,
      );

      expect(result.id).toBe(200);
      expect(result.status).toBe('REQUESTED');
      expect(result.attemptNumber).toBe(1);
      expect(prisma.installment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: INSTALLMENT_ID },
          data: { status: 'REQUESTED' },
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'INSTALLMENT_REQUEST_CREATED',
          }),
        }),
      );
      expect(sla.addBusinessDays).toHaveBeenCalled();
    });

    it('rejeita soma != 100% (tolerancia 0.01)', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.installment.findUnique.mockResolvedValue(baseInstallment);
      converter.validatePercentsSum.mockReturnValue(false);

      await expect(
        service.createOrResubmit(
          STARTUP_ID,
          INSTALLMENT_ID,
          baseCreateDto,
          USER_ID,
          false,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.installmentRequest.create).not.toHaveBeenCalled();
    });

    it('rejeita se installment N-1 nao esta COMPLETED', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.installment.findUnique.mockResolvedValue({
        ...baseInstallment,
        numero: 2,
      });
      prisma.installmentRequest.findFirst.mockResolvedValue(null);
      prisma.installment.findFirst.mockResolvedValue({
        numero: 1,
        status: 'AWAITING_REQUEST',
      });

      await expect(
        service.createOrResubmit(
          STARTUP_ID,
          INSTALLMENT_ID,
          baseCreateDto,
          USER_ID,
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('aceita parcela 1 sem validar N-1', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.installment.findUnique.mockResolvedValue(baseInstallment); // numero=1
      prisma.installmentRequest.findFirst.mockResolvedValue(null);
      prisma.installmentRequest.create.mockResolvedValue({
        id: 1,
        status: 'REQUESTED',
      });
      prisma.installment.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.createOrResubmit(
          STARTUP_ID,
          INSTALLMENT_ID,
          baseCreateDto,
          USER_ID,
          false,
        ),
      ).resolves.toBeDefined();
      expect(prisma.installment.findFirst).not.toHaveBeenCalled();
    });

    it('resubmit: incrementa attemptNumber e atualiza', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.installment.findUnique.mockResolvedValue(baseInstallment);
      prisma.installmentRequest.findFirst.mockResolvedValue({
        id: 999,
        installmentId: INSTALLMENT_ID,
        status: 'REJECTED',
        attemptNumber: 1,
      });
      prisma.installmentRequest.update.mockResolvedValue({
        id: 999,
        status: 'REQUESTED',
        attemptNumber: 2,
      });
      prisma.installment.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.createOrResubmit(
        STARTUP_ID,
        INSTALLMENT_ID,
        baseCreateDto,
        USER_ID,
        true,
      );

      expect(result.attemptNumber).toBe(2);
      expect(prisma.installmentRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 999 },
          data: expect.objectContaining({ attemptNumber: 2 }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'INSTALLMENT_REQUEST_RESUBMITTED',
          }),
        }),
      );
    });

    it('snapshot bankInfoSnapshot inclui dados bancarios da Startup', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.installment.findUnique.mockResolvedValue(baseInstallment);
      prisma.installmentRequest.findFirst.mockResolvedValue(null);
      prisma.installmentRequest.create.mockImplementation((args: any) => {
        // Valida que snapshot foi passado
        expect(args.data.bankInfoSnapshot.banco).toBe('001');
        expect(args.data.bankInfoSnapshot.agencia).toBe('0001');
        expect(args.data.bankInfoSnapshot.conta).toBe('12345-6');
        expect(args.data.bankInfoSnapshot.pix_key).toBe('founder@startup.com');
        return Promise.resolve({ id: 1, status: 'REQUESTED' });
      });
      prisma.installment.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await service.createOrResubmit(
        STARTUP_ID,
        INSTALLMENT_ID,
        baseCreateDto,
        USER_ID,
        false,
      );
    });

    it('409 quando existe REQUESTED e isCreate=true', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.installment.findUnique.mockResolvedValue(baseInstallment);
      prisma.installmentRequest.findFirst.mockResolvedValue({
        id: 999,
        status: 'REQUESTED',
      });

      await expect(
        service.createOrResubmit(
          STARTUP_ID,
          INSTALLMENT_ID,
          baseCreateDto,
          USER_ID,
          false,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('403 quando founder nao e owner da Startup', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        ...baseStartup,
        founderId: 999, // outro user
      });

      await expect(
        service.createOrResubmit(
          STARTUP_ID,
          INSTALLMENT_ID,
          baseCreateDto,
          USER_ID,
          false,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('404 quando installment nao existe', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.installment.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrResubmit(
          STARTUP_ID,
          INSTALLMENT_ID,
          baseCreateDto,
          USER_ID,
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita status installment != AWAITING_REQUEST/REJECTED', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.installment.findUnique.mockResolvedValue({
        ...baseInstallment,
        status: 'COMPLETED',
      });

      await expect(
        service.createOrResubmit(
          STARTUP_ID,
          INSTALLMENT_ID,
          baseCreateDto,
          USER_ID,
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    // ============ FIN-11 §8.2 — Relatorio do Mes ============
    describe('relatorio do mes (FIN-11)', () => {
      it('persiste os 5 campos do relatorio (mensagem, uso, lucro, marco, descricao)', async () => {
        prisma.startup.findUnique.mockResolvedValue(baseStartup);
        prisma.installment.findUnique.mockResolvedValue(baseInstallment);
        prisma.installmentRequest.findFirst.mockResolvedValue(null);
        prisma.installmentRequest.create.mockImplementation((args: any) => {
          // Cada campo do relatorio deve ser persistido.
          expect(args.data.mensagemInvestidores).toBe('Mes de marcos.');
          expect(args.data.usoRecurso).toBe('Captacao para ads');
          expect(args.data.teveLucro).toBe(true);
          expect(args.data.marcoAlcancado).toBe(true);
          expect(args.data.marcoDescricao).toBe(
            'Beta fechada com 100 usuarios',
          );
          return Promise.resolve({
            id: 1,
            status: 'REQUESTED',
            attemptNumber: 1,
          });
        });
        prisma.installment.update.mockResolvedValue({});
        prisma.auditLog.create.mockResolvedValue({});

        const dto: CreateInstallmentRequestDto = {
          ...baseCreateDto,
          mensagemInvestidores: 'Mes de marcos.',
          usoRecurso: 'Captacao para ads',
          teveLucro: true,
          marcoAlcancado: true,
          marcoDescricao: 'Beta fechada com 100 usuarios',
        };

        await service.createOrResubmit(
          STARTUP_ID,
          INSTALLMENT_ID,
          dto,
          USER_ID,
          false,
        );

        expect(prisma.installmentRequest.create).toHaveBeenCalled();
      });

      it('aceita relatorio sem nenhum campo preenchido (opcional)', async () => {
        prisma.startup.findUnique.mockResolvedValue(baseStartup);
        prisma.installment.findUnique.mockResolvedValue(baseInstallment);
        prisma.installmentRequest.findFirst.mockResolvedValue(null);
        prisma.installmentRequest.create.mockImplementation((args: any) => {
          // Trim converte string vazia em null. Boolean null/undefined ficam null.
          expect(args.data.mensagemInvestidores).toBeNull();
          expect(args.data.usoRecurso).toBeNull();
          expect(args.data.teveLucro).toBeNull();
          expect(args.data.marcoAlcancado).toBeNull();
          expect(args.data.marcoDescricao).toBeNull();
          return Promise.resolve({ id: 1, status: 'REQUESTED' });
        });
        prisma.installment.update.mockResolvedValue({});
        prisma.auditLog.create.mockResolvedValue({});

        await expect(
          service.createOrResubmit(
            STARTUP_ID,
            INSTALLMENT_ID,
            baseCreateDto, // sem nenhum campo do relatorio
            USER_ID,
            false,
          ),
        ).resolves.toBeDefined();
      });

      it('rejeita marcoDescricao sem marcoAlcancado=true (cross-field)', async () => {
        prisma.startup.findUnique.mockResolvedValue(baseStartup);
        prisma.installment.findUnique.mockResolvedValue(baseInstallment);

        const dto: CreateInstallmentRequestDto = {
          ...baseCreateDto,
          marcoDescricao: 'Beta fechada',
          marcoAlcancado: false, // <-- inconsistencia
        };

        await expect(
          service.createOrResubmit(
            STARTUP_ID,
            INSTALLMENT_ID,
            dto,
            USER_ID,
            false,
          ),
        ).rejects.toThrow(/marcoDescricao exige marcoAlcancado=true/);
      });

      it('rejeita marcoAlcancado=true sem marcoDescricao (cross-field)', async () => {
        prisma.startup.findUnique.mockResolvedValue(baseStartup);
        prisma.installment.findUnique.mockResolvedValue(baseInstallment);

        const dto: CreateInstallmentRequestDto = {
          ...baseCreateDto,
          marcoAlcancado: true,
          marcoDescricao: '   ', // so espacos
        };

        await expect(
          service.createOrResubmit(
            STARTUP_ID,
            INSTALLMENT_ID,
            dto,
            USER_ID,
            false,
          ),
        ).rejects.toThrow(/marcoAlcancado=true exige marcoDescricao/);
      });

      it('resubmit: campos do relatorio sao imutaveis quando undefined (preserva valor)', async () => {
        prisma.startup.findUnique.mockResolvedValue(baseStartup);
        prisma.installment.findUnique.mockResolvedValue(baseInstallment);
        prisma.installmentRequest.findFirst.mockResolvedValue({
          id: 999,
          installmentId: INSTALLMENT_ID,
          status: 'REJECTED',
          attemptNumber: 1,
        });
        prisma.installmentRequest.update.mockImplementation((args: any) => {
          // Campos nao foram enviados -> nao devem aparecer no payload update
          expect(args.data.mensagemInvestidores).toBeUndefined();
          expect(args.data.usoRecurso).toBeUndefined();
          expect(args.data.teveLucro).toBeUndefined();
          expect(args.data.marcoAlcancado).toBeUndefined();
          expect(args.data.marcoDescricao).toBeUndefined();
          // Apenas allocationPercents, observacao e bank sao atualizados
          expect(args.data.allocationPercents).toBeDefined();
          expect(args.data.observacao).toBe('OK');
          return Promise.resolve({
            id: 999,
            status: 'REQUESTED',
            attemptNumber: 2,
          });
        });
        prisma.installment.update.mockResolvedValue({});
        prisma.auditLog.create.mockResolvedValue({});

        // Resubmit sem campos do relatorio no payload
        await service.createOrResubmit(
          STARTUP_ID,
          INSTALLMENT_ID,
          baseCreateDto,
          USER_ID,
          true, // isResubmit
        );
      });

      it('resubmit: atualiza mensagemInvestidores quando enviado', async () => {
        prisma.startup.findUnique.mockResolvedValue(baseStartup);
        prisma.installment.findUnique.mockResolvedValue(baseInstallment);
        prisma.installmentRequest.findFirst.mockResolvedValue({
          id: 999,
          installmentId: INSTALLMENT_ID,
          status: 'REJECTED',
          attemptNumber: 1,
        });
        prisma.installmentRequest.update.mockImplementation((args: any) => {
          expect(args.data.mensagemInvestidores).toBe('Nova mensagem');
          return Promise.resolve({ id: 999, status: 'REQUESTED' });
        });
        prisma.installment.update.mockResolvedValue({});
        prisma.auditLog.create.mockResolvedValue({});

        await service.createOrResubmit(
          STARTUP_ID,
          INSTALLMENT_ID,
          { ...baseCreateDto, mensagemInvestidores: 'Nova mensagem' },
          USER_ID,
          true,
        );
      });
    });
  });

  // ============ getDashboard ============

  describe('getDashboard', () => {
    it('retorna dashboard consolidado com KPIs', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.repasse.findFirst.mockResolvedValue({
        id: 5,
        valorTotalCaptacao: 400000,
        numeroParcelas: 12,
        installments: [
          { id: 1, numero: 1, valor: 33333.33, status: 'COMPLETED' },
          { id: 2, numero: 2, valor: 33333.33, status: 'REQUESTED' },
        ],
      });
      prisma.installmentRequest.findFirst.mockResolvedValue(null);
      prisma.installmentRequest.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(STARTUP_ID, USER_ID);

      expect(result.repasse).not.toBeNull();
      expect(result.repasse!.id).toBe(5);
      expect(result.kpis.valorTotal).toBe(400000);
      expect(result.kpis.valorPago).toBe(33333.33);
      expect(result.kpis.valorPendente).toBe(33333.33);
      expect(result.kpis.proximaParcela).not.toBeNull();
      expect(result.kpis.proximaParcela!.numero).toBe(2);
      expect(result.installments).toHaveLength(2);
    });

    it('retorna diasRestantesSLA quando current REQUESTED', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.repasse.findFirst.mockResolvedValue({
        id: 5,
        valorTotalCaptacao: 400000,
        numeroParcelas: 12,
        installments: [
          { id: 1, numero: 1, valor: 33333.33, status: 'COMPLETED' },
          { id: 2, numero: 2, valor: 33333.33, status: 'REQUESTED' },
        ],
      });
      prisma.installmentRequest.findFirst.mockResolvedValue({
        id: 50,
        status: 'REQUESTED',
        submittedAt: new Date('2026-12-01T12:00:00'),
      });
      prisma.installmentRequest.findMany.mockResolvedValue([]);
      sla.businessDaysBetween.mockReturnValue(3);

      const result = await service.getDashboard(STARTUP_ID, USER_ID);
      expect(result.kpis.diasRestantesSLA).toBe(3);
    });

    it('403 quando founder nao e owner', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        ...baseStartup,
        founderId: 999,
      });

      await expect(service.getDashboard(STARTUP_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============ getDashboardByCampaign ============

  describe('getDashboardByCampaign', () => {
    const baseCampaign = {
      id: CAMPAIGN_ID,
      startupId: STARTUP_ID,
      startup: {
        id: STARTUP_ID,
        founderId: USER_ID,
        nome: 'Acme LTDA',
      },
    };

    it('retorna dashboard consolidado com KPIs ancorado ao campaignId', async () => {
      prisma.campaign.findUnique.mockResolvedValue(baseCampaign);
      prisma.repasse.findFirst.mockResolvedValue({
        id: 5,
        campaignId: CAMPAIGN_ID,
        valorTotalCaptacao: 400000,
        numeroParcelas: 12,
        installments: [
          { id: 1, numero: 1, valor: 33333.33, status: 'COMPLETED' },
          { id: 2, numero: 2, valor: 33333.33, status: 'AWAITING_REQUEST' },
        ],
      });
      prisma.installmentRequest.findFirst.mockResolvedValue(null);
      prisma.installmentRequest.findMany.mockResolvedValue([]);

      const result = await service.getDashboardByCampaign(CAMPAIGN_ID, USER_ID);

      // Deve ter carregado pelo campaignId (chave do repaginamento)
      expect(prisma.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: CAMPAIGN_ID },
        select: expect.any(Object),
      });
      // Repasse deve ter sido filtrado por campaignId (repasse.campaignId === campaignId)
      expect(result.repasse).not.toBeNull();
      expect(result.repasse!.id).toBe(5);
      expect(result.kpis.valorTotal).toBe(400000);
      expect(result.kpis.valorPago).toBe(33333.33);
      expect(result.kpis.valorPendente).toBe(0);
      expect(result.kpis.proximaParcela).not.toBeNull();
      expect(result.kpis.proximaParcela!.numero).toBe(2);
      // Startup summary deve estar populado (header do front usa)
      expect(result.startup).toEqual({ id: STARTUP_ID, nome: 'Acme LTDA' });
      expect(result.installments).toHaveLength(2);
      expect(result.ultimasSolicitacoes).toEqual([]);
    });

    it('filtra repasse pelo campaignId exato (NÃO pega de outras campanhas da mesma startup)', async () => {
      prisma.campaign.findUnique.mockResolvedValue(baseCampaign);
      prisma.repasse.findFirst.mockResolvedValue({
        id: 99,
        campaignId: CAMPAIGN_ID,
        valorTotalCaptacao: 100000,
        numeroParcelas: 6,
        installments: [],
      });
      prisma.installmentRequest.findFirst.mockResolvedValue(null);
      prisma.installmentRequest.findMany.mockResolvedValue([]);

      await service.getDashboardByCampaign(CAMPAIGN_ID, USER_ID);

      expect(prisma.repasse.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaign: expect.objectContaining({
              startupId: STARTUP_ID,
              id: CAMPAIGN_ID,
            }),
          }),
        }),
      );
    });

    it('retorna diasRestantesSLA quando current REQUESTED', async () => {
      prisma.campaign.findUnique.mockResolvedValue(baseCampaign);
      prisma.repasse.findFirst.mockResolvedValue({
        id: 5,
        campaignId: CAMPAIGN_ID,
        valorTotalCaptacao: 400000,
        numeroParcelas: 12,
        installments: [
          { id: 1, numero: 1, valor: 33333.33, status: 'COMPLETED' },
          { id: 2, numero: 2, valor: 33333.33, status: 'REQUESTED' },
        ],
      });
      prisma.installmentRequest.findFirst.mockResolvedValue({
        id: 50,
        status: 'REQUESTED',
        submittedAt: new Date('2026-12-01T12:00:00'),
      });
      prisma.installmentRequest.findMany.mockResolvedValue([]);
      sla.businessDaysBetween.mockReturnValue(3);

      const result = await service.getDashboardByCampaign(CAMPAIGN_ID, USER_ID);
      expect(result.kpis.diasRestantesSLA).toBe(3);
    });

    it('retorna estado vazio quando NAO ha repasse configurado para a campanha', async () => {
      prisma.campaign.findUnique.mockResolvedValue(baseCampaign);
      prisma.repasse.findFirst.mockResolvedValue(null);

      const result = await service.getDashboardByCampaign(CAMPAIGN_ID, USER_ID);

      expect(result.repasse).toBeNull();
      expect(result.startup).toEqual({ id: STARTUP_ID, nome: 'Acme LTDA' });
      expect(result.installments).toEqual([]);
      expect(result.kpis).toEqual({
        valorTotal: 0,
        valorPago: 0,
        valorPendente: 0,
        proximaParcela: null,
        diasRestantesSLA: null,
      });
      expect(result.ultimasSolicitacoes).toEqual([]);
    });

    it('404 quando campaign nao existe', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.getDashboardByCampaign(CAMPAIGN_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('403 quando founder NAO e owner da startup da campanha', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        ...baseCampaign,
        startup: { ...baseCampaign.startup, founderId: 999 },
      });

      await expect(
        service.getDashboardByCampaign(CAMPAIGN_ID, USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
