import { SKIP_SESSION_FILTER_KEY } from 'src/common/decorators/skip-session-filter.decorator';
import { CheckoutCouponsController } from './coupons.controller';

describe('CheckoutCouponsController', () => {
  const couponService = {
    apply: jest.fn(),
  };
  const paymentService = {
    finalizeCouponIntegralPayment: jest.fn(),
    generatePix: jest.fn(),
  };
  let controller: CheckoutCouponsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CheckoutCouponsController(
      couponService as never,
      paymentService as never,
    );
  });

  it('deve aplicar o cupom usando o usuário autenticado da sessão', async () => {
    const usage = { id: 10, paymentId: 42, userId: 77 };
    couponService.apply.mockResolvedValue(usage);

    const result = await controller.applyCoupon(
      { couponCode: 'DESCONTO20', paymentId: 42 },
      { user: { id: 77 } },
    );

    expect(couponService.apply).toHaveBeenCalledWith('DESCONTO20', 42, 77);
    expect(result.data).toBe(usage);
  });

  it('gera uma nova cobrança quando o cupom substitui um PIX aberto', async () => {
    const usage = {
      id: 10,
      paymentId: 42,
      userId: 77,
      pixReissueRequired: true,
      payment: { id: 42 },
    };
    const pix = { txid: 'new-txid', amount: 800 };
    couponService.apply.mockResolvedValue(usage);
    paymentService.generatePix.mockResolvedValue({ error: false, data: pix });

    const result = await controller.applyCoupon(
      { couponCode: 'DESCONTO20', paymentId: 42 },
      { user: { id: 77 } },
    );

    expect(paymentService.generatePix).toHaveBeenCalledWith(42, 77);
    expect(result.data).toMatchObject({
      pix,
      pixReissuePending: false,
    });
  });

  it('mantém a ordem sem QR antigo quando a nova emissão falha', async () => {
    couponService.apply.mockResolvedValue({
      id: 10,
      paymentId: 42,
      userId: 77,
      pixReissueRequired: true,
      payment: { id: 42 },
    });
    paymentService.generatePix.mockResolvedValue({
      error: true,
      data: null,
    });

    const result = await controller.applyCoupon(
      { couponCode: 'DESCONTO20', paymentId: 42 },
      { user: { id: 77 } },
    );

    expect((result.data as any).pix).toBeNull();
    expect((result.data as any).pixReissuePending).toBe(true);
  });

  it('ignora o filtro de plano durante o checkout, mantendo o AuthGuard', () => {
    expect(
      Reflect.getMetadata(
        SKIP_SESSION_FILTER_KEY,
        CheckoutCouponsController.prototype.applyCoupon,
      ),
    ).toBe(true);
  });
});
