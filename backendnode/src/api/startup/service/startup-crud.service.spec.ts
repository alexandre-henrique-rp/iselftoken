import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from 'src/auth/session/session.service';
import { AuditService } from 'src/common/audit/audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StartupCrudService } from './startup-crud.service';
import { ValidateFundador } from './validate.fundador';

describe('StartupCrudService', () => {
  let service: StartupCrudService;
  let prisma: any;
  let sessionService: any;
  let validateFundador: any;

  beforeEach(async () => {
    prisma = {
      startup: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 1, nome: 'X', founderId: 42 }),
        update: jest.fn().mockResolvedValue({ id: 1 }),
        delete: jest.fn().mockResolvedValue({ id: 1 }),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      campaign: { findFirst: jest.fn() },
      country: {
        findUnique: jest.fn().mockResolvedValue({
          iso3: 'BRA',
          name: 'Brasil',
          emoji: '🇧🇷',
        }),
      },
      investment: {
        count: jest.fn().mockResolvedValue(3),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 300 } }),
      },
      kYCProfile: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      payment: { create: jest.fn().mockResolvedValue({ id: 1, amount: 890 }) },
      areaAtuacao: {
        findUnique: jest.fn().mockResolvedValue({
          id: 5,
          categoryId: 1,
          category: { id: 1 },
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 5, categoryId: 1, slug: 'area-5', nome: 'Área 5' },
          { id: 6, categoryId: 1, slug: 'area-6', nome: 'Área 6' },
        ]),
      },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    sessionService = {
      deleteUserCache: jest.fn().mockResolvedValue(undefined),
    };
    validateFundador = {
      validateFundadorPlan: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupCrudService,
        { provide: PrismaService, useValue: prisma },
        { provide: ValidateFundador, useValue: validateFundador },
        { provide: SessionService, useValue: sessionService },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(StartupCrudService);
  });

  describe('resubmit()', () => {
    it('muda startup rejeitada para revisão da curadoria', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: 42,
        status: 'REJECTED',
      });
      prisma.startup.update.mockResolvedValueOnce({
        id: 1,
        founderId: 42,
        status: 'PENDING_CURATOR_REVIEW',
      });

      const result = await service.resubmit(1, {
        id: 42,
        role: 'FOUNDER',
      } as any);

      expect(result.error).toBe(false);
      expect(prisma.startup.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'PENDING_CURATOR_REVIEW' },
      });
    });
  });

  describe('create()', () => {
    it('deve criar startup e invalidar cache', async () => {
      const dto = {
        nomeFantasia: 'Teste',
        razaoSocial: 'Teste LTDA',
        cnpj: '11222333000181',
        categoryId: 1,
        areaAtuacaoId: 5,
        estagio: 'SEED',
        descricao: 'Teste descricao',
        dataAbertura: '2020',
        paisIso3: 'BRA',
        titular: 'Teste',
        banco: 'C6',
        agencia: '0001',
        conta: '123456',
        digito: '7',
      } as any;
      const user = { id: 42, role: 'FOUNDER' } as any;

      const result = await service.create(dto, user);
      expect(result.error).toBe(false);
      expect(sessionService.deleteUserCache).toHaveBeenCalledWith('42');
    });

    it('deve persistir múltiplas áreas no JSON e manter a primeira no legado', async () => {
      const dto = {
        nomeFantasia: 'Multi Área',
        razaoSocial: 'Multi Área LTDA',
        cnpj: '11222333000181',
        categoryId: 1,
        areaAtuacaoIds: [5, 6],
        estagio: 'MVP',
        descricao: 'Descrição multi área',
        dataAbertura: '2020',
        paisIso3: 'BRA',
        titular: 'Teste',
        banco: 'C6',
        agencia: '0001',
        conta: '123456',
        digito: '7',
      } as any;

      await service.create(dto, { id: 42, role: 'FOUNDER' } as any);
      expect(prisma.startup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            areaAtuacaoId: 5,
            areas_atuacao: [5, 6],
          }),
        }),
      );
    });

    it('deve retornar erro se plano invalido', async () => {
      validateFundador.validateFundadorPlan.mockResolvedValueOnce(false);
      const dto = {
        nomeFantasia: 'X',
        razaoSocial: 'X LTDA',
        cnpj: '11222333000181',
        categoryId: 1,
        areaAtuacaoId: 5,
        estagio: 'SEED',
        descricao: 'Desc',
        dataAbertura: '2020',
        paisIso3: 'BRA',
        titular: 'T',
        banco: 'C6',
        agencia: '0001',
        conta: '123456',
        digito: '7',
      } as any;
      const user = { id: 42 } as any;

      const result = await service.create(dto, user);
      expect(result.error).toBe(true);
      expect(sessionService.deleteUserCache).not.toHaveBeenCalled();
    });
  });

  describe('geração de slug a partir de nomeFantasia', () => {
    const makeDto = (nomeFantasia: string) =>
      ({
        nomeFantasia,
        razaoSocial: 'X LTDA',
        cnpj: '11222333000181',
        categoryId: 1,
        areaAtuacaoId: 5,
        estagio: 'SEED',
        descricao: 'd',
        dataAbertura: '2020',
        paisIso3: 'BRA',
        titular: 'T',
        banco: 'C6',
        agencia: '0001',
        conta: '123456',
        digito: '7',
      }) as any;
    const user = { id: 42, role: 'FOUNDER' } as any;

    /**
     * Recupera o `slug` enviado para `prisma.startup.create` na última
     * chamada de `create()` do service.
     */
    const lastCreatedSlug = () => {
      const lastCall =
        prisma.startup.create.mock.calls[
          prisma.startup.create.mock.calls.length - 1
        ];
      return lastCall?.[0]?.data?.slug;
    };

    beforeEach(() => {
      // findUnique da etapa de unicidade → não há colisão por padrão
      prisma.startup.findUnique.mockResolvedValue(null);
    });

    it('deriva o slug diretamente do nomeFantasia', async () => {
      await service.create(makeDto('Rocket Invite Inova Simples'), user);
      expect(lastCreatedSlug()).toBe('rocket-invite-inova-simples');
    });

    it('remove acentos e normaliza para ASCII', async () => {
      await service.create(makeDto('Açaí & Tecnologia'), user);
      expect(lastCreatedSlug()).toBe('acai-e-tecnologia');
    });

    it('descarta sufixos empresariais do nomeFantasia', async () => {
      await service.create(makeDto('Rocket Invite S.A.'), user);
      expect(lastCreatedSlug()).toBe('rocket-invite');
    });

    it('remove stopwords (de/da/e/em/...) mantendo compostos', async () => {
      await service.create(makeDto('Padaria da Esquina de São Paulo'), user);
      // 'da', 'de' removidos; 'Padaria', 'Esquina', 'São' (sem acento), 'Paulo'
      expect(lastCreatedSlug()).toBe('padaria-esquina-sao-paulo');
    });

    it('limita tamanho e descarta hífen trailing', async () => {
      const nomeLongo =
        'Rocket Invite Inova ' + 'Simples '.repeat(20).trim() + ' '.repeat(5);
      await service.create(makeDto(nomeLongo), user);
      const slug = lastCreatedSlug();
      expect(slug.length).toBeLessThanOrEqual(60);
      expect(slug.endsWith('-')).toBe(false);
    });

    it('retorna slug vazio → usa fallback baseado em timestamp', async () => {
      await service.create(makeDto(''), user);
      const slug = lastCreatedSlug();
      expect(slug).toMatch(/^startup-[a-z0-9]+$/);
    });

    it('em colisão, anexa sufixo numérico sequencial', async () => {
      // Primeira chamada de findUnique (unicidade) → colide; segunda → livre.
      prisma.startup.findUnique
        .mockResolvedValueOnce({ id: 999 }) // base colide
        .mockResolvedValueOnce(null); // -1 livre

      await service.create(makeDto('Rocket Invite'), user);
      expect(lastCreatedSlug()).toBe('rocket-invite-1');
    });

    it('em colisão múltipla, incrementa até achar slot livre', async () => {
      prisma.startup.findUnique
        .mockResolvedValueOnce({ id: 999 }) // base colide
        .mockResolvedValueOnce({ id: 998 }) // -1 colide
        .mockResolvedValueOnce({ id: 997 }) // -2 colide
        .mockResolvedValueOnce(null); // -3 livre

      await service.create(makeDto('Rocket Invite'), user);
      expect(lastCreatedSlug()).toBe('rocket-invite-3');
    });

    it('substitui & por "e" no slug (conector preservado)', async () => {
      await service.create(makeDto('Black & White Foods'), user);
      expect(lastCreatedSlug()).toBe('black-e-white-foods');
    });

    it('normaliza abreviações com pontos (I.S. → i-s → preservado como token)', async () => {
      // Pontos não sobrevivem no slug final. "I.S." vira `i` + `s` (tokens
      // válidos). Não inferimos abreviação sem regras explícitas.
      await service.create(makeDto('Acme I.S. Tech'), user);
      expect(lastCreatedSlug()).not.toMatch(/\./);
      expect(lastCreatedSlug()).toBe('acme-i-s-tech');
    });
  });

  describe('update()', () => {
    it('normaliza o endereço dentro do JSON pais antes de persistir', async () => {
      prisma.startup.findUnique
        .mockResolvedValueOnce({ id: 1, founderId: 42 })
        .mockResolvedValueOnce({
          nome: 'Startup',
          descricao: 'Descrição',
          estagio: 'mvp',
          cnpj: '11222333000181',
        });
      prisma.startup.update.mockResolvedValueOnce({
        id: 1,
        nome: 'Startup',
        descricao: 'Descrição',
        estagio: 'mvp',
      });

      await service.update(
        1,
        {
          data_fundacao: '1994-01-01',
          pais: {
            nome: 'Brasil',
            codigo: 'BRA',
            cep: '01310100',
            cidade: 'São Paulo',
            uf: 'SP',
          },
        } as any,
        { id: 42, role: 'FOUNDER' } as any,
      );

      expect(prisma.startup.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          data_fundacao: new Date('1994-01-01T00:00:00.000Z'),
          pais: {
            nome: 'Brasil',
            codigo: 'BRA',
            cep: '01310100',
            cidade: 'São Paulo',
            uf: 'SP',
          },
        }),
      });
    });
  });

  describe('findPrivate() e findAuthenticatedMarketplace()', () => {
    const openStartup = {
      id: 7,
      slug: 'startup-a',
      nome: 'Startup A',
      area_atuacao: 'Tecnologia',
      category: null,
      estagio: 'SEED',
      descricao: 'Descrição pública',
      youtube_url: null,
      problema: 'Problema',
      solucao: 'Solução',
      socios: null,
      teams: null,
      logo: null,
      cover: null,
      campaigns: [
        {
          id: 11,
          title: 'Rodada A',
          targetAmount: 1000,
          minInvestment: 100,
          valuation: 5000,
          tokenPrice: 10,
          totalTokens: 100,
          tokensSold: 10,
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      ],
    };

    it('permite founder owner e mantém o ID somente no detalhe privado', async () => {
      prisma.startup.findFirst.mockResolvedValueOnce(openStartup);

      const result = await service.findPrivate('startup-a', {
        id: 42,
        role: 'FOUNDER',
      } as any);

      expect(result.error).toBe(false);
      expect(result.data.id).toBe(7);
      expect(prisma.startup.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ slug: 'startup-a', founderId: 42 }),
        }),
      );
    });

    it('bloqueia founder cross-user sem retornar o detalhe', async () => {
      const result = await service.findPrivate('startup-a', {
        id: 99,
        role: 'FOUNDER',
      } as any);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
      expect(result.data).toBeUndefined();
      expect(prisma.startup.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ founderId: 99 }),
        }),
      );
    });

    it.each(['ADMIN', 'FINANCEIRO', 'COMPLIANCE'])(
      'permite papel administrativo %s sem filtro de founder',
      async (role) => {
        prisma.startup.findFirst.mockResolvedValueOnce(openStartup);

        const result = await service.findPrivate('startup-a', {
          id: 500,
          role,
        } as any);

        expect(result.error).toBe(false);
        expect(prisma.startup.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              founderId: expect.anything(),
            }),
          }),
        );
      },
    );

    it('permite USER/INVESTOR no fluxo de descoberta, sem ID interno ou PII', async () => {
      prisma.startup.findFirst.mockResolvedValueOnce(openStartup);

      const result = await service.findAuthenticatedMarketplace('startup-a');

      expect(result.error).toBe(false);
      expect(result.data).not.toHaveProperty('id');
      expect(result.data).not.toHaveProperty('email');
      expect(result.data).not.toHaveProperty('cnpj');
      expect(result.data).not.toHaveProperty('dadosBancarios');
      expect(prisma.startup.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ founderId: expect.anything() }),
        }),
      );
    });

    it('retorna 404 para startup inexistente ou sem campanha elegível', async () => {
      const result = await service.findAuthenticatedMarketplace('inexistente');

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
    });
  });

  describe('remove()', () => {
    it('deve remover startup e invalidar cache', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({ id: 1, founderId: 42 });
      const user = { id: 42 } as any;

      const result = await service.remove(1, user);
      expect(result.error).toBe(false);
      expect(sessionService.deleteUserCache).toHaveBeenCalledWith('42');
    });

    it('deve retornar 404 se nao encontrada', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(null);
      const result = await service.remove(999, { id: 42 } as any);
      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
    });

    it('deve retornar 403 se nao e o founder', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({ id: 1, founderId: 99 });
      const result = await service.remove(1, { id: 42 } as any);
      expect(result.error).toBe(true);
      expect(result.codigo).toBe(403);
    });
  });

  describe('findOne()', () => {
    it('deve retornar 404 se nao encontrada', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(null);
      const result = await service.findOne(999);
      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
    });
  });
});
