import { Test } from '@nestjs/testing';
import { SealsService } from './seals.service';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * BUG-FT-007 — selos automáticos na aprovação da Fase 3 do admin.
 *
 * Cobertura:
 *  - `autoAssignStage` — troca automática de STAGE seal baseada em
 *    `Startup.estagio`. Idempotente; remove o STAGE anterior antes
 *    de atribuir o novo (1 STAGE por startup).
 *  - `autoAssignFastDeploy` — atribui selo "Lançamento" (slug
 *    `lancamento`) quando o founder contratou FAST_DEPLOY. Idempotente;
 *    no-op se o selo não existe no banco (defesa em profundidade).
 */
describe('SealsService — autoAssignStage + autoAssignFastDeploy (BUG-FT-007)', () => {
  const mockPrisma: any = {
    seal: { findUnique: jest.fn() },
    startupSeal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
  };

  let service: SealsService;

  const buildModule = async () => {
    const m = await Test.createTestingModule({
      providers: [
        SealsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    return m.get(SealsService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── autoAssignStage ─────────────────────────────────────────────

  describe('autoAssignStage', () => {
    it('estagio=null/undefined → no-op (não chama Prisma)', async () => {
      service = await buildModule();
      await service.autoAssignStage(1, null);
      await service.autoAssignStage(2, undefined);
      expect(mockPrisma.seal.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.startupSeal.create).not.toHaveBeenCalled();
    });

    it('estagio não mapeado → no-op silencioso (sem selo)', async () => {
      service = await buildModule();
      // "foobar" não está no STAGE_MAP
      await service.autoAssignStage(1, 'foobar');
      expect(mockPrisma.seal.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.startupSeal.create).not.toHaveBeenCalled();
    });

    it('estagio mapeado e selo existe → cria atribuição', async () => {
      service = await buildModule();
      mockPrisma.seal.findUnique.mockResolvedValueOnce({ id: 10, slug: 'mvp' });
      mockPrisma.startupSeal.findMany.mockResolvedValueOnce([]);
      mockPrisma.startupSeal.create.mockResolvedValueOnce({
        id: 99,
        startupId: 1,
        sealId: 10,
      });

      await service.autoAssignStage(1, 'MVP');

      expect(mockPrisma.startupSeal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startupId: 1,
          sealId: 10,
          issuedBy: null,
          metadata: { source: 'auto', trigger: 'estagio_change' },
        }),
      });
    });

    it('remove STAGE seals anteriores antes de atribuir o novo (1 STAGE por startup)', async () => {
      service = await buildModule();
      mockPrisma.seal.findUnique.mockResolvedValueOnce({
        id: 10,
        slug: 'tracao',
      });
      // 1 STAGE anterior (mvp) + nenhum já com tracao
      mockPrisma.startupSeal.findMany.mockResolvedValueOnce([
        { id: 50, seal: { id: 5, slug: 'mvp' } },
      ]);
      mockPrisma.startupSeal.deleteMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.startupSeal.create.mockResolvedValueOnce({
        id: 100,
        startupId: 1,
        sealId: 10,
      });

      await service.autoAssignStage(1, 'TRAÇÃO');

      // O deleteMany recebe apenas o ID do seal anterior (não o novo)
      expect(mockPrisma.startupSeal.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [50] } },
      });
      expect(mockPrisma.startupSeal.create).toHaveBeenCalledTimes(1);
    });

    it('idempotente: se selo já atribuído, NÃO cria duplicata', async () => {
      service = await buildModule();
      mockPrisma.seal.findUnique.mockResolvedValueOnce({
        id: 10,
        slug: 'mvp',
      });
      // O findMany retorna o mesmo selo que vamos atribuir
      mockPrisma.startupSeal.findMany.mockResolvedValueOnce([
        { id: 100, seal: { id: 10, slug: 'mvp' } },
      ]);

      await service.autoAssignStage(1, 'MVP');

      expect(mockPrisma.startupSeal.create).not.toHaveBeenCalled();
      expect(mockPrisma.startupSeal.deleteMany).not.toHaveBeenCalled();
    });

    it('mapeamento tolerante: aceita "ideação", "tração", "operação", "break-even"', async () => {
      service = await buildModule();
      mockPrisma.seal.findUnique.mockResolvedValue({ id: 10, slug: 'x' });
      mockPrisma.startupSeal.findMany.mockResolvedValue([]);

      await service.autoAssignStage(1, 'ideação');
      expect(mockPrisma.seal.findUnique).toHaveBeenCalledWith({
        where: { slug: 'ideacao' },
      });

      await service.autoAssignStage(2, 'TRAÇÃO');
      expect(mockPrisma.seal.findUnique).toHaveBeenCalledWith({
        where: { slug: 'tracao' },
      });

      await service.autoAssignStage(3, 'Operação');
      expect(mockPrisma.seal.findUnique).toHaveBeenCalledWith({
        where: { slug: 'operacao' },
      });

      await service.autoAssignStage(4, 'Break-even');
      expect(mockPrisma.seal.findUnique).toHaveBeenCalledWith({
        where: { slug: 'breakeven' },
      });
    });
  });

  // ─── autoAssignFastDeploy ───────────────────────────────────────

  describe('autoAssignFastDeploy', () => {
    it('selo lancamento existe e não atribuído → cria atribuição', async () => {
      service = await buildModule();
      mockPrisma.seal.findUnique.mockResolvedValueOnce({
        id: 50,
        slug: 'lancamento',
      });
      mockPrisma.startupSeal.findUnique.mockResolvedValueOnce(null);
      mockPrisma.startupSeal.create.mockResolvedValueOnce({
        id: 200,
        startupId: 7,
        sealId: 50,
      });

      await service.autoAssignFastDeploy(7);

      expect(mockPrisma.startupSeal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startupId: 7,
          sealId: 50,
          issuedBy: null,
          metadata: { source: 'auto', trigger: 'fast_deploy' },
        }),
      });
    });

    it('idempotente: selo já atribuído → não cria duplicata', async () => {
      service = await buildModule();
      mockPrisma.seal.findUnique.mockResolvedValueOnce({
        id: 50,
        slug: 'lancamento',
      });
      mockPrisma.startupSeal.findUnique.mockResolvedValueOnce({
        id: 200,
      });

      await service.autoAssignFastDeploy(7);

      expect(mockPrisma.startupSeal.create).not.toHaveBeenCalled();
    });

    it('selo lancamento não existe no banco → no-op silencioso (não falha)', async () => {
      service = await buildModule();
      mockPrisma.seal.findUnique.mockResolvedValueOnce(null);

      // Não deve lançar nem chamar create
      await expect(service.autoAssignFastDeploy(7)).resolves.toBeUndefined();
      expect(mockPrisma.startupSeal.create).not.toHaveBeenCalled();
      expect(mockPrisma.startupSeal.findUnique).not.toHaveBeenCalled();
    });
  });
});
