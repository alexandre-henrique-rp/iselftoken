/**
 * Specs do TransparencyAutoPostService (FIN-10).
 *
 * Cobre:
 * - handleInstallmentApproved cria TransparencyPost UMA vez
 * - Disparo duplicado do mesmo evento NAO cria segundo post (idempotente)
 * - handleInstallmentCompleted ATUALIZA o post existente
 */
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransparencyAutoPostService } from './transparency-auto-post.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransparencyService } from './transparency.service';

describe('TransparencyAutoPostService', () => {
  let service: TransparencyAutoPostService;
  let prisma: any;
  let events: EventEmitter2;
  let transparency: any;

  const NOW = new Date('2026-08-20T12:00:00');

  beforeEach(async () => {
    prisma = {
      transparencyPost: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      installment: {
        findUnique: jest.fn(),
      },
      installmentRequest: {
        findUnique: jest.fn(),
      },
      repasse: {
        findUnique: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };
    transparency = {
      // stub - nao usado diretamente pelo auto-post
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransparencyAutoPostService,
        EventEmitter2,
        { provide: PrismaService, useValue: prisma },
        { provide: TransparencyService, useValue: transparency },
      ],
    }).compile();

    service = module.get(TransparencyAutoPostService);
    events = module.get(EventEmitter2);
  });

  describe('handleInstallmentApproved', () => {
    it('cria TransparencyPost no evento installment.approved', async () => {
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
        observacao: 'Observacao teste',
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
      });
      prisma.transparencyPost.create.mockImplementation((args: any) => ({
        id: 999,
        ...args.data,
      }));

      await service.handleInstallmentApproved({
        installmentId: 10,
        requestId: 100,
        startupId: 1,
        founderUserId: 50,
        valor: 33333.33,
        allocationPercents: {
          marketing: 20,
          desenvolvimento: 20,
          infraestrutura: 10,
          pessoal: 20,
          juridico: 10,
          operacional: 10,
          reservaCaixa: 10,
        },
        observacao: 'Observacao teste',
      });

      expect(prisma.transparencyPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startupId: 1,
            type: 'FINANCIAL_REPORT',
            sourceType: 'INSTALLMENT_REQUEST',
            sourceId: '100',
            title: 'Solicitacao de Repasse aprovada - Parcela 1/12',
            content: expect.stringContaining('1/12'),
          }),
        }),
      );
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
        allocationPercents: {},
      });

      expect(prisma.transparencyPost.create).not.toHaveBeenCalled();
    });

    it('evento idempotente via UNIQUE (race condition): UNIQUE constraint trata concorrencia', async () => {
      // Simula race: findFirst retorna null, mas create da erro P2002
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

      // Nao deve lancar — servico trata idempotentemente
      await expect(
        service.handleInstallmentApproved({
          installmentId: 10,
          requestId: 100,
          startupId: 1,
          founderUserId: 50,
          valor: 100,
          allocationPercents: {},
        }),
      ).resolves.toBeUndefined();
    });

    // ============ FIN-11 §8.2 — Relatorio do Mes no auto-post ============
    describe('relatorio do mes (FIN-11 §8.2)', () => {
      const baseRequest = {
        id: 100,
        installmentId: 10,
        startupId: 1,
        founderUserId: 50,
        valorSolicitado: { toString: () => '33333.33' },
        allocationPercents: {
          marketing: 20,
          desenvolvimento: 20,
          infraestrutura: 10,
          pessoal: 20,
          juridico: 10,
          operacional: 10,
          reservaCaixa: 10,
        },
      };
      const baseInstallment = {
        id: 10,
        numero: 1,
        repasseId: 5,
        repasse: { numeroParcelas: 12 },
      };

      it('adiciona secao Relatorio do Mes quando mensagemInvestidores + marco vem do payload', async () => {
        prisma.transparencyPost.findFirst.mockResolvedValue(null);
        prisma.installmentRequest.findUnique.mockResolvedValue(baseRequest);
        prisma.installment.findUnique.mockResolvedValue(baseInstallment);
        prisma.user.findUnique.mockResolvedValue({ id: 50, nome: 'Maria' });
        prisma.transparencyPost.create.mockResolvedValue({ id: 500 });

        await service.handleInstallmentApproved({
          installmentId: 10,
          requestId: 100,
          startupId: 1,
          founderUserId: 50,
          valor: 33333.33,
          allocationPercents: {},
          mensagemInvestidores: 'Mes de muito progresso',
          marcoAlcancado: true,
          marcoDescricao: 'Lancamento do beta',
          usoRecurso: 'Captacao para equipe',
          observacao: undefined,
        });

        expect(prisma.transparencyPost.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              content: expect.stringContaining('Relatorio do Mes'),
            }),
          }),
        );
        expect(prisma.transparencyPost.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              content: expect.stringContaining('Mes de muito progresso'),
            }),
          }),
        );
        expect(prisma.transparencyPost.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              content: expect.stringContaining('Lancamento do beta'),
            }),
          }),
        );
      });

      it('le dados do relatorio do payload OU do InstallmentRequest (fallback)', async () => {
        prisma.transparencyPost.findFirst.mockResolvedValue(null);
        prisma.installmentRequest.findUnique.mockResolvedValue({
          ...baseRequest,
          // Dados persistidos no InstallmentRequest
          mensagemInvestidores: 'Mensagem persistida',
          marcoAlcancado: true,
          marcoDescricao: 'Marco persistido',
        });
        prisma.installment.findUnique.mockResolvedValue(baseInstallment);
        prisma.user.findUnique.mockResolvedValue({ id: 50, nome: 'Maria' });
        prisma.transparencyPost.create.mockResolvedValue({ id: 500 });

        await service.handleInstallmentApproved({
          installmentId: 10,
          requestId: 100,
          startupId: 1,
          founderUserId: 50,
          valor: 33333.33,
          allocationPercents: {},
          // payload NAO envia campos do relatorio — fallback para o DB
        });

        expect(prisma.transparencyPost.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              content: expect.stringContaining('Mensagem persistida'),
            }),
          }),
        );
        expect(prisma.transparencyPost.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              content: expect.stringContaining('Marco persistido'),
            }),
          }),
        );
      });

      it('nao adiciona secao Relatorio quando nenhum campo foi preenchido', async () => {
        prisma.transparencyPost.findFirst.mockResolvedValue(null);
        prisma.installmentRequest.findUnique.mockResolvedValue(baseRequest);
        prisma.installment.findUnique.mockResolvedValue(baseInstallment);
        prisma.user.findUnique.mockResolvedValue({ id: 50, nome: 'Maria' });
        prisma.transparencyPost.create.mockResolvedValue({ id: 500 });

        await service.handleInstallmentApproved({
          installmentId: 10,
          requestId: 100,
          startupId: 1,
          founderUserId: 50,
          valor: 33333.33,
          allocationPercents: {},
        });

        const createCall = prisma.transparencyPost.create.mock.calls[0][0];
        expect(createCall.data.content).not.toContain('Relatorio do Mes');
      });

      it('renderiza "Teve lucro: Sim/Nao" quando boolean explicito', async () => {
        prisma.transparencyPost.findFirst.mockResolvedValue(null);
        prisma.installmentRequest.findUnique.mockResolvedValue(baseRequest);
        prisma.installment.findUnique.mockResolvedValue(baseInstallment);
        prisma.user.findUnique.mockResolvedValue({ id: 50, nome: 'Maria' });
        prisma.transparencyPost.create.mockResolvedValue({ id: 500 });

        await service.handleInstallmentApproved({
          installmentId: 10,
          requestId: 100,
          startupId: 1,
          founderUserId: 50,
          valor: 33333.33,
          allocationPercents: {},
          teveLucro: true,
        });

        const createCall = prisma.transparencyPost.create.mock.calls[0][0];
        expect(createCall.data.content).toContain('Teve lucro no periodo?');
        expect(createCall.data.content).toContain('Sim');
      });
    });
  });

  describe('handleInstallmentCompleted', () => {
    it('ATUALIZA o post existente com secao Status Final', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValue({
        id: 999,
        sourceType: 'INSTALLMENT_REQUEST',
        sourceId: '100',
        content: '## Aprovacao antiga...',
      });
      prisma.installmentRequest.findUnique.mockResolvedValue({
        id: 100,
        txidC6: 'C6TX123',
        completedAt: NOW,
      });
      prisma.transparencyPost.update.mockResolvedValue({ id: 999 });

      await service.handleInstallmentCompleted({
        installmentId: 10,
        requestId: 100,
        startupId: 1,
      });

      expect(prisma.transparencyPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 999 },
          data: expect.objectContaining({
            content: expect.stringContaining('Status Final'),
          }),
        }),
      );
      expect(prisma.transparencyPost.create).not.toHaveBeenCalled();
    });

    it('se nao existir post, gera novo (fallback APPROVED pulou para COMPLETED)', async () => {
      prisma.transparencyPost.findFirst.mockResolvedValue(null);
      prisma.installmentRequest.findUnique.mockResolvedValue({
        id: 100,
        installmentId: 10,
        startupId: 1,
        founderUserId: 50,
        valorSolicitado: { toString: () => '33333.33' },
        allocationPercents: {
          marketing: 100,
          desenvolvimento: 0,
          infraestrutura: 0,
          pessoal: 0,
          juridico: 0,
          operacional: 0,
          reservaCaixa: 0,
        },
        txidC6: 'TX999',
        completedAt: NOW,
      });
      prisma.installment.findUnique.mockResolvedValue({
        id: 10,
        numero: 1,
        repasseId: 5,
        repasse: { numeroParcelas: 12 },
      });
      prisma.user.findUnique.mockResolvedValue({ id: 50, nome: 'Maria' });
      prisma.transparencyPost.create.mockResolvedValue({ id: 1000 });

      await service.handleInstallmentCompleted({
        installmentId: 10,
        requestId: 100,
        startupId: 1,
      });

      expect(prisma.transparencyPost.create).toHaveBeenCalled();
    });
  });
});
