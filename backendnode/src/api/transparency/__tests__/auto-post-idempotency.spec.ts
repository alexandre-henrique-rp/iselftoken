/**
 * Spec Idempotencia — TransparencyAutoPost (FIN-12).
 *
 * Verifica que o evento `installment.approved` eh idempotente:
 * - UNIQUE(sourceType, sourceId) impede 2 posts duplicados
 * - Disparos duplicados do mesmo evento NAO criam segundo post
 * - Race condition (P2002) eh tratada silenciosamente
 *
 * Executar: `npm run test -- --testPathPattern=auto-post-idempotency`
 */
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransparencyAutoPostService } from '../transparency-auto-post.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransparencyService } from '../transparency.service';

describe('TransparencyAutoPost — Idempotencia (FIN-12)', () => {
  let service: TransparencyAutoPostService;
  let prisma: any;
  let events: EventEmitter2;

  beforeEach(async () => {
    prisma = {
      transparencyPost: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      installment: { findUnique: jest.fn() },
      installmentRequest: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransparencyAutoPostService,
        EventEmitter2,
        { provide: PrismaService, useValue: prisma },
        { provide: TransparencyService, useValue: {} },
      ],
    }).compile();

    service = module.get(TransparencyAutoPostService);
    events = module.get(EventEmitter2);
  });

  it('disparo duplicado do mesmo evento NAO cria segundo post (idempotente)', async () => {
    prisma.transparencyPost.findFirst.mockResolvedValueOnce({
      id: 999,
      sourceType: 'INSTALLMENT_REQUEST',
      sourceId: '100',
    });

    await service.handleInstallmentApproved({
      installmentId: 10,
      requestId: 100,
      startupId: 1,
      founderUserId: 50,
      valor: 33333.33,
    });

    expect(prisma.transparencyPost.create).not.toHaveBeenCalled();
  });

  it('evento idempotente via UNIQUE constraint (race condition P2002)', async () => {
    prisma.transparencyPost.findFirst.mockResolvedValue(null);
    prisma.installmentRequest.findUnique.mockResolvedValue({
      id: 100,
      installmentId: 10,
      startupId: 1,
      founderUserId: 50,
      allocationPercents: {
        marketing: 100,
        desenvolvimento: 0,
        infraestrutura: 0,
        pessoal: 0,
        juridico: 0,
        operacional: 0,
        reservaCaixa: 0,
      },
      valorSolicitado: { toString: () => '100' },
    });
    prisma.installment.findUnique.mockResolvedValue({
      id: 10,
      numero: 1,
      repasseId: 5,
      repasse: { numeroParcelas: 12 },
    });
    prisma.user.findUnique.mockResolvedValue({ id: 50, nome: 'Maria' });
    prisma.transparencyPost.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['sourceType', 'sourceId'] },
    });

    // Mesmo se create falhar, o servico trata silenciosamente
    await expect(
      service.handleInstallmentApproved({
        installmentId: 10,
        requestId: 100,
        startupId: 1,
        founderUserId: 50,
        valor: 100,
      }),
    ).resolves.toBeUndefined();
  });

  it('handleInstallmentCompleted ATUALIZA post existente (idempotente)', async () => {
    prisma.transparencyPost.findFirst.mockResolvedValue({
      id: 999,
      content: '## Aprovacao antiga...',
    });
    prisma.installmentRequest.findUnique.mockResolvedValue({
      id: 100,
      txidC6: 'C6TX123',
      completedAt: new Date('2026-08-20T12:00:00Z'),
    });
    prisma.transparencyPost.update.mockResolvedValue({ id: 999 });

    await service.handleInstallmentCompleted({
      installmentId: 10,
      requestId: 100,
      startupId: 1,
    });

    // NUNCA cria novo post — apenas atualiza
    expect(prisma.transparencyPost.create).not.toHaveBeenCalled();
    expect(prisma.transparencyPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 999 } }),
    );
  });

  it('payload do post NAO contem cpf/email/telefone do founder', async () => {
    prisma.transparencyPost.findFirst.mockResolvedValue(null);
    prisma.installmentRequest.findUnique.mockResolvedValue({
      id: 100,
      installmentId: 10,
      startupId: 1,
      founderUserId: 50,
      allocationPercents: {
        marketing: 20,
        desenvolvimento: 20,
        infraestrutura: 10,
        pessoal: 20,
        juridico: 10,
        operacional: 10,
        reservaCaixa: 10,
      },
      valorSolicitado: { toString: () => '33333.33' },
    });
    prisma.installment.findUnique.mockResolvedValue({
      id: 10,
      numero: 1,
      repasseId: 5,
      repasse: { numeroParcelas: 12 },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 50,
      nome: 'Joao da Silva',
      cpf: '123.456.789-00', // hipotetico — service NAO deve expor
      email: 'joao@email.com',
    });
    let capturedContent = '';
    prisma.transparencyPost.create.mockImplementation((args: any) => {
      capturedContent = args.data.content;
      return { id: 999, ...args.data };
    });

    await service.handleInstallmentApproved({
      installmentId: 10,
      requestId: 100,
      startupId: 1,
      founderUserId: 50,
      valor: 33333.33,
    });

    expect(capturedContent).not.toMatch(/cpf|email|telefone|phone/i);
    // Deve ter o authorPublicId (nome derivado)
    expect(capturedContent).toContain('Joao da Silva');
  });
});
