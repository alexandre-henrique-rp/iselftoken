import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ResourceCategory } from '@prisma/client';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResourceAllocationDto } from '../dto/resource-allocation.dto';
import { CampaignResourceService } from './campaign-resource.service';

describe('CampaignResourceService', () => {
  let service: CampaignResourceService;
  let prisma: {
    campaign: { findUnique: jest.Mock; findFirst: jest.Mock };
    campaignResourceAllocation: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let transactionClient: {
    campaignResourceAllocation: {
      deleteMany: jest.Mock;
      create: jest.Mock;
    };
  };

  const CAMPAIGN_ID = 10;
  const OWNER_ID = 42;
  // Soma 100% e respeita o cap FUNDADOR <= 20% (CASE.md [Captação]).
  const allocations: ResourceAllocationDto[] = [
    { categoria: ResourceCategory.FUNDADOR, percentual: 20 },
    { categoria: ResourceCategory.DESENVOLVIMENTO, percentual: 40 },
    { categoria: ResourceCategory.MARKETING, percentual: 20 },
    { categoria: ResourceCategory.RESERVA_CAIXA, percentual: 20 },
  ];
  const owner = { id: OWNER_ID, role: 'FOUNDER' } as PayloadEntity;
  const admin = { id: 99, role: 'ADMIN' } as PayloadEntity;

  beforeEach(async () => {
    transactionClient = {
      campaignResourceAllocation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({
          id: 1,
          campaignId: CAMPAIGN_ID,
          categoria: ResourceCategory.FUNDADOR,
          percentual: 20,
          descricaoCustomizada: null,
        }),
      },
    };

    prisma = {
      campaign: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      campaignResourceAllocation: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(
        (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignResourceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CampaignResourceService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('retorna apenas os campos públicos para campanha publicada', async () => {
    prisma.campaign.findFirst.mockResolvedValue({ id: CAMPAIGN_ID });
    prisma.campaignResourceAllocation.findMany.mockResolvedValue([
      {
        categoria: ResourceCategory.FUNDADOR,
        percentual: 20,
        descricaoCustomizada: null,
      },
    ]);

    const result = await service.findByCampaign(CAMPAIGN_ID);

    expect(result).toEqual([
      {
        categoria: ResourceCategory.FUNDADOR,
        percentual: 20,
        descricaoCustomizada: null,
      },
    ]);
    expect(prisma.campaign.findFirst).toHaveBeenCalledWith({
      where: {
        id: CAMPAIGN_ID,
        status: { in: ['OPEN', 'FUNDED', 'PAID_OUT'] },
      },
      select: { id: true },
    });
    expect(prisma.campaignResourceAllocation.findMany).toHaveBeenCalledWith({
      where: { campaignId: CAMPAIGN_ID },
      select: {
        categoria: true,
        percentual: true,
        descricaoCustomizada: true,
      },
      orderBy: { categoria: 'asc' },
    });
  });

  it('bloqueia leitura pública de campanha não publicada', async () => {
    prisma.campaign.findFirst.mockResolvedValue(null);

    await expect(service.findByCampaign(CAMPAIGN_ID)).rejects.toMatchObject({
      response: { message: 'CAMPAIGN_NOT_PUBLIC' },
    });
    expect(prisma.campaignResourceAllocation.findMany).not.toHaveBeenCalled();
  });

  it('permite leitura privada ao founder owner de campanha não publicada', async () => {
    prisma.campaign.findUnique.mockResolvedValue({
      id: CAMPAIGN_ID,
      status: 'DRAFT',
      startup: { founderId: OWNER_ID },
    });
    prisma.campaignResourceAllocation.findMany.mockResolvedValue(allocations);

    const result = await service.findByCampaignForUser(CAMPAIGN_ID, owner);

    expect(result).toEqual(allocations);
    expect(prisma.campaign.findUnique).toHaveBeenCalledWith({
      where: { id: CAMPAIGN_ID },
      include: {
        startup: { select: { founderId: true, status: true } },
        payments: {
          where: { purpose: 'COMPLIANCE_FEE', status: 'PAID' },
          select: { id: true },
          take: 1,
        },
      },
    });
  });

  it('bloqueia leitura privada de founder sem ownership', async () => {
    prisma.campaign.findUnique.mockResolvedValue({
      id: CAMPAIGN_ID,
      startup: { founderId: 777 },
    });

    await expect(
      service.findByCampaignForUser(CAMPAIGN_ID, owner),
    ).rejects.toMatchObject({ response: { message: 'NOT_OWNER' } });
    expect(prisma.campaignResourceAllocation.findMany).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'FINANCEIRO', 'COMPLIANCE'])(
    'permite leitura privada ao papel %s',
    async (role) => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        startup: { founderId: 777 },
      });

      await service.findByCampaignForUser(CAMPAIGN_ID, {
        id: 99,
        role,
      } as PayloadEntity);

      expect(prisma.campaignResourceAllocation.findMany).toHaveBeenCalledTimes(
        1,
      );
    },
  );
  it('permite ao founder da startup substituir as alocações', async () => {
    prisma.campaign.findUnique.mockResolvedValue({
      id: CAMPAIGN_ID,
      status: 'DRAFT',
      startup: { founderId: OWNER_ID },
    });

    const result = await service.replaceAll(CAMPAIGN_ID, allocations, owner);

    expect(result).toHaveLength(allocations.length);
    expect(prisma.campaign.findUnique).toHaveBeenCalledWith({
      where: { id: CAMPAIGN_ID },
      include: {
        startup: { select: { founderId: true, status: true } },
        payments: {
          where: { purpose: 'COMPLIANCE_FEE', status: 'PAID' },
          select: { id: true },
          take: 1,
        },
      },
    });
    expect(
      transactionClient.campaignResourceAllocation.deleteMany,
    ).toHaveBeenCalledWith({ where: { campaignId: CAMPAIGN_ID } });
  });

  it('bloqueia founder de outra startup antes de alterar o banco', async () => {
    prisma.campaign.findUnique.mockResolvedValue({
      id: CAMPAIGN_ID,
      startup: { founderId: 777 },
    });

    await expect(
      service.replaceAll(CAMPAIGN_ID, allocations, owner),
    ).rejects.toMatchObject({ response: { message: 'NOT_OWNER' } });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(
      transactionClient.campaignResourceAllocation.deleteMany,
    ).not.toHaveBeenCalled();
  });

  it('permite ADMIN alterar recursos de campanha de outra startup', async () => {
    prisma.campaign.findUnique.mockResolvedValue({
      id: CAMPAIGN_ID,
      status: 'DRAFT',
      startup: { founderId: 777 },
    });

    await service.replaceAll(CAMPAIGN_ID, allocations, admin);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(
      transactionClient.campaignResourceAllocation.deleteMany,
    ).toHaveBeenCalledTimes(1);
  });

  it.each(['FINANCEIRO', 'COMPLIANCE', 'USER'])(
    'bloqueia %s ao tentar alterar recursos de outra startup',
    async (role) => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        startup: { founderId: 777 },
      });

      await expect(
        service.replaceAll(CAMPAIGN_ID, allocations, {
          id: 99,
          role,
        } as PayloadEntity),
      ).rejects.toMatchObject({ response: { message: 'NOT_OWNER' } });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(
        transactionClient.campaignResourceAllocation.deleteMany,
      ).not.toHaveBeenCalled();
    },
  );

  it('retorna 404 e não inicia transação para campanha inexistente', async () => {
    prisma.campaign.findUnique.mockResolvedValue(null);

    await expect(
      service.replaceAll(CAMPAIGN_ID, allocations, owner),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Cap FUNDADOR <= 20% (CASE.md [Captação] Alocação de Recursos)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('cap FUNDADOR <= 20%', () => {
    const draftCampaign = {
      id: CAMPAIGN_ID,
      status: 'DRAFT',
      startup: { founderId: OWNER_ID },
    };

    it('aceita alocação com FUNDADOR = 20% (limite máximo permitido)', async () => {
      prisma.campaign.findUnique.mockResolvedValue(draftCampaign);

      const valid: ResourceAllocationDto[] = [
        { categoria: ResourceCategory.FUNDADOR, percentual: 20 },
        { categoria: ResourceCategory.DESENVOLVIMENTO, percentual: 50 },
        { categoria: ResourceCategory.MARKETING, percentual: 20 },
        { categoria: ResourceCategory.RESERVA_CAIXA, percentual: 10 },
      ];

      await expect(
        service.replaceAll(CAMPAIGN_ID, valid, owner),
      ).resolves.toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejeita FUNDADOR = 21% com código FUNDADOR_PERCENTUAL_EXCEEDS_MAX', async () => {
      prisma.campaign.findUnique.mockResolvedValue(draftCampaign);

      const invalid: ResourceAllocationDto[] = [
        { categoria: ResourceCategory.FUNDADOR, percentual: 21 },
        { categoria: ResourceCategory.DESENVOLVIMENTO, percentual: 49 },
        { categoria: ResourceCategory.MARKETING, percentual: 20 },
        { categoria: ResourceCategory.RESERVA_CAIXA, percentual: 10 },
      ];

      await expect(
        service.replaceAll(CAMPAIGN_ID, invalid, owner),
      ).rejects.toMatchObject({
        response: {
          code: 'FUNDADOR_PERCENTUAL_EXCEEDS_MAX',
          maxAllowed: 20,
          provided: 21,
        },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita FUNDADOR = 100% (cenário histórico — legado)', async () => {
      prisma.campaign.findUnique.mockResolvedValue(draftCampaign);

      const invalid: ResourceAllocationDto[] = [
        { categoria: ResourceCategory.FUNDADOR, percentual: 100 },
      ];

      await expect(
        service.replaceAll(CAMPAIGN_ID, invalid, owner),
      ).rejects.toMatchObject({
        response: { code: 'FUNDADOR_PERCENTUAL_EXCEEDS_MAX', provided: 100 },
      });
    });

    it('valida o cap ANTES da checagem de soma=100 (mensagem correta mesmo com soma válida)', async () => {
      prisma.campaign.findUnique.mockResolvedValue(draftCampaign);

      // Soma = 101 (falharia em "soma=100") MAS a falha do FUNDADOR ocorre
      // primeiro no nosso código, garantindo que a mensagem de erro é
      // específica e não genérica.
      const invalid: ResourceAllocationDto[] = [
        { categoria: ResourceCategory.FUNDADOR, percentual: 50 },
        { categoria: ResourceCategory.DESENVOLVIMENTO, percentual: 51 },
      ];

      await expect(
        service.replaceAll(CAMPAIGN_ID, invalid, owner),
      ).rejects.toMatchObject({
        response: { code: 'FUNDADOR_PERCENTUAL_EXCEEDS_MAX' },
      });
    });
  });
});
