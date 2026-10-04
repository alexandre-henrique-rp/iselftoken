/**
 * Testes do FeaturedReportService (TRANSP-03 endpoint dedicated).
 *
 * Cobre:
 *  - retorna post vigente do mes atual (financial_report)
 *  - retorna null/cache hit quando nao ha post
 *  - cache key com TTL 300s
 *  - LGPD: payload NAO contem cpf/email
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TransparencyPostType } from '@prisma/client';
import {
  FeaturedReportService,
  FEATURED_REPORT_CACHE_TTL_S,
} from './featured-report.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FeaturedReportService', () => {
  let service: FeaturedReportService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      transparencyPost: { findFirst: jest.fn() },
    };
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturedReportService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'IOREDIS_CLIENT', useValue: redis },
      ],
    }).compile();

    service = module.get<FeaturedReportService>(FeaturedReportService);
  });

  const buildPost = () => ({
    id: 1,
    startupId: 50,
    type: TransparencyPostType.FINANCIAL_REPORT,
    title: 'Relatorio Jan/2026',
    content: 'Conteudo do relatorio financeiro',
    periodMonth: 1,
    periodYear: 2026,
    publishedAt: new Date(),
    updatedAt: new Date(),
    author: { id: 100, nome: 'Founder' },
    attachments: [
      {
        uploadId: 1,
        upload: {
          id: 1,
          publicId: 'p1',
          originalName: 'doc.pdf',
          mimeType: 'application/pdf',
          url: 's3://x',
        },
      },
    ],
  });

  it('retorna post vigente do mes atual', async () => {
    redis.get.mockResolvedValueOnce(null);
    prisma.transparencyPost.findFirst.mockResolvedValueOnce(buildPost());
    const fixedNow = new Date('2026-01-15T12:00:00Z');
    const result = await service.getFeaturedReport(50, fixedNow);
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Relatorio Jan/2026');
    expect(prisma.transparencyPost.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startupId: 50,
          type: TransparencyPostType.FINANCIAL_REPORT,
          periodMonth: 1,
          periodYear: 2026,
          deletedAt: null,
        }),
      }),
    );
  });

  it('retorna null quando nao ha post vigente e cacheia com sentinel', async () => {
    redis.get.mockResolvedValueOnce(null);
    prisma.transparencyPost.findFirst.mockResolvedValueOnce(null);
    const fixedNow = new Date('2026-08-15T12:00:00Z');
    const result = await service.getFeaturedReport(50, fixedNow);
    expect(result).toBeNull();
    expect(redis.set).toHaveBeenCalledWith(
      'transparency:vigente:50',
      '__null__',
      'EX',
      FEATURED_REPORT_CACHE_TTL_S,
    );
  });

  it('sempre usa TTL de 300s e chave "transparency:vigente:{startupId}"', async () => {
    redis.get.mockResolvedValueOnce(null);
    prisma.transparencyPost.findFirst.mockResolvedValueOnce(buildPost());
    await service.getFeaturedReport(42, new Date('2026-01-01T00:00:00Z'));
    expect(redis.set).toHaveBeenCalledWith(
      'transparency:vigente:42',
      expect.any(String),
      'EX',
      300,
    );
  });

  it('hit do cache retorna direto sem hit do DB', async () => {
    const cached = buildPost();
    redis.get.mockResolvedValueOnce(JSON.stringify(cached));
    const result = await service.getFeaturedReport(50, new Date());
    expect(prisma.transparencyPost.findFirst).not.toHaveBeenCalled();
    expect(result?.id).toBe(cached.id);
  });

  it('LGPD: payload NAO contem cpf/email/phone', async () => {
    redis.get.mockResolvedValueOnce(null);
    prisma.transparencyPost.findFirst.mockResolvedValueOnce(buildPost());
    const result = await service.getFeaturedReport(50, new Date('2026-01-01'));
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/cpf/);
    expect(json).not.toMatch(/email/);
    expect(json).not.toMatch(/telefone/);
    expect(json).not.toMatch(/phone/);
  });

  it('invalidate remove a chave do cache', async () => {
    await service.invalidate(50);
    expect(redis.del).toHaveBeenCalledWith('transparency:vigente:50');
  });

  it('funciona mesmo sem Redis (fallback)', async () => {
    const moduleNoRedis: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturedReportService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'IOREDIS_CLIENT', useValue: undefined },
      ],
    }).compile();
    const svc = moduleNoRedis.get<FeaturedReportService>(FeaturedReportService);
    prisma.transparencyPost.findFirst.mockResolvedValueOnce(buildPost());
    const result = await svc.getFeaturedReport(50, new Date('2026-01-01'));
    expect(result?.id).toBe(1);
  });
});
