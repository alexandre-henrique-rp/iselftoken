/**
 * Specs para CampaignsCrudService - leituras publicas (findAll, findOne, getCheckoutData).
 * Migrado do antigo campaigns.service.spec.ts. Comportamento preservado (S01.2a).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { CampaignsCrudService } from './campaigns-crud.service';

describe('CampaignsCrudService', () => {
  let service: CampaignsCrudService;
  let prisma: {
    campaign: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      campaign: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    const m: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsCrudService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = m.get(CampaignsCrudService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('1. sem filtros: pagina 1, limite 25, ordenado por createdAt desc', async () => {
      const rows = [
        { id: 1, title: 'A', startup: {} },
        { id: 2, title: 'B', startup: {} },
      ];
      prisma.campaign.findMany.mockResolvedValueOnce(rows);
      prisma.campaign.count.mockResolvedValueOnce(2);

      const r = await service.findAll({});

      expect(r.codigo).toBe(200);
      expect(r.data).toEqual(rows);
      expect(r.total).toBe(2);
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['OPEN', 'FUNDED', 'PAID_OUT'] } },
          take: 25,
          skip: 0,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('2. com search (case-insensitive em title via LIKE default SQLite)', async () => {
      prisma.campaign.findMany.mockResolvedValueOnce([]);
      prisma.campaign.count.mockResolvedValueOnce(0);

      await service.findAll({ search: 'foo' });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { in: ['OPEN', 'FUNDED', 'PAID_OUT'] },
            title: { contains: 'foo' },
          },
        }),
      );
    });

    it('2b. com search com trim defensivo (espaços à frente são removidos)', async () => {
      prisma.campaign.findMany.mockResolvedValueOnce([]);
      prisma.campaign.count.mockResolvedValueOnce(0);

      await service.findAll({ search: '  foo  ' });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'foo' },
          }),
        }),
      );
    });

    it('3. com status filter', async () => {
      prisma.campaign.findMany.mockResolvedValueOnce([]);
      prisma.campaign.count.mockResolvedValueOnce(0);

      await service.findAll({ status: 'OPEN' as any });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'OPEN' },
        }),
      );
    });

    it('4. ignora status não público e mantém a allowlist', async () => {
      prisma.campaign.findMany.mockResolvedValueOnce([]);
      prisma.campaign.count.mockResolvedValueOnce(0);

      await service.findAll({ status: 'DRAFT' as any });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['OPEN', 'FUNDED', 'PAID_OUT'] } },
        }),
      );
    });

    it('5. paginacao customizada', async () => {
      prisma.campaign.findMany.mockResolvedValueOnce([]);
      prisma.campaign.count.mockResolvedValueOnce(0);

      await service.findAll({ page: 3, limit: 10 });

      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('1. retorna somente a projeção pública com equity, progress e remainingTokens', async () => {
      prisma.campaign.findFirst.mockResolvedValueOnce({
        id: 1,
        title: 'C1',
        status: 'OPEN',
        targetAmount: 100000,
        minInvestment: 100,
        valuation: 1000000,
        tokenPrice: 200,
        tokenSellPrice: 200,
        totalTokens: 1000,
        tokensSold: 250,
        deadline: new Date('2026-12-31'),
        startup: { nome: 'Startup', slug: 'startup', area_atuacao: 'tech' },
        investments: [{ id: 99, amount: 1000, status: 'CONFIRMED' }],
        tokens: [{ id: 'token-1', hash: 'secret-hash' }],
        cnpj: '12345678000195',
      });

      const r = await service.findOne(1);

      expect(prisma.campaign.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, status: { in: ['OPEN', 'FUNDED', 'PAID_OUT'] } },
          select: expect.objectContaining({
            id: true,
            title: true,
            status: true,
            startup: expect.objectContaining({
              select: expect.objectContaining({
                nome: true,
                slug: true,
                logo: expect.any(Object),
              }),
            }),
          }),
        }),
      );
      expect(r.codigo).toBe(200);
      expect(r.data).toMatchObject({
        id: 1,
        equity: '10.00%',
        progress: '25.0%',
        remainingTokens: 750,
      });
      expect(r.data).not.toHaveProperty('investments');
      expect(r.data).not.toHaveProperty('tokens');
      expect(r.data).not.toHaveProperty('cnpj');
      expect(r.data!.startup).not.toHaveProperty('cnpj');
      expect(r.data!.startup).not.toHaveProperty('razao_social');
    });

    it.each(['DRAFT', 'PAUSED', 'CLOSED'])(
      '3. status nao publico %s resulta em 404',
      async () => {
        prisma.campaign.findFirst.mockResolvedValueOnce(null);

        const r = await service.findOne(1);

        expect(r.codigo).toBe(404);
        expect(prisma.campaign.findFirst).toHaveBeenLastCalledWith(
          expect.objectContaining({
            where: { id: 1, status: { in: ['OPEN', 'FUNDED', 'PAID_OUT'] } },
          }),
        );
      },
    );
  });

  describe('getCheckoutData', () => {
    it('1. campaign OPEN -> 200 com dados de checkout', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        title: 'C1',
        targetAmount: 100000,
        minInvestment: 100,
        valuation: 1000000,
        tokenPrice: 200,
        tokenSellPrice: 200,
        totalTokens: 1000,
        tokensSold: 0,
        deadline: new Date('2026-12-31'),
        status: 'OPEN',
        dataLancamentoRodada: null,
        objetivoCaptacao: 'obj',
        oQueEsperaAlcancar: 'alc',
        participacaoLucros: false,
        faturamentoMinimoLucros: null,
        beneficiosAdicionais: false,
        beneficiosDescricao: null,
        problema: 'p',
        solucao: 's',
        modeloReceita: 'mr',
        diferencial: 'd',
        mercadoAlvo: 'ma',
        sociosCount: 2,
        dedicacao: 'total',
        compradores: 'c',
        investimentoPrevio: 'ip',
        concorrencia: 'conc',
        startup: {
          nome: 'Startup',
          slug: 's',
          area_atuacao: 'tech',
          logo: { url_sm: 'x' },
        },
      });

      const r = await service.getCheckoutData(1);

      expect(r.codigo).toBe(200);
      expect(r.data).toMatchObject({
        id: 1,
        price: 200,
        equity: '10.00%',
        paymentMethods: ['PIX', 'CREDIT_CARD'],
      });
    });

    it('2. campaign nao OPEN -> 400 com mensagem especifica', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'CLOSED',
      });

      const r = await service.getCheckoutData(1);

      expect(r.codigo).toBe(400);
      expect(r.error).toBe(true);
      expect(r.message).toContain('Apenas campanhas OPEN');
    });

    it('3. campaign inexistente -> 404', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce(null);

      const r = await service.getCheckoutData(999);

      expect(r.codigo).toBe(404);
      expect(r.error).toBe(true);
    });

    it('4. warning quando faturamentoMinimoLucros setado sem participacaoLucros', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        title: 'C1',
        targetAmount: 100000,
        minInvestment: 100,
        valuation: 1000000,
        tokenPrice: 200,
        tokenSellPrice: 200,
        totalTokens: 1000,
        tokensSold: 0,
        deadline: new Date('2026-12-31'),
        status: 'OPEN',
        dataLancamentoRodada: null,
        objetivoCaptacao: null,
        oQueEsperaAlcancar: null,
        participacaoLucros: false,
        faturamentoMinimoLucros: 500000,
        beneficiosAdicionais: false,
        beneficiosDescricao: null,
        problema: null,
        solucao: null,
        modeloReceita: null,
        diferencial: null,
        mercadoAlvo: null,
        sociosCount: null,
        dedicacao: null,
        compradores: null,
        investimentoPrevio: null,
        concorrencia: null,
        startup: {
          nome: 'S',
          slug: 's',
          area_atuacao: 'tech',
          logo: { url_sm: 'x' },
        },
      });

      const r = await service.getCheckoutData(1);

      expect(r.codigo).toBe(200);
      expect(r.data!.warnings).toBeDefined();
      expect((r.data!.warnings as string[])[0]).toContain(
        'faturamentoMinimoLucros',
      );
    });

    it('5. S01.2b: price usa tokenSellPrice (snapshot ADR-008) ao inves de tokenPrice legado', async () => {
      // tokenPrice legado = 999 (errado), tokenSellPrice snapshot = 100 (correto)
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        title: 'C1',
        targetAmount: 100000,
        minInvestment: 100,
        valuation: 1000000,
        tokenPrice: 999,
        tokenSellPrice: 100,
        totalTokens: 1000,
        tokensSold: 0,
        deadline: new Date('2026-12-31'),
        status: 'OPEN',
        dataLancamentoRodada: null,
        objetivoCaptacao: null,
        oQueEsperaAlcancar: null,
        participacaoLucros: false,
        faturamentoMinimoLucros: null,
        beneficiosAdicionais: false,
        beneficiosDescricao: null,
        problema: null,
        solucao: null,
        modeloReceita: null,
        diferencial: null,
        mercadoAlvo: null,
        sociosCount: null,
        dedicacao: null,
        compradores: null,
        investimentoPrevio: null,
        concorrencia: null,
        startup: {
          nome: 'S',
          slug: 's',
          area_atuacao: 'tech',
          logo: { url_sm: 'x' },
        },
      });

      const r = await service.getCheckoutData(1);

      expect(r.codigo).toBe(200);
      // Deve usar tokenSellPrice (100), nao tokenPrice legado (999)
      expect(r.data).toMatchObject({
        price: 100,
        tokenPrice: 100,
      });
    });

    it('6. S01.2b: fallback para tokenPrice quando tokenSellPrice eh null (campanha pre-migration)', async () => {
      // tokenSellPrice null (campanha pre-S01.2b), tokenPrice legado = 50
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        title: 'C1',
        targetAmount: 100000,
        minInvestment: 100,
        valuation: 1000000,
        tokenPrice: 50,
        tokenSellPrice: null,
        totalTokens: 1000,
        tokensSold: 0,
        deadline: new Date('2026-12-31'),
        status: 'OPEN',
        dataLancamentoRodada: null,
        objetivoCaptacao: null,
        oQueEsperaAlcancar: null,
        participacaoLucros: false,
        faturamentoMinimoLucros: null,
        beneficiosAdicionais: false,
        beneficiosDescricao: null,
        problema: null,
        solucao: null,
        modeloReceita: null,
        diferencial: null,
        mercadoAlvo: null,
        sociosCount: null,
        dedicacao: null,
        compradores: null,
        investimentoPrevio: null,
        concorrencia: null,
        startup: {
          nome: 'S',
          slug: 's',
          area_atuacao: 'tech',
          logo: { url_sm: 'x' },
        },
      });

      const r = await service.getCheckoutData(1);

      expect(r.codigo).toBe(200);
      // Fallback para tokenPrice legado (50)
      expect(r.data).toMatchObject({
        price: 50,
        tokenPrice: 50,
      });
    });
  });
});
