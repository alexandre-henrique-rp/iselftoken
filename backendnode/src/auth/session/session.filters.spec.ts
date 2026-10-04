import { applySessionFilters } from './session.filters';

describe('applySessionFilters', () => {
  const makeUser = (subscriptions: Record<string, unknown>[]) =>
    ({
      id: 1,
      publicId: 'user-1',
      email: 'user@example.com',
      nome: 'Usuário Teste',
      role: 'USER',
      isActive: true,
      createdAt: new Date(),
      subscriptions,
    }) as never;

  it('aceita outro plano ativo quando o primeiro plano ativo está expirado', () => {
    const result = applySessionFilters(
      makeUser([
        { status: 'ACTIVE', expiresAt: '2020-01-01T00:00:00.000Z' },
        { status: 'ACTIVE', expiresAt: '2099-01-01T00:00:00.000Z' },
      ]),
    );

    expect(result).toBeNull();
  });

  it('redireciona quando todas as assinaturas ativas estão expiradas', () => {
    const result = applySessionFilters(
      makeUser([
        { status: 'ACTIVE', expiresAt: '2020-01-01T00:00:00.000Z' },
        { status: 'ACTIVE', expiresAt: '2021-01-01T00:00:00.000Z' },
      ]),
    );

    expect(result).toEqual({
      redirect: '/plans',
      reason: 'Nenhum plano ativo',
    });
  });

  it('aceita assinatura ativa sem data de expiração', () => {
    expect(
      applySessionFilters(makeUser([{ status: 'ACTIVE', expiresAt: null }])),
    ).toBeNull();
  });
});
