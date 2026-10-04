import { ComplianceCampaignsService } from './compliance-campaigns.service';

describe('ComplianceCampaignsService', () => {
  let service: ComplianceCampaignsService;
  let prisma: {
    campaign: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      campaign: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new ComplianceCampaignsService(prisma as never);
  });

  it('lista campanhas ocultas sem aplicar a allowlist pública', async () => {
    prisma.campaign.count.mockResolvedValue(3);
    prisma.campaign.findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Rascunho',
        status: 'DRAFT',
        targetAmount: 1000,
        tokenPrice: 10,
        totalTokens: 100,
        tokensSold: 0,
        deadline: new Date('2026-10-01'),
        createdAt: new Date('2026-09-01'),
        closedAt: null,
        startup: {
          id: 11,
          nome: 'Startup Draft',
          slug: 'startup-draft',
          logo: null,
          status: 'PENDING',
        },
      },
      {
        id: 2,
        title: 'Rodada pausada',
        status: 'PAUSED',
        targetAmount: 2000,
        tokenPrice: 20,
        totalTokens: 100,
        tokensSold: 10,
        deadline: new Date('2026-10-02'),
        createdAt: new Date('2026-09-02'),
        closedAt: null,
        startup: {
          id: 12,
          nome: 'Startup Paused',
          slug: 'startup-paused',
          logo: null,
          status: 'APPROVED',
        },
      },
      {
        id: 3,
        title: 'Rodada encerrada',
        status: 'CLOSED',
        targetAmount: 3000,
        tokenPrice: 30,
        totalTokens: 100,
        tokensSold: 100,
        deadline: new Date('2026-10-03'),
        createdAt: new Date('2026-09-03'),
        closedAt: new Date('2026-09-04'),
        startup: {
          id: 13,
          nome: 'Startup Closed',
          slug: 'startup-closed',
          logo: null,
          status: 'APPROVED',
        },
      },
    ]);

    const result = await service.listCampaigns({
      status: 'ALL',
      page: 1,
      limit: 20,
    });

    expect(result.error).toBe(false);
    expect(result.data.data.map((campaign) => campaign.status)).toEqual([
      'DRAFT',
      'PAUSED',
      'CLOSED',
    ]);
    expect(prisma.campaign.count).toHaveBeenCalledWith({ where: {} });
    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, skip: 0, take: 20 }),
    );
  });

  it('retorna detalhe de campanha DRAFT para revisão administrativa', async () => {
    prisma.campaign.findUnique.mockResolvedValue({
      id: 7,
      title: 'Campanha em revisão',
      status: 'DRAFT',
      createdAt: new Date('2026-09-01'),
      closedAt: null,
      deadline: new Date('2026-10-01'),
      targetAmount: 10000,
      minInvestment: 100,
      valuation: 100000,
      tokenPrice: 100,
      totalTokens: 100,
      tokensSold: 0,
      problema: 'Problema',
      solucao: 'Solução',
      diferencial: 'Diferencial',
      modeloReceita: 'Receita',
      mercadoAlvo: 'Mercado',
      sociosCount: 2,
      dedicacao: 'Integral',
      compradores: 'Compradores',
      investimentoPrevio: 'Não',
      concorrencia: 'Concorrência',
      participacaoLucros: false,
      faturamentoMinimoLucros: null,
      beneficiosAdicionais: false,
      beneficiosDescricao: null,
      aceiteTermoRepasse: false,
      declaracaoVeracidade: false,
      resources: [],
      investments: [],
      startup: {
        id: 21,
        nome: 'Startup em revisão',
        slug: 'startup-revisao',
        cnpj: null,
        razao_social: null,
        email: 'compliance@example.com',
        telefone: null,
        site: null,
        area_atuacao: 'Tecnologia',
        category: null,
        estagio: 'Inicial',
        descricao: 'Descrição',
        youtube_url: null,
        banco: null,
        agencia: null,
        conta: null,
        digito: null,
        tipo_conta: null,
        pix_key: null,
        titular: null,
        documento_titular: null,
        socios: null,
        teams: null,
        status: 'PENDING',
        logo: null,
        founder: { id: 31, nome: 'Analista', email: 'analista@example.com' },
      },
    });

    const result = await service.getCampaignDetail(7);

    expect(result.error).toBe(false);
    expect(result.data).toEqual(
      expect.objectContaining({ id: 7, status: 'DRAFT' }),
    );
    expect(prisma.campaign.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 } }),
    );
  });
});
