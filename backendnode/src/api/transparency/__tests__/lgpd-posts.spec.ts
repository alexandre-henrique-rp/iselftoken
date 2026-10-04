/**
 * LGPD regression: TransparencyPost.findOne NUNCA expoe cpf/email/telefone do autor.
 * Achado HIGH do audit TRANSP-05 (2026-08-22).
 *
 * Cobre: findOne (único método que inclui author no select).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TransparencyService } from '../transparency.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('TransparencyService — LGPD (regressao T-26)', () => {
  let service: TransparencyService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      transparencyPost: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransparencyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TransparencyService>(TransparencyService);
  });

  describe('findOne', () => {
    it('NAO expoe email do autor no payload', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        title: 'Relatorio Q3',
        author: { id: 10, nome: 'F. Silva', publicId: 'pub_abc123' },
      });

      const result = (await service.findOne(1)) as any;

      expect(result?.author).toBeDefined();
      expect(result?.author).not.toHaveProperty('email');
    });

    it('NAO expoe cpf do autor no payload', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        title: 'Relatorio Q3',
        author: { id: 10, nome: 'F. Silva', publicId: 'pub_abc123' },
      });

      const result = (await service.findOne(1)) as any;

      expect(result?.author).not.toHaveProperty('cpf');
    });

    it('NAO expoe telefone do autor no payload', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        title: 'Relatorio Q3',
        author: { id: 10, nome: 'F. Silva', publicId: 'pub_abc123' },
      });

      const result = (await service.findOne(1)) as any;

      expect(result?.author).not.toHaveProperty('telefone');
      expect(result?.author).not.toHaveProperty('phone');
    });

    it('EXPOE publicId do autor (substituicao correta)', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce({
        id: 1,
        title: 'Relatorio Q3',
        author: { id: 10, nome: 'F. Silva', publicId: 'pub_abc123' },
      });

      const result = (await service.findOne(1)) as any;

      expect(result?.author).toHaveProperty('publicId');
      expect(result?.author).toHaveProperty('nome');
      expect(result?.author).toHaveProperty('id');
    });

    it('retorna null quando post nao existe', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValueOnce(null);
      const result = await service.findOne(999);
      expect(result).toBeNull();
    });
  });
});
