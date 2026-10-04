/**
 * Testes do DiscussionsService (TRANSP-03).
 *
 * Cobre:
 *  - create (rate limit, autor=req.user)
 *  - update/delete (autor<24h, ADMIN bypass, force flag)
 *  - upvote toggle (idempotencia)
 *  - pin atomicity (1 pinned por startup)
 *  - buildAuthorPublicId (anon vs identificado)
 *  - LGPD: payload NAO contem cpf/email/phone
 *  - rate limit 5 threads/dia
 *  - max 200 replies/thread
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DiscussionCategory } from '@prisma/client';
import {
  DiscussionsService,
  MAX_REPLIES_PER_THREAD,
} from './discussions.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/audit/audit.service';

describe('DiscussionsService', () => {
  let service: DiscussionsService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn() },
      transparencyDiscussion: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      transparencyReply: {
        create: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      discussionUpvote: {
        create: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((fn) =>
        typeof fn === 'function' ? fn(prisma) : Promise.all(fn),
      ),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<DiscussionsService>(DiscussionsService);
  });

  // ---------- buildAuthorPublicId ----------

  describe('buildAuthorPublicId', () => {
    it('retorna "Nome Inicial." quando isAnonymous=true e nome tem 2+ partes', () => {
      expect(service.buildAuthorPublicId({ nome: 'Ana Silva' }, true)).toBe(
        'Ana S.',
      );
      expect(
        service.buildAuthorPublicId({ nome: 'Maria Joao Costa' }, true),
      ).toBe('Maria C.');
    });
    it('retorna apenas a primeira parte quando isAnonymous=true e nome eh so uma palavra', () => {
      expect(service.buildAuthorPublicId({ nome: 'Cher' }, true)).toBe('Cher');
    });
    it('retorna nome completo quando isAnonymous=false', () => {
      expect(service.buildAuthorPublicId({ nome: 'Ana Silva' }, false)).toBe(
        'Ana Silva',
      );
    });
    it('retorna "Anonimo" para nome vazio', () => {
      expect(service.buildAuthorPublicId({ nome: '' }, true)).toBe('Anonimo');
      expect(service.buildAuthorPublicId({ nome: '  ' }, false)).toBe(
        'Anonimo',
      );
    });
  });

  // ---------- create ----------

  describe('create', () => {
    it('cria thread do autor e grava audit', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({ id: 50 });
      prisma.transparencyDiscussion.count.mockResolvedValueOnce(0);
      prisma.transparencyDiscussion.create.mockResolvedValueOnce({
        id: 'd1',
        startupId: 50,
        authorId: 100,
        title: 'titulo valido abcde',
        content: 'conteudo valido abcdefg',
        category: DiscussionCategory.GERAL,
        isAnonymous: false,
        upvotesCount: 0,
        isPinned: false,
      });
      const r = await service.create(50, 100, {
        title: 'titulo valido abcde',
        content: 'conteudo valido abcdefg',
      });
      expect(r.id).toBe('d1');
      expect(prisma.transparencyDiscussion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ category: DiscussionCategory.GERAL }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_DISCUSSION' }),
      );
    });

    it('rejeita com ForbiddenException quando atinge 5 threads/dia (rate limit)', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({ id: 50 });
      prisma.transparencyDiscussion.count.mockResolvedValueOnce(5);
      await expect(
        service.create(50, 100, {
          title: 'titulo valido abcde',
          content: 'conteudo valido abcdefg',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException quando startup nao existe', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create(999, 100, {
          title: 'titulo valido abcde',
          content: 'conteudo valido abcdefg',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- update ----------

  describe('update', () => {
    it('permite autor dentro de 24h', async () => {
      const recent = new Date();
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        authorId: 100,
        createdAt: recent,
        deletedAt: null,
      });
      prisma.transparencyDiscussion.update.mockResolvedValueOnce({ id: 'd1' });
      await service.update('d1', 100, false, { title: 'novo titulo valido' });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_DISCUSSION' }),
      );
    });

    it('rejeita autor fora da janela de 24h', async () => {
      const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        authorId: 100,
        createdAt: old,
        deletedAt: null,
      });
      await expect(
        service.update('d1', 100, false, { title: 'novo titulo' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN pode editar sem restricao', async () => {
      const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        authorId: 100,
        createdAt: old,
        deletedAt: null,
      });
      prisma.transparencyDiscussion.update.mockResolvedValueOnce({ id: 'd1' });
      await service.update('d1', 999, true, { title: 'editado por admin' });
      expect(prisma.transparencyDiscussion.update).toHaveBeenCalled();
    });

    it('rejeita quem nao e autor nem ADMIN', async () => {
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        authorId: 100,
        createdAt: new Date(),
        deletedAt: null,
      });
      await expect(
        service.update('d1', 999, false, { title: 'x' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------- remove ----------

  describe('remove', () => {
    it('soft delete do autor sem replies nao exige force', async () => {
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        authorId: 100,
        createdAt: new Date(),
        _count: { replies: 0 },
      });
      prisma.transparencyDiscussion.update.mockResolvedValueOnce({ id: 'd1' });
      await service.remove('d1', 100, false, false);
      expect(prisma.transparencyDiscussion.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE_DISCUSSION' }),
      );
    });

    it('rejeita delete de thread COM replies sem force=true', async () => {
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        authorId: 100,
        createdAt: new Date(),
        _count: { replies: 3 },
      });
      await expect(service.remove('d1', 100, false, false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('permite delete COM replies quando force=true', async () => {
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        authorId: 100,
        createdAt: new Date(),
        _count: { replies: 3 },
      });
      prisma.transparencyDiscussion.update.mockResolvedValueOnce({ id: 'd1' });
      await service.remove('d1', 100, false, true);
      expect(prisma.transparencyDiscussion.update).toHaveBeenCalled();
    });
  });

  // ---------- toggleUpvote ----------

  describe('toggleUpvote', () => {
    it('cria upvote e incrementa contador quando nao existe', async () => {
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        upvotesCount: 2,
      });
      prisma.discussionUpvote.findUnique.mockResolvedValueOnce(null);
      prisma.$transaction.mockImplementationOnce(async (ops: any) => {
        await Promise.all(ops);
        return [{ id: 'u1' }, { upvotesCount: 3 }];
      });
      const result = await service.toggleUpvote('d1', 100);
      expect(result.upvotesCount).toBe(3);
      expect(result.viewerHasUpvoted).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DISCUSSION_UPVOTE' }),
      );
    });

    it('remove upvote e decrementa contador quando ja existe', async () => {
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        upvotesCount: 3,
      });
      prisma.discussionUpvote.findUnique.mockResolvedValueOnce({ id: 'u1' });
      prisma.$transaction.mockImplementationOnce(async (ops: any) => {
        await Promise.all(ops);
        return [{}, { upvotesCount: 2 }];
      });
      const result = await service.toggleUpvote('d1', 100);
      expect(result.upvotesCount).toBe(2);
      expect(result.viewerHasUpvoted).toBe(false);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DISCUSSION_UNVOTE' }),
      );
    });
  });

  // ---------- pin ----------

  describe('pin', () => {
    it('garante atomicidade: 1 pinned por startup', async () => {
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        startupId: 50,
      });
      prisma.startup.findUnique.mockResolvedValueOnce({ founderId: 100 });
      // updateMany para desfixar as outras
      prisma.transparencyDiscussion.updateMany.mockResolvedValueOnce({
        count: 1,
      });
      prisma.transparencyDiscussion.update.mockResolvedValueOnce({
        id: 'd1',
        isPinned: true,
      });
      await service.pin('d1', 100, false);
      expect(prisma.transparencyDiscussion.updateMany).toHaveBeenCalledWith({
        where: {
          startupId: 50,
          isPinned: true,
          NOT: { id: 'd1' },
        },
        data: { isPinned: false },
      });
      expect(prisma.transparencyDiscussion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'd1' },
          data: expect.objectContaining({
            isPinned: true,
            pinnedByUserId: 100,
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DISCUSSION_PIN' }),
      );
    });

    it('rejeita pin por user que nao e founder nem ADMIN', async () => {
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        startupId: 50,
      });
      prisma.startup.findUnique.mockResolvedValueOnce({ founderId: 999 });
      await expect(service.pin('d1', 100, false)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ---------- createReply ----------

  describe('createReply', () => {
    it('rejeita quando atinge 200 replies/thread (cap)', async () => {
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
      });
      prisma.transparencyReply.count.mockResolvedValueOnce(
        MAX_REPLIES_PER_THREAD,
      );
      await expect(
        service.createReply('d1', 100, { content: 'reply qualquer' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------- LGPD ----------

  describe('LGPD', () => {
    it('list() nunca inclui cpf/email/phone no payload (apenas id/nome/publicId)', async () => {
      const recent = new Date();
      prisma.transparencyDiscussion.findMany.mockResolvedValueOnce([
        {
          id: 'd1',
          startupId: 50,
          authorId: 100,
          title: 'titulo valido abcde',
          content: 'conteudo valido abc',
          category: DiscussionCategory.GERAL,
          isAnonymous: false,
          upvotesCount: 5,
          isPinned: false,
          pinnedAt: null,
          createdAt: recent,
          updatedAt: recent,
          deletedAt: null,
          author: { id: 100, nome: 'Test User', publicId: 'uuid-1' },
          replies: [],
          _count: { replies: 3 },
        },
      ]);
      prisma.transparencyDiscussion.count.mockResolvedValueOnce(1);
      const result = await service.list(50, {} as any);
      const json = JSON.stringify(result);
      expect(json).not.toMatch(/email/);
      expect(json).not.toMatch(/cpf/);
      expect(json).not.toMatch(/telefone/);
      expect(json).not.toMatch(/phone/);
      expect(json).not.toMatch(/reg_documento/);
    });

    it('findOne() nunca inclui cpf/email/phone', async () => {
      const recent = new Date();
      prisma.transparencyDiscussion.findFirst.mockResolvedValueOnce({
        id: 'd1',
        startupId: 50,
        authorId: 100,
        title: 't',
        content: 'c',
        category: DiscussionCategory.GERAL,
        isAnonymous: false,
        upvotesCount: 1,
        isPinned: false,
        pinnedAt: null,
        createdAt: recent,
        updatedAt: recent,
        deletedAt: null,
        author: { id: 100, nome: 'A B', publicId: 'p1' },
      });
      prisma.discussionUpvote.findUnique.mockResolvedValueOnce(null);
      prisma.transparencyReply.findMany.mockResolvedValueOnce([]);
      const result = await service.findOne('d1', 200);
      const json = JSON.stringify(result);
      expect(json).not.toMatch(/email/);
      expect(json).not.toMatch(/cpf/);
      expect(json).not.toMatch(/telefone/);
      expect(json).not.toMatch(/phone/);
    });
  });
});
