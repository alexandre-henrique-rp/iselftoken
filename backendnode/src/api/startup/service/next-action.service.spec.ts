import { Test, TestingModule } from '@nestjs/testing';
import { NextActionService } from './next-action.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('NextActionService', () => {
  let service: NextActionService;
  let prisma: any;

  const mockPrisma = {
    payment: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NextActionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NextActionService>(NextActionService);
    prisma = mockPrisma;
    jest.clearAllMocks();
  });

  // ---- 1. PENDING_RESERVATION_PAYMENT → PAGAR_RESERVA ----

  it('PENDING_RESERVATION_PAYMENT → PAGAR_RESERVA com rota /checkout/payment/:paymentId', async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({ id: 42 });

    const result = await service.getNextAction(
      { id: 1, status: 'PENDING_RESERVATION_PAYMENT' },
      [],
    );

    expect(result?.tipo).toBe('PAGAR_RESERVA');
    expect(result?.label).toBe('Pagar reserva');
    expect(result?.rota).toBe('/checkout/payment/42');
  });

  it('PENDING_RESERVATION_PAYMENT sem payment pendente → null', async () => {
    mockPrisma.payment.findFirst.mockResolvedValue(null);

    const result = await service.getNextAction(
      { id: 1, status: 'PENDING_RESERVATION_PAYMENT' },
      [],
    );

    expect(result).toBeNull();
  });

  // ---- 2. REJECTED → REVISAR_DOCUMENTOS ----

  it('REJECTED → REVISAR_DOCUMENTOS', async () => {
    const result = await service.getNextAction(
      { id: 1, status: 'REJECTED' },
      [],
    );

    expect(result?.tipo).toBe('REVISAR_DOCUMENTOS');
    expect(result?.rota).toBe('/founder/compliance/status');
  });

  // ---- 3. DRAFT → CONFIGURAR ----

  it('DRAFT → CONFIGURAR com rota /startup/:id/edit', async () => {
    const result = await service.getNextAction({ id: 99, status: 'DRAFT' }, []);

    expect(result?.tipo).toBe('CONFIGURAR');
    expect(result?.label).toBe('Configurar');
    expect(result?.rota).toBe('/startup/99/edit');
  });

  // ---- 4. APPROVED + campaign OPEN → CAMPANHA_EM_ANDAMENTO ----

  it('APPROVED + 1 campaign OPEN → CAMPANHA_EM_ANDAMENTO', async () => {
    const result = await service.getNextAction({ id: 5, status: 'APPROVED' }, [
      { status: 'OPEN' },
    ]);

    expect(result?.tipo).toBe('CAMPANHA_EM_ANDAMENTO');
    expect(result?.rota).toBe('/startup/5/dashboard');
  });

  // ---- 5. APPROVED + campaign FUNDED → NOVA_RODADA ----

  it('APPROVED + 1 campaign FUNDED → NOVA_RODADA', async () => {
    const result = await service.getNextAction({ id: 7, status: 'APPROVED' }, [
      { status: 'FUNDED' },
    ]);

    expect(result?.tipo).toBe('NOVA_RODADA');
    expect(result?.rota).toBe('/startup/7/campaigns/new');
  });

  it('APPROVED + 1 campaign PAID_OUT → NOVA_RODADA', async () => {
    const result = await service.getNextAction({ id: 8, status: 'APPROVED' }, [
      { status: 'PAID_OUT' },
    ]);

    expect(result?.tipo).toBe('NOVA_RODADA');
  });

  // ---- 6. APPROVED + campaign CLOSED → CONFIGURAR_TIME ----

  it('APPROVED + campaign CLOSED → CONFIGURAR_TIME', async () => {
    const result = await service.getNextAction({ id: 9, status: 'APPROVED' }, [
      { status: 'CLOSED' },
    ]);

    expect(result?.tipo).toBe('CONFIGURAR_TIME');
    expect(result?.rota).toBe('/startup/9/team');
  });

  // ---- 7. APPROVED sem campanha → CONFIGURAR ----

  it('APPROVED sem campanha → CONFIGURAR', async () => {
    const result = await service.getNextAction(
      { id: 10, status: 'APPROVED' },
      [],
    );

    expect(result?.tipo).toBe('CONFIGURAR');
    expect(result?.rota).toBe('/startup/10/edit');
  });

  // ---- 8. APPROVED + 2 campaigns (OPEN + CLOSED) prioriza OPEN ----

  it('APPROVED + 2 campaigns (OPEN + CLOSED) prioriza OPEN (short-circuit)', async () => {
    const result = await service.getNextAction({ id: 11, status: 'APPROVED' }, [
      { status: 'CLOSED' },
      { status: 'OPEN' },
    ]);

    expect(result?.tipo).toBe('CAMPANHA_EM_ANDAMENTO');
  });

  // ---- 9. PENDING sem campanhas → CONFIGURAR (pre-aprovacao) ----

  it('PENDING sem campanhas → CONFIGURAR', async () => {
    const result = await service.getNextAction(
      { id: 12, status: 'PENDING' },
      [],
    );

    expect(result).toMatchObject({ tipo: 'CONFIGURAR', label: 'Configurar' });
    expect(result?.rota).toMatch(/^\/startup\/\d+\/edit$/);
  });

  // ---- 10. Short-circuit: PENDING_RESERVATION_PAYMENT sempre vence mesmo com campaign OPEN ----

  it('PENDING_RESERVATION_PAYMENT vence mesmo com campaign OPEN (short-circuit)', async () => {
    mockPrisma.payment.findFirst.mockResolvedValue({ id: 1 });

    const result = await service.getNextAction(
      { id: 13, status: 'PENDING_RESERVATION_PAYMENT' },
      [{ status: 'OPEN' }],
    );

    expect(result?.tipo).toBe('PAGAR_RESERVA');
  });

  // ---- 11. RASCUNHO alias de DRAFT ----

  it('RASCUNHO → CONFIGURAR (alias de DRAFT)', async () => {
    const result = await service.getNextAction(
      { id: 14, status: 'RASCUNHO' },
      [],
    );

    expect(result?.tipo).toBe('CONFIGURAR');
  });
});
