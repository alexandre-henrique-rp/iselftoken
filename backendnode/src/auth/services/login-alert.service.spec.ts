import { LoginAlertService } from './login-alert.service';
import { DeviceContextService } from './device-context.service';
import { LoginLocationResolver } from './login-location.resolver';

describe('LoginAlertService', () => {
  const redis = {
    get: jest.fn(),
    exists: jest.fn(),
    set: jest.fn(),
    expire: jest.fn(),
  };
  const prisma = {
    loginAlert: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const jwt = { sign: jest.fn(() => 'signed-token') };
  let service: LoginAlertService;

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.exists.mockResolvedValue(0);
    redis.set.mockResolvedValue('OK');
    service = new LoginAlertService(
      redis as never,
      prisma as never,
      jwt as never,
      new DeviceContextService(),
      new LoginLocationResolver(),
    );
  });

  it('classifica loopback como contexto não público sem bloquear a decisão', async () => {
    const result = await service.checkAndAlert({
      userId: 1,
      ip: '::1',
      userAgent: 'node',
      context: {
        ip: '::1',
        ipClass: 'LOOPBACK',
        environment: 'development',
        proxyChainTrusted: true,
      },
    });
    expect(result.context.ipClass).toBe('LOOPBACK');
    expect(result.location.source).toBe('UNAVAILABLE');
    expect(result.device.label).toBe('Dispositivo não identificado');
  });

  it('não bloqueia a decisão quando Redis está indisponível', async () => {
    redis.get.mockRejectedValue(new Error('redis offline'));
    redis.exists.mockRejectedValue(new Error('redis offline'));
    const result = await service.checkAndAlert({
      userId: 1,
      ip: '8.8.8.8',
      userAgent: null,
      context: {
        ip: '8.8.8.8',
        ipClass: 'PUBLIC',
        environment: 'test',
        proxyChainTrusted: true,
      },
    });
    expect(result).toBeDefined();
    expect(result.location.source).toBe('UNAVAILABLE');
  });
});
