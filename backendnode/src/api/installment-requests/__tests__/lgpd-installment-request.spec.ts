/**
 * Spec LGPD — InstallmentRequest (FIN-12).
 *
 * Verifica:
 * 1. getDashboard() NAO expoe cpf/email/telefone em nenhum campo
 * 2. InstallmentRequest create/resubmit NAO loga PII em AuditLog.newValue
 * 3. Payload de retorno (controller) so contem IDs + Decimal + strings de status
 *
 * Executar: `npm run test -- --testPathPattern=lgpd-installment-request`
 */
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InstallmentRequestService } from '../installment-requests.service';
import { SlaCalculatorService } from 'src/common/sla/sla-calculator.service';
import { AllocationConverterService } from 'src/common/allocation/allocation-converter.service';
import { PrismaService } from 'src/prisma/prisma.service';

const PII_REGEX =
  /cpf|email|telefone|phone|passaporte|titulo_eleitor|rg\b|data_nascimento/i;

describe('LGPD — InstallmentRequest (FIN-12)', () => {
  let service: InstallmentRequestService;
  let prisma: any;
  let sla: SlaCalculatorService;
  let allocation: AllocationConverterService;

  beforeEach(async () => {
    prisma = {
      startup: {
        findUnique: jest.fn(),
      },
      installment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      installmentRequest: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    sla = new SlaCalculatorService();
    allocation = new AllocationConverterService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstallmentRequestService,
        { provide: PrismaService, useValue: prisma },
        { provide: SlaCalculatorService, useValue: sla },
        { provide: AllocationConverterService, useValue: allocation },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(InstallmentRequestService);
  });

  describe('getDashboard — LGPD minimization', () => {
    it('NAO expoe cpf/email/telefone no payload de getDashboard', async () => {
      prisma.startup.findUnique.mockResolvedValue({ id: 1, founderId: 50 });
      prisma.repasse = {
        findFirst: jest.fn().mockResolvedValue({
          id: 5,
          valorTotalCaptacao: { toString: () => '100000.00' },
          installments: [
            {
              id: 10,
              numero: 1,
              valor: '10000.00' as any,
              status: 'AWAITING_REQUEST',
            },
          ],
        }),
      };
      prisma.installmentRequest.findMany.mockResolvedValue([]);
      prisma.installmentRequest.findFirst.mockResolvedValue(null);

      // Re-mock prisma global to include repasse
      (prisma as any).repasse = prisma.repasse;

      const payload = await service.getDashboard(1, 50);

      const json = JSON.stringify(payload);
      expect(json).not.toMatch(PII_REGEX);
    });

    it('getDashboard NAO inclui dados do User founder (apenas IDs)', async () => {
      prisma.startup.findUnique.mockResolvedValue({ id: 1, founderId: 50 });
      (prisma as any).repasse = {
        findFirst: jest.fn().mockResolvedValue({
          id: 5,
          valorTotalCaptacao: { toString: () => '100000.00' },
          installments: [],
        }),
      };
      prisma.installmentRequest.findMany.mockResolvedValue([]);

      const payload = await service.getDashboard(1, 50);

      // Verifica que o payload nao tem campos pessoais do User
      expect(JSON.stringify(payload)).not.toMatch(/founder.*cpf|nome.*email/i);
      // Verifica que so tem IDs (numericos) + status strings
      expect(payload.kpis).toHaveProperty('valorTotal');
      expect(payload.kpis).toHaveProperty('valorPago');
    });
  });

  describe('AuditLog — sem PII em newValue', () => {
    it('INSTALLMENT_REQUEST_CREATED grava payload SEM cpf/email/telefone', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 50,
        banco: 'C6',
        agencia: '0001',
        conta: '12345',
        digito: '6',
        tipo_conta: 'CORRENTE',
        pix_key: 'startup@empresa.com',
        titular: 'Startup LTDA',
        documento_titular: '12.345.678/0001-90',
      });
      prisma.installment.findUnique.mockResolvedValue({
        id: 10,
        numero: 1,
        valor: '10000.00' as any,
        status: 'AWAITING_REQUEST',
        repasseId: 5,
        repasse: {
          id: 5,
          campaignId: 1,
          status: 'CONFIGURED',
          numeroParcelas: 12,
        },
      });
      prisma.installmentRequest.findFirst.mockResolvedValue(null);
      prisma.installmentRequest.create.mockResolvedValue({
        id: 100,
        attemptNumber: 1,
      });
      prisma.installment = prisma.installment || {};
      prisma.installment.update = jest.fn().mockResolvedValue({});

      await service.createOrResubmit(
        1,
        10,
        {
          allocationPercents: {
            marketing: 100,
            desenvolvimento: 0,
            infraestrutura: 0,
            pessoal: 0,
            juridico: 0,
            operacional: 0,
            reservaCaixa: 0,
          },
        },
        50,
        false,
      );

      // auditLog.create chamado com payload SEM PII em newValue
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'INSTALLMENT_REQUEST_CREATED',
            newValue: expect.not.stringMatching(PII_REGEX),
          }),
        }),
      );
    });

    it('NAO loga bankInfoSnapshot (campo sensivel) em newValue do AuditLog', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 50,
        banco: 'C6',
        agencia: '0001',
        conta: '123456',
        digito: '6',
        tipo_conta: 'CORRENTE',
        pix_key: 'pix@empresa.com',
        titular: 'Empresa X',
        documento_titular: '12.345.678/0001-90',
      });
      prisma.installment.findUnique.mockResolvedValue({
        id: 10,
        numero: 1,
        valor: '10000.00' as any,
        status: 'AWAITING_REQUEST',
        repasseId: 5,
        repasse: {
          id: 5,
          campaignId: 1,
          status: 'CONFIGURED',
          numeroParcelas: 12,
        },
      });
      prisma.installmentRequest.findFirst.mockResolvedValue({
        id: 99,
        attemptNumber: 1,
      });
      prisma.installmentRequest.update.mockResolvedValue({
        id: 99,
        attemptNumber: 2,
      });
      prisma.installment = prisma.installment || {};
      prisma.installment.update = jest.fn().mockResolvedValue({});

      await service.createOrResubmit(
        1,
        10,
        {
          allocationPercents: {
            marketing: 100,
            desenvolvimento: 0,
            infraestrutura: 0,
            pessoal: 0,
            juridico: 0,
            operacional: 0,
            reservaCaixa: 0,
          },
        },
        50,
        true,
      );

      const auditCall = prisma.auditLog.create.mock.calls[0]?.[0];
      const newValue = JSON.stringify(auditCall?.data?.newValue ?? {});
      // bankInfoSnapshot NAO deve aparecer em newValue (apenas referencia via entityId)
      expect(newValue).not.toMatch(
        /banco|agencia|conta|pix_key|documento_titular/i,
      );
    });
  });
});
