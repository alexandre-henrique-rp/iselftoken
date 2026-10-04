import { DismissSessionController } from './dismiss-session.controller';

describe('DismissSessionController', () => {
  const alert = {
    id: 7,
    publicId: 'alert-public-id',
    actionStatus: 'PENDING',
    actionExpiresAt: new Date(Date.now() + 60_000),
    sessionsDeleted: 0,
    fingerprint: 'device-fingerprint',
  };

  const prisma = {
    user: { update: jest.fn() },
    loginAlert: { update: jest.fn() },
  };
  const jwtService = { verify: jest.fn() };
  const sessionService = { invalidateAllUserSessions: jest.fn() };
  const auditService = { log: jest.fn() };
  const configService = { get: jest.fn(() => 'a'.repeat(32)) };
  const loginAlertService = {
    findByActionJti: jest.fn(),
    applyAction: jest.fn(),
    markDeviceAsKnown: jest.fn(),
  };
  const redis = {
    scan: jest.fn().mockResolvedValue(['0', []]),
    del: jest.fn().mockResolvedValue(0),
  };

  let controller: DismissSessionController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DismissSessionController(
      prisma as never,
      jwtService as never,
      sessionService as never,
      auditService as never,
      configService as never,
      loginAlertService as never,
      redis as never,
    );
  });

  it('confirma o alerta sem criar uma nova sessão', async () => {
    jwtService.verify.mockReturnValue({
      userId: 42,
      alertPublicId: alert.publicId,
      purpose: 'login_alert_action',
      jti: 'jti-confirm',
    });
    loginAlertService.findByActionJti.mockResolvedValue(alert);
    loginAlertService.applyAction.mockResolvedValue({
      transitioned: true,
      alert: { ...alert, actionStatus: 'CONFIRMED' },
    });

    const response = await controller.confirm({ token: 'token' });

    expect(response.error).toBe(false);
    expect(response.data).toMatchObject({
      alertId: alert.publicId,
      status: 'CONFIRMED',
      sessionCreated: false,
    });
    expect(sessionService.invalidateAllUserSessions).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(loginAlertService.markDeviceAsKnown).toHaveBeenCalledWith(
      42,
      alert.fingerprint,
    );
  });

  it('descarta o alerta, invalida sessões e exige troca de senha', async () => {
    jwtService.verify.mockReturnValue({
      userId: 42,
      alertPublicId: alert.publicId,
      purpose: 'login_alert_action',
      jti: 'jti-dismiss',
    });
    loginAlertService.findByActionJti.mockResolvedValue(alert);
    loginAlertService.applyAction.mockResolvedValue({
      transitioned: true,
      alert: { ...alert, actionStatus: 'DISMISSED' },
    });
    sessionService.invalidateAllUserSessions.mockResolvedValue(3);
    prisma.user.update.mockResolvedValue({});
    prisma.loginAlert.update.mockResolvedValue({
      ...alert,
      actionStatus: 'DISMISSED',
      sessionsDeleted: 3,
    });

    const response = await controller.dismiss({ token: 'token' });

    expect(response.error).toBe(false);
    expect(response.data).toMatchObject({
      alertId: alert.publicId,
      status: 'DISMISSED',
      sessionsDeleted: 3,
      forcePasswordReset: true,
    });
    expect(sessionService.invalidateAllUserSessions).toHaveBeenCalledWith(42);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { requirePasswordReset: true },
    });
    expect(redis.del).toHaveBeenCalledWith('lastKnownCountry:42');
  });

  it('trata repetição da mesma ação como idempotente', async () => {
    jwtService.verify.mockReturnValue({
      userId: 42,
      alertPublicId: alert.publicId,
      purpose: 'login_alert_action',
      jti: 'jti-confirm',
    });
    loginAlertService.findByActionJti.mockResolvedValue({
      ...alert,
      actionStatus: 'CONFIRMED',
    });

    const response = await controller.confirm({ token: 'token' });

    expect(response.error).toBe(false);
    expect(response.data).toMatchObject({
      alertId: alert.publicId,
      status: 'CONFIRMED',
      sessionCreated: false,
    });
    expect(loginAlertService.applyAction).not.toHaveBeenCalled();
  });

  it('rejeita token inválido ou com purpose incorreto', async () => {
    jwtService.verify.mockImplementation((token: string) => {
      if (token === 'invalid') throw new Error('invalid token');
      return {
        userId: 42,
        alertPublicId: alert.publicId,
        purpose: 'wrong-purpose',
        jti: 'jti-wrong-purpose',
      };
    });

    await expect(
      controller.confirm({ token: 'invalid' }),
    ).resolves.toMatchObject({
      error: true,
      codigo: 401,
    });
    await expect(
      controller.confirm({ token: 'wrong-purpose' }),
    ).resolves.toMatchObject({
      error: true,
      codigo: 401,
    });
    expect(loginAlertService.findByActionJti).not.toHaveBeenCalled();
  });
});
