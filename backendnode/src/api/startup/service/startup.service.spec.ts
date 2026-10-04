import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validateCategoryAreaCoherence } from 'src/common/validators/category-area-coherence.validator';

jest.mock('@sentry/nestjs', () => ({
  Sentry: {
    startSpan: jest.fn((opts: any, fn: any) => fn()),
  },
}));

/**
 * Spec leve do StartupService (facade).
 * Testa apenas: 1) delegação e 2) validator standalone.
 * Os 4 sub-services têm seus próprios specs isolados.
 */
describe('StartupService — facade delegation', () => {
  it('delegates create to StartupCrudService', async () => {
    const mockCrud = { create: jest.fn().mockResolvedValue({ error: false }) };
    const { StartupService } = await import('./startup.service');
    const svc = new StartupService(
      mockCrud as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const dto = { nomeFantasia: 'X' } as any;
    const user = { id: 1 } as any;
    await svc.create(dto, user);
    expect(mockCrud.create).toHaveBeenCalledWith(dto, user);
  });

  it('delegates findAll to StartupQueryService', async () => {
    const mockQuery = {
      findAll: jest.fn().mockResolvedValue({ error: false }),
    };
    const { StartupService } = await import('./startup.service');
    const svc = new StartupService(
      {} as any,
      mockQuery as any,
      {} as any,
      {} as any,
    );

    const user = { id: 1 } as any;
    await svc.findAll(user);
    expect(mockQuery.findAll).toHaveBeenCalledWith(user);
  });

  it('delegates pauseRound to StartupRoundService', async () => {
    const mockRound = {
      pauseRound: jest.fn().mockResolvedValue({ error: false }),
    };
    const { StartupService } = await import('./startup.service');
    const svc = new StartupService(
      {} as any,
      {} as any,
      mockRound as any,
      {} as any,
    );

    const user = { id: 1 } as any;
    await svc.pauseRound(10, 20, user);
    expect(mockRound.pauseRound).toHaveBeenCalledWith(10, 20, user);
  });

  it('delegates saveDraft to StartupDraftService', async () => {
    const mockDraft = {
      saveDraft: jest.fn().mockResolvedValue({ error: false }),
    };
    const { StartupService } = await import('./startup.service');
    const svc = new StartupService(
      {} as any,
      {} as any,
      {} as any,
      mockDraft as any,
    );

    await svc.saveDraft(1, { data: true });
    expect(mockDraft.saveDraft).toHaveBeenCalledWith(1, { data: true });
  });
});

describe('validateCategoryAreaCoherence — standalone', () => {
  it('passa quando areaAtuacao.categoryId === categoryId', async () => {
    const mockPrisma = {
      areaAtuacao: {
        findUnique: jest.fn().mockResolvedValue({
          id: 5,
          nome: 'Conta Digital PJ',
          categoryId: 1,
          category: { id: 1, nome: 'Fintech' },
        }),
      },
    } as any;

    await expect(
      validateCategoryAreaCoherence(1, 5, mockPrisma),
    ).resolves.toBeUndefined();
  });

  it('lança BadRequestException quando categoryId !== areaAtuacao.categoryId', async () => {
    const mockPrisma = {
      areaAtuacao: {
        findUnique: jest.fn().mockResolvedValue({
          id: 8,
          nome: 'Educação Básica',
          categoryId: 2,
          category: { id: 2, nome: 'Edtech' },
        }),
      },
    } as any;

    await expect(
      validateCategoryAreaCoherence(1, 8, mockPrisma),
    ).rejects.toThrow(BadRequestException);
  });

  it('lança NotFoundException quando areaAtuacaoId não existe', async () => {
    const mockPrisma = {
      areaAtuacao: { findUnique: jest.fn().mockResolvedValue(null) },
    } as any;

    await expect(
      validateCategoryAreaCoherence(1, 999, mockPrisma),
    ).rejects.toThrow(NotFoundException);
  });
});
