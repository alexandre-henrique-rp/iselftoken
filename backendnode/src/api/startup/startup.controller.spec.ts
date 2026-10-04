import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthGuard } from '../../auth/auth.guard';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { SessionService } from '../../auth/session/session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StartupService } from './service/startup.service';
import { ValidateFundador } from './service/validate.fundador';
import { StartupController } from './startup.controller';

describe('StartupController', () => {
  let controller: StartupController;
  let startupService: {
    findPrivate: jest.Mock;
    findPreview: jest.Mock;
    findAuthenticatedMarketplace: jest.Mock;
  };
  let prisma: { startup: { findUnique: jest.Mock } };
  let events: { emit: jest.Mock };

  beforeEach(async () => {
    startupService = {
      findPrivate: jest.fn(),
      findPreview: jest.fn(),
      findAuthenticatedMarketplace: jest.fn(),
    };
    prisma = {
      startup: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, founderId: 42 }),
      },
    };
    events = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StartupController],
      providers: [
        {
          provide: StartupService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findPublic: jest.fn(),
            findPrivate: startupService.findPrivate,
            findPreview: startupService.findPreview,
            findAuthenticatedMarketplace:
              startupService.findAuthenticatedMarketplace,
            findOneAdmin: jest.fn(),
            update: jest.fn(),
            resubmit: jest.fn(),
            updateComplementary: jest.fn(),
            remove: jest.fn(),
            requestVerification: jest.fn(),
            findByMarketplaceTag: jest.fn(),
            findAllPublic: jest.fn(),
            findAllAdmin: jest.fn(),
            getFounderDashboardMetrics: jest.fn(),
            getFounderStartupOverview: jest.fn(),
            pauseRound: jest.fn(),
            cancelRound: jest.fn(),
            saveDraft: jest.fn(),
            getDraft: jest.fn(),
            deleteDraft: jest.fn(),
          },
        },
        {
          provide: ValidateFundador,
          useValue: {
            validate: jest.fn(),
            validateOrThrow: jest.fn(),
            validateFundadorPlan: jest.fn(),
          },
        },
        {
          provide: CookiesService,
          useValue: {},
        },
        {
          provide: SessionService,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: EventEmitter2,
          useValue: events,
        },
        {
          provide: Reflector,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<StartupController>(StartupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('encaminha a identidade ao detalhe privado owner/admin', async () => {
    const user = { id: 42, role: 'FOUNDER' } as any;
    startupService.findPrivate.mockResolvedValue({ error: false });

    await controller.findPrivate('startup-a', { user } as any);

    expect(startupService.findPrivate).toHaveBeenCalledWith('startup-a', user);
  });

  it('encaminha o preview ao owner sem exigir campanha OPEN', async () => {
    const user = { id: 42, role: 'FOUNDER' } as any;
    startupService.findPreview.mockResolvedValue({ error: false });

    await controller.findPreview('fintechpro', { user } as any);

    expect(startupService.findPreview).toHaveBeenCalledWith('fintechpro', user);
  });

  it('encaminha a consulta autenticada sem transformar o slug em identidade', async () => {
    startupService.findAuthenticatedMarketplace.mockResolvedValue({
      error: false,
    });

    await controller.findAuthenticatedMarketplace('startup-a');

    expect(startupService.findAuthenticatedMarketplace).toHaveBeenCalledWith(
      'startup-a',
    );
  });

  it('encaminha a ressubmissao para o fundador autenticado', async () => {
    const user = { id: 42, role: 'FOUNDER' } as any;
    const validateFundador = (controller as any).validateFundador;
    validateFundador.validateOrThrow.mockResolvedValue(undefined);

    await controller.resubmit('3', { user } as any);

    expect(validateFundador.validateOrThrow).toHaveBeenCalledWith(user);
    expect((controller as any).startupService.resubmit).toHaveBeenCalledWith(
      3,
      user,
    );
  });

  it('protege os dois detalhes autenticados com AuthGuard', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        StartupController.prototype.findPrivate,
      ),
    ).toEqual([AuthGuard]);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        StartupController.prototype.findAuthenticatedMarketplace,
      ),
    ).toEqual([AuthGuard]);
  });

  describe('completeStage2 / completeStage3 (B04)', () => {
    it('completeStage2 emite startup.stage2.completed para o owner', async () => {
      const user = { id: 42, role: 'FOUNDER' } as any;
      prisma.startup.findUnique.mockResolvedValueOnce({ id: 1, founderId: 42 });

      const result = await controller.completeStage2('1', { user } as any);

      expect(events.emit).toHaveBeenCalledWith('startup.stage2.completed', {
        startupId: 1,
      });
      expect(result.data).toEqual({
        startupId: 1,
        status: 'PENDING_COMPLIANCE_REVIEW',
      });
    });

    it('completeStage3 emite startup.stage3.completed para o owner (BUG-FT-004 B1)', async () => {
      // O listener onStage3Completed nunca era disparado porque nenhum código
      // emitia o evento. Este endpoint fecha o gap.
      const user = { id: 42, role: 'FOUNDER' } as any;
      prisma.startup.findUnique.mockResolvedValueOnce({ id: 7, founderId: 42 });

      const result = await controller.completeStage3('7', { user } as any);

      expect(events.emit).toHaveBeenCalledWith('startup.stage3.completed', {
        startupId: 7,
      });
      expect(result.data).toEqual({
        startupId: 7,
        status: 'PENDING_PHASE3_REVIEW',
      });
    });

    it('completeStage3 rejeita founder que não é dono', async () => {
      const user = { id: 99, role: 'FOUNDER' } as any;
      prisma.startup.findUnique.mockResolvedValueOnce({ id: 7, founderId: 42 });

      await expect(
        controller.completeStage3('7', { user } as any),
      ).rejects.toThrow(/Acesso não permitido/);

      expect(events.emit).not.toHaveBeenCalled();
    });

    it('completeStage3 retorna 404 quando startup não existe', async () => {
      const user = { id: 42, role: 'FOUNDER' } as any;
      prisma.startup.findUnique.mockResolvedValueOnce(null);

      await expect(
        controller.completeStage3('999', { user } as any),
      ).rejects.toThrow(/Startup não encontrada/);
    });

    it('completeStage3 protegido por AuthGuard', () => {
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          StartupController.prototype.completeStage3,
        ),
      ).toEqual([AuthGuard]);
    });
  });
});
