/**
 * Testes unitarios do TransparencyService.
 *
 * Cobre: create (com/sem cross-field, com anexos), list (filtros, paginacao),
 * findOne, update (autor/ADMIN, cross-field), remove (soft delete).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
// Import direto do Prisma client para evitar que Jest resolva uma versão
// incorreta do @prisma/client durante os testes.
import { TransparencyPostType } from '@prisma/client';
import { TransparencyService } from './transparency.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TransparencyService', () => {
  let service: TransparencyService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn() },
      transparencyPost: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      transparencyPostAttachment: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransparencyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TransparencyService>(TransparencyService);
  });

  describe('create', () => {
    const dto = {
      title: 'Relatorio Q3 2026',
      content: '## Conteudo\n\nDetalhes do trimestre.',
      type: TransparencyPostType.FINANCIAL_REPORT,
      periodMonth: 9,
      periodYear: 2026,
    };

    it('deve criar post sem anexos', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({ id: 50 });
      prisma.transparencyPost.create.mockResolvedValueOnce({
        id: 1,
        startupId: 50,
        authorId: 100,
        ...dto,
        type: dto.type ?? TransparencyPostType.GENERAL,
      });

      const result = await service.create(50, 100, dto);

      expect(result.id).toBe(1);
      expect(prisma.transparencyPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startupId: 50,
          authorId: 100,
          title: dto.title,
          content: dto.content,
          type: TransparencyPostType.FINANCIAL_REPORT,
          periodMonth: 9,
          periodYear: 2026,
        }),
      });
      expect(
        prisma.transparencyPostAttachment.createMany,
      ).not.toHaveBeenCalled();
    });

    it('deve criar post com anexos', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({ id: 50 });
      prisma.transparencyPost.create.mockResolvedValueOnce({ id: 1, ...dto });
      prisma.transparencyPostAttachment.createMany.mockResolvedValueOnce({
        count: 2,
      });

      await service.create(50, 100, { ...dto, attachmentIds: [10, 11] });

      expect(prisma.transparencyPostAttachment.createMany).toHaveBeenCalledWith(
        {
          data: [
            { postId: 1, uploadId: 10 },
            { postId: 1, uploadId: 11 },
          ],
        },
      );
    });

    it('deve usar tipo GENERAL como padrao se nao fornecido', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({ id: 50 });
      prisma.transparencyPost.create.mockResolvedValueOnce({ id: 1 });

      await service.create(50, 100, { title: 'x', content: 'y z w v' });

      expect(prisma.transparencyPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: TransparencyPostType.GENERAL }),
      });
    });

    it('deve lancar ForbiddenException quando so periodMonth eh fornecido', async () => {
      await expect(
        service.create(50, 100, { title: 'x', content: 'y', periodMonth: 9 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lancar ForbiddenException quando so periodYear eh fornecido', async () => {
      await expect(
        service.create(50, 100, { title: 'x', content: 'y', periodYear: 2026 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lancar NotFoundException quando startup nao existe', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(999, 100, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('deve listar com filtros e paginacao padrao', async () => {
      prisma.transparencyPost.findMany.mockResolvedValueOnce([]);
      prisma.transparencyPost.count.mockResolvedValueOnce(0);

      await service.list(50, {});

      expect(prisma.transparencyPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { startupId: 50, deletedAt: null },
          orderBy: { publishedAt: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('deve aplicar filtro de tipo', async () => {
      prisma.transparencyPost.findMany.mockResolvedValueOnce([]);
      prisma.transparencyPost.count.mockResolvedValueOnce(0);

      await service.list(50, { type: TransparencyPostType.FINANCIAL_REPORT });

      expect(prisma.transparencyPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: TransparencyPostType.FINANCIAL_REPORT,
          }),
        }),
      );
    });

    it('deve aplicar filtros de ano e mes', async () => {
      prisma.transparencyPost.findMany.mockResolvedValueOnce([]);
      prisma.transparencyPost.count.mockResolvedValueOnce(0);

      await service.list(50, { year: 2026, month: 9 });

      expect(prisma.transparencyPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ periodYear: 2026, periodMonth: 9 }),
        }),
      );
    });

    it('deve respeitar paginacao customizada', async () => {
      prisma.transparencyPost.findMany.mockResolvedValueOnce([]);
      prisma.transparencyPost.count.mockResolvedValueOnce(0);

      await service.list(50, { page: 3, limit: 5 });

      expect(prisma.transparencyPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('deve sempre filtrar deletedAt: null (soft delete)', async () => {
      prisma.transparencyPost.findMany.mockResolvedValueOnce([]);
      prisma.transparencyPost.count.mockResolvedValueOnce(0);

      await service.list(50, {});

      expect(prisma.transparencyPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar post por ID', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        title: 'x',
      });

      const result = await service.findOne(1);

      expect(result?.id).toBe(1);
      expect(prisma.transparencyPost.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, deletedAt: null } }),
      );
    });

    it('deve retornar null para post soft-deleted', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce(null);
      expect(await service.findOne(999)).toBeNull();
    });
  });

  describe('update', () => {
    it('deve permitir edicao pelo autor', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 100,
        periodMonth: null,
        periodYear: null,
      });
      prisma.transparencyPost.update.mockResolvedValueOnce({
        id: 1,
        title: 'novo',
      });

      await service.update(1, 100, false, { title: 'novo' });

      expect(prisma.transparencyPost.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'novo' },
      });
    });

    it('deve permitir edicao por ADMIN mesmo nao sendo autor', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 100,
        periodMonth: null,
        periodYear: null,
      });
      prisma.transparencyPost.update.mockResolvedValueOnce({ id: 1 });

      await service.update(1, 999, true, { title: 'admin edit' });

      expect(prisma.transparencyPost.update).toHaveBeenCalled();
    });

    it('deve bloquear usuario que nao e autor nem ADMIN', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 100,
      });

      await expect(
        service.update(1, 999, false, { title: 'x' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lancar NotFoundException quando post nao existe', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.update(999, 100, false, { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve substituir anexos completamente quando attachmentIds eh fornecido', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 100,
        periodMonth: null,
        periodYear: null,
      });
      prisma.transparencyPost.update.mockResolvedValueOnce({ id: 1 });
      prisma.transparencyPostAttachment.deleteMany.mockResolvedValueOnce({
        count: 2,
      });
      prisma.transparencyPostAttachment.createMany.mockResolvedValueOnce({
        count: 1,
      });

      await service.update(1, 100, false, { attachmentIds: [99] });

      expect(prisma.transparencyPostAttachment.deleteMany).toHaveBeenCalledWith(
        {
          where: { postId: 1 },
        },
      );
      expect(prisma.transparencyPostAttachment.createMany).toHaveBeenCalledWith(
        {
          data: [{ postId: 1, uploadId: 99 }],
        },
      );
    });

    it('deve remover todos os anexos quando attachmentIds: []', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 100,
        periodMonth: null,
        periodYear: null,
      });
      prisma.transparencyPost.update.mockResolvedValueOnce({ id: 1 });
      prisma.transparencyPostAttachment.deleteMany.mockResolvedValueOnce({
        count: 1,
      });

      await service.update(1, 100, false, { attachmentIds: [] });

      expect(prisma.transparencyPostAttachment.deleteMany).toHaveBeenCalled();
      expect(
        prisma.transparencyPostAttachment.createMany,
      ).not.toHaveBeenCalled();
    });

    it('deve manter anexos existentes quando attachmentIds nao eh fornecido', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 100,
        periodMonth: null,
        periodYear: null,
      });
      prisma.transparencyPost.update.mockResolvedValueOnce({ id: 1 });

      await service.update(1, 100, false, { title: 'novo' });

      expect(
        prisma.transparencyPostAttachment.deleteMany,
      ).not.toHaveBeenCalled();
      expect(
        prisma.transparencyPostAttachment.createMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deve soft-deletar post do autor', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 100,
      });
      prisma.transparencyPost.update.mockResolvedValueOnce({ id: 1 });

      await service.remove(1, 100, false);

      expect(prisma.transparencyPost.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('deve permitir ADMIN deletar qualquer post', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 100,
      });
      prisma.transparencyPost.update.mockResolvedValueOnce({ id: 1 });

      await service.remove(1, 999, true);

      expect(prisma.transparencyPost.update).toHaveBeenCalled();
    });

    it('deve bloquear usuario que nao e autor nem ADMIN', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        authorId: 100,
      });

      await expect(service.remove(1, 999, false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lancar NotFoundException quando post nao existe', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce(null);
      await expect(service.remove(999, 100, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
