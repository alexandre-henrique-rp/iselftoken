/**
 * Testes unitarios do TokenGateGuard.
 *
 * Cobre todas as 5 regras do gate:
 * 1. Sem auth -> 401
 * 2. ADMIN -> allow
 * 3. Founder da startup -> allow
 * 4. Token-holder -> allow
 * 5. Sem token + sem ser founder + sem ser ADMIN -> 403
 *
 * Referencia: scripts/PRD_PAGINA_TRANSPARENCIA.md §5.4
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenGateGuard } from './token-gate.guard';
import { PrismaService } from '../../../prisma/prisma.service';

describe('TokenGateGuard', () => {
  let guard: TokenGateGuard;
  let prisma: any;

  const mockStartup = { founderId: 100 };
  const mockToken = { id: 1 };
  const mockPost = { startupId: 50, deletedAt: null };

  const mockContext = (req: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
    }) as ExecutionContext;

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn() },
      token: { findFirst: jest.fn() },
      transparencyPost: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenGateGuard, { provide: PrismaService, useValue: prisma }],
    }).compile();

    guard = module.get<TokenGateGuard>(TokenGateGuard);
  });

  describe('Regra 1: autenticacao', () => {
    it('deve lancar UnauthorizedException quando user nao existe', async () => {
      const ctx = mockContext({ params: { startupId: '1' }, user: undefined });
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lancar UnauthorizedException quando user.id vazio', async () => {
      const ctx = mockContext({
        params: { startupId: '1' },
        user: { id: undefined, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Regra 2: ADMIN', () => {
    it('deve permitir ADMIN sem consultar DB', async () => {
      const ctx = mockContext({
        params: { startupId: '1' },
        user: { id: 999, role: 'ADMIN' },
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(prisma.startup.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Regra 3: founder da startup', () => {
    it('deve permitir founder (user.id === startup.founderId)', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(mockStartup);
      const ctx = mockContext({
        params: { startupId: '50' },
        user: { id: 100, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(prisma.startup.findUnique).toHaveBeenCalledWith({
        where: { id: 50 },
        select: { founderId: true },
      });
      expect(prisma.token.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('Regra 4: token-holder', () => {
    it('deve permitir usuario com Token ativo da startup', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(mockStartup);
      prisma.token.findFirst.mockResolvedValueOnce(mockToken);
      const ctx = mockContext({
        params: { startupId: '50' },
        user: { id: 200, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(prisma.token.findFirst).toHaveBeenCalledWith({
        where: { userId: 200, startupId: 50 },
        select: { id: true },
      });
    });
  });

  describe('Regra 5: bloqueia sem permissao', () => {
    it('deve lancar ForbiddenException quando nao e founder, nem ADMIN, nem token-holder', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(mockStartup);
      prisma.token.findFirst.mockResolvedValueOnce(null);
      const ctx = mockContext({
        params: { startupId: '50' },
        user: { id: 200, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('mensagem deve mencionar "comprar tokens"', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(mockStartup);
      prisma.token.findFirst.mockResolvedValueOnce(null);
      const ctx = mockContext({
        params: { startupId: '50' },
        user: { id: 200, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(/comprar tokens/);
    });
  });

  describe('Casos de borda', () => {
    it('deve lancar NotFoundException quando startup nao existe', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(null);
      const ctx = mockContext({
        params: { startupId: '999' },
        user: { id: 200, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
    });

    it('deve resolver startupId via postId quando :startupId nao vem na rota', async () => {
      prisma.transparencyPost.findUnique.mockResolvedValueOnce(mockPost);
      prisma.startup.findUnique.mockResolvedValueOnce(mockStartup);
      const ctx = mockContext({
        params: { postId: '10' }, // rota /posts/:postId sem :startupId
        user: { id: 100, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(prisma.transparencyPost.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        select: { startupId: true, deletedAt: true },
      });
    });

    it('deve lancar NotFoundException quando postId nao existe', async () => {
      prisma.transparencyPost.findUnique.mockResolvedValueOnce(null);
      const ctx = mockContext({
        params: { postId: '999' },
        user: { id: 200, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
    });

    it('deve lancar NotFoundException quando postId eh de post soft-deleted', async () => {
      prisma.transparencyPost.findUnique.mockResolvedValueOnce({
        startupId: 50,
        deletedAt: new Date(),
      });
      const ctx = mockContext({
        params: { postId: '10' },
        user: { id: 200, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
    });

    it('deve bloquear quando nao tem :startupId nem :postId (defesa em profundidade)', async () => {
      const ctx = mockContext({
        params: {},
        user: { id: 200, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(false);
    });

    it('deve aceitar :startupId como string (route param default)', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(mockStartup);
      const ctx = mockContext({
        params: { startupId: '50' },
        user: { id: 100, role: 'USER' },
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });
});
