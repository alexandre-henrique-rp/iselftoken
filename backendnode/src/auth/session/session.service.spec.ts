/**
 * Testes para SessionService.refreshUserSubscriptions.
 *
 * Cobre o bug onde `invalidateUserSession` no payment.service.ts não
 * atualizava a sessão Redis do usuário após ativação de novo plano,
 * causando o loader de `/home` (ehAfiliadoPuro) ler o payload stale
 * e redirecionar founders/investidores para `/affiliate`.
 *
 * Usa Lua script atômico (redis.eval) para evitar race condition com
 * touchLastAccess.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';

describe('SessionService.refreshUserSubscriptions', () => {
  let service: SessionService;
  let mockRedis: {
    get: jest.Mock;
    eval: jest.Mock;
    scan: jest.Mock;
    ttl: jest.Mock;
  };

  const SESSION_KEY = 'session:abc123';
  const USER_ID = 5;
  const SESSION_PAYLOAD = {
    id: USER_ID,
    email: 'user@test.com',
    role: 'USER',
    af2Verified: true,
    lastAccessAt: new Date().toISOString(),
    sessionCreatedAt: Date.now(),
    subscriptions: [
      {
        id: 100,
        userId: USER_ID,
        planId: 1, // AFILIADO — antigo
        status: 'ACTIVE',
        startedAt: null,
        expiresAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        plan: { id: 1, nome: 'AFILIADO', slug: 'plano-afiliado' },
      },
    ],
  };

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === SESSION_KEY) return JSON.stringify(SESSION_PAYLOAD);
        return null;
      }),
      eval: jest.fn().mockResolvedValue(1),
      scan: jest.fn().mockResolvedValue(['0', [SESSION_KEY]]),
      ttl: jest.fn().mockResolvedValue(3600),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
      ],
    }).compile();
    service = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('atualiza subscriptions via Lua script atomico', async () => {
    const NEW_SUBS = [
      {
        id: 200,
        userId: USER_ID,
        planId: 3, // FUNDADOR — novo
        status: 'ACTIVE',
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        plan: { id: 3, nome: 'FUNDADOR', slug: 'plano-fundador' },
      },
    ];

    const count = await service.refreshUserSubscriptions(USER_ID, NEW_SUBS);

    expect(count).toBe(1);

    // SCAN chamado com pattern correto
    expect(mockRedis.scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      'session:*',
      'COUNT',
      100,
    );

    // GET chamado para ler a sessão (filtrar por userId)
    expect(mockRedis.get).toHaveBeenCalledWith(SESSION_KEY);

    // EVAL chamado com Lua script para escrita atômica
    expect(mockRedis.eval).toHaveBeenCalledTimes(1);
    const [script, numKeys, key, subsJson] = mockRedis.eval.mock.calls[0];
    expect(numKeys).toBe(1);
    expect(key).toBe(SESSION_KEY);
    const parsedSubs = JSON.parse(subsJson);
    expect(parsedSubs[0].planId).toBe(3);
    // Script deve ser o Lua de refresh
    expect(script).toContain('subscriptions');
    expect(script).toContain('cjson.decode');
  });

  it('NAO atualiza sessoes de outro userId', async () => {
    const OTHER_USER_PAYLOAD = {
      ...SESSION_PAYLOAD,
      id: 99, // outro user
      subscriptions: [
        {
          id: 300,
          userId: 99,
          planId: 1,
          status: 'ACTIVE',
          plan: { id: 1, nome: 'AFILIADO', slug: 'plano-afiliado' },
        },
      ],
    };
    mockRedis.get = jest.fn().mockImplementation((key: string) => {
      if (key === 'session:abc123') return JSON.stringify(SESSION_PAYLOAD);
      if (key === 'session:xyz789') return JSON.stringify(OTHER_USER_PAYLOAD);
      return null;
    });
    mockRedis.scan = jest
      .fn()
      .mockResolvedValue(['0', ['session:abc123', 'session:xyz789']]);

    const NEW_SUBS = [
      {
        id: 200,
        userId: USER_ID,
        planId: 3,
        status: 'ACTIVE',
      },
    ];

    const count = await service.refreshUserSubscriptions(USER_ID, NEW_SUBS);

    // Apenas 1 sessao atualizada (a do userId=5)
    expect(count).toBe(1);

    // EVAL chamado apenas 1x (para session:abc123, NAO para session:xyz789)
    expect(mockRedis.eval).toHaveBeenCalledTimes(1);
    expect(mockRedis.eval.mock.calls[0][2]).toBe('session:abc123');
  });

  it('atualiza diretamente a sessão que originou o PATCH', async () => {
    const profile = { biofacial: { id: 88, status: 'PENDING' } };

    const updated = await service.refreshUserProfileForSession(
      'abc123',
      USER_ID,
      profile,
    );

    expect(updated).toBe(true);
    expect(mockRedis.get).toHaveBeenCalledWith(SESSION_KEY);
    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining('obj[k] = v'),
      1,
      SESSION_KEY,
      JSON.stringify(profile),
    );
  });

  it('não atualiza uma sessão cujo usuário não corresponde', async () => {
    mockRedis.get = jest
      .fn()
      .mockResolvedValue(JSON.stringify({ ...SESSION_PAYLOAD, id: 99 }));

    const updated = await service.refreshUserProfileForSession(
      'abc123',
      USER_ID,
      { avatar: { id: 12 } },
    );

    expect(updated).toBe(false);
    expect(mockRedis.eval).not.toHaveBeenCalled();
  });

  it('exclui a sessão atual ao sincronizar as demais sessões', async () => {
    const count = await service.refreshUserProfile(
      USER_ID,
      { biofacial: { id: 88 } },
      'abc123',
    );

    expect(count).toBe(0);
    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockRedis.eval).not.toHaveBeenCalled();
  });
});
