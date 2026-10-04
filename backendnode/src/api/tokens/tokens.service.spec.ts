import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { TokensService } from './tokens.service';

describe('TokensService — ownership do detalhe privado (F-10)', () => {
  let service: TokensService;
  let prisma: {
    token: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let s3Service: { getUrl: jest.Mock };

  const token = {
    id: 'token-owner',
    hash: 'hash-owner',
    certificate: 'certificates/token-owner.pdf',
    quantity: 1,
    purchaseVal: 100,
    currentVal: 110,
    dtAquisicao: new Date('2026-01-01T00:00:00.000Z'),
    campaign: { title: 'Campanha Teste', status: 'OPEN', tokenPrice: 100 },
    startup: {
      nome: 'Startup Teste',
      slug: 'startup-teste',
      area_atuacao: 'Tecnologia',
    },
    history: [],
    userId: 20,
  };

  beforeEach(() => {
    prisma = {
      token: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    s3Service = { getUrl: jest.fn() };
    service = new TokensService(
      prisma as unknown as PrismaService,
      s3Service as unknown as S3Service,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('retorna o detalhe quando o token pertence ao usuário da sessão', async () => {
    prisma.token.findFirst.mockResolvedValue(token);

    const result = await service.getTokenById('token-owner', 20);

    expect(prisma.token.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'token-owner', userId: 20 },
      }),
    );
    expect(result.error).toBe(false);
    expect(result.codigo).toBe(200);
    expect(result.data).toEqual(
      expect.objectContaining({
        id: 'token-owner',
        hash: 'hash-owner',
        history: [],
      }),
    );
  });

  it('trata token de outra conta como não encontrado', async () => {
    prisma.token.findFirst.mockResolvedValue(null);

    const result = await service.getTokenById('token-owner', 99);

    expect(prisma.token.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'token-owner', userId: 99 },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        error: true,
        codigo: 404,
        message: 'Token não encontrado',
      }),
    );
    expect(result.data).toBeUndefined();
  });

  it('permite ao ADMIN baixar certificado de token de outra conta', async () => {
    prisma.token.findUnique.mockResolvedValue(token);
    s3Service.getUrl.mockResolvedValue('https://storage.test/certificado.pdf');

    const result = await service.getCertificateUrl('token-owner', 99, 'ADMIN');

    expect(result.error).toBe(false);
    expect(result.codigo).toBe(200);
    expect(result.data).toEqual(
      expect.objectContaining({ url: 'https://storage.test/certificado.pdf' }),
    );
  });

  it('bloqueia certificado de outra conta para usuário comum', async () => {
    prisma.token.findUnique.mockResolvedValue(token);

    await expect(
      service.getCertificateUrl('token-owner', 99, 'USER'),
    ).rejects.toThrow(new ForbiddenException('Você não é o dono deste token'));
    expect(s3Service.getUrl).not.toHaveBeenCalled();
  });
});

describe('TokensService — getUserTokens (F1 wallet-assets)', () => {
  let service: TokensService;
  let prisma: {
    token: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let s3Service: { getUrl: jest.Mock };

  const ownedToken = {
    id: 'token-uuid-1',
    hash: 'abcdef0123456789fedcba9876543210abcdef0123456789fedcba9876543210',
    investmentId: 42,
    quantity: 1,
    purchaseVal: 240,
    currentVal: 240,
    dtAquisicao: new Date('2026-10-04T12:00:00.000Z'),
    campaign: { title: 'Rodada Série A', status: 'OPEN' },
    startup: { nome: 'Acme LTDA', slug: 'acme' },
  };

  beforeEach(() => {
    prisma = {
      token: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    s3Service = { getUrl: jest.fn() };
    service = new TokensService(
      prisma as unknown as PrismaService,
      s3Service as unknown as S3Service,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('retorna tokens do usuário com investmentId, shortCode e dados da campanha/startup', async () => {
    prisma.token.findMany.mockResolvedValue([ownedToken]);

    const result = await service.getUserTokens(7);

    expect(prisma.token.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7 } }),
    );
    expect(result.error).toBe(false);
    expect(result.codigo).toBe(200);
    expect(result.data).toEqual({
      total: 1,
      tokens: [
        expect.objectContaining({
          id: 'token-uuid-1',
          shortCode: '76543210',
          investmentId: 42,
          quantity: 1,
          purchaseVal: 240,
          currentVal: 240,
          campaign: 'Rodada Série A',
          campaignStatus: 'OPEN',
          startup: 'Acme LTDA',
          startupSlug: 'acme',
        }),
      ],
    });
  });

  it('normaliza investmentId null para tokens legados sem vínculo', async () => {
    const legacyToken = { ...ownedToken, id: 'token-legacy', investmentId: null };
    prisma.token.findMany.mockResolvedValue([legacyToken]);

    const result = await service.getUserTokens(7);

    expect(result.data?.tokens[0]).toEqual(
      expect.objectContaining({ id: 'token-legacy', investmentId: null }),
    );
  });

  it('retorna total=0 e lista vazia quando o usuário não tem tokens', async () => {
    prisma.token.findMany.mockResolvedValue([]);

    const result = await service.getUserTokens(99);

    expect(result.error).toBe(false);
    expect(result.data).toEqual({ total: 0, tokens: [] });
  });
});
