import {
  pickPublicSessionPayload,
  pickPublicProfilePayload,
} from './public-payload';

describe('public session payload', () => {
  it('expõe os campos usados pelo Perfil e remove relações sensíveis', () => {
    const payload = pickPublicSessionPayload({
      id: 7,
      publicId: 'public-7',
      email: 'user@example.com',
      nome: 'Usuário Teste',
      role: 'USER',
      telefone: '+5511999999999',
      data_nascimento: new Date('1990-01-02'),
      genero: 'HOMEM',
      endereco: 'Rua A',
      numero: '10',
      complemento: null,
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01000-000',
      tipo_documento: 'CPF',
      reg_documento: '12345678900',
      avatar: {
        id: 10,
        url: 'avatar-url',
        url_sm: null,
        url_md: 'avatar-md',
        url_lg: null,
        status: 'APPROVED',
        rejectionReason: 'não deve sair',
      },
      comprovante: null,
      documento: { id: 11, url: 'doc-url', status: 'PENDING' },
      biofacial: null,
      pais: { iso3: 'BRA', nome: 'Brasil', emoji: '🇧🇷' },
      isActive: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
      wallet: { id: 8, updatedAt: new Date('2025-01-02'), balance: '99' },
      subscriptions: [
        {
          id: 20,
          userId: 7,
          planId: 3,
          status: 'ACTIVE',
          startedAt: new Date('2025-01-01'),
          expiresAt: new Date('2026-01-01'),
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          plan: {
            id: 3,
            nome: 'Fundador',
            slug: 'fundador',
            descricao: 'Plano anual',
            preco: '199.90',
            periodoMeses: 12,
            periodo: '/ano',
            internalSecret: 'não deve sair',
          },
        },
      ],
      startups: [{ id: 30, nome: 'não deve sair' }],
      senha: 'não deve sair',
      payments: [{ id: 1 }],
      investments: [{ id: 2 }],
      tokens: [{ id: 3 }],
      auditLogs: [{ id: 4 }],
    });

    expect(payload.telefone).toBe('+5511999999999');
    expect(payload.avatar).toEqual({
      id: 10,
      url: 'avatar-url',
      url_sm: null,
      url_md: 'avatar-md',
      url_lg: null,
      url_web: null,
      status: 'APPROVED',
    });
    expect(payload.documento?.status).toBe('PENDING');
    expect(payload.subscriptions[0].plan).toEqual({
      id: 3,
      nome: 'Fundador',
      slug: 'fundador',
      descricao: 'Plano anual',
      preco: '199.90',
      periodoMeses: 12,
      periodo: '/ano',
    });
    expect(payload).not.toHaveProperty('senha');
    expect(payload).not.toHaveProperty('payments');
    expect(payload).not.toHaveProperty('investments');
    expect(payload).not.toHaveProperty('tokens');
    expect(payload).not.toHaveProperty('auditLogs');
    expect(payload.avatar).not.toHaveProperty('rejectionReason');
  });

  it('projeta apenas o subset de perfil para sincronizar sessões após PATCH', () => {
    const profile = pickPublicProfilePayload({
      telefone: '11999999999',
      avatar: { id: 1, url: 'avatar', status: 'REJECTED' },
      documento: null,
      biofacial: null,
      comprovante: null,
      senha: 'não deve sair',
      payments: [{ id: 1 }],
    });

    expect(profile.telefone).toBe('11999999999');
    expect(profile.avatar?.status).toBe('REJECTED');
    expect(profile).not.toHaveProperty('senha');
    expect(profile).not.toHaveProperty('payments');
  });

  // ─── BUG-FT-005: rejeição admin → frontend /profile mostra "Faça upload "
  // ─── "novamente" mesmo após KYCProfile deletado.

  describe('BUG-FT-005 — lastKycRejection*', () => {
    it('pickPublicProfilePayload expõe lastKycRejectionAt/Reason/Slot quando populados', () => {
      const profile = pickPublicProfilePayload({
        avatar: null,
        documento: null,
        biofacial: null,
        comprovante: null,
        lastKycRejectionAt: new Date('2026-02-01T12:00:00Z'),
        lastKycRejectionReason: 'imagem contra foto',
        lastKycRejectionSlot: 'avatar',
      });

      expect(profile.lastKycRejectionAt).toBe('2026-02-01T12:00:00.000Z');
      expect(profile.lastKycRejectionReason).toBe('imagem contra foto');
      expect(profile.lastKycRejectionSlot).toBe('avatar');
    });

    it('pickPublicProfilePayload normaliza lastKycRejectionSlot inválido para null', () => {
      const profile = pickPublicProfilePayload({
        avatar: null,
        documento: null,
        biofacial: null,
        comprovante: null,
        lastKycRejectionSlot: 'foo', // fora do whitelist
      });

      expect(profile.lastKycRejectionSlot).toBeNull();
    });

    it('pickPublicProfilePayload retorna nulls para campos ausentes (sem rejeição)', () => {
      const profile = pickPublicProfilePayload({
        avatar: null,
        documento: null,
        biofacial: null,
        comprovante: null,
      });

      expect(profile.lastKycRejectionAt).toBeNull();
      expect(profile.lastKycRejectionReason).toBeNull();
      expect(profile.lastKycRejectionSlot).toBeNull();
    });

    it('pickPublicProfilePayload aceita lastKycRejectionAt em string ISO', () => {
      const profile = pickPublicProfilePayload({
        avatar: null,
        documento: null,
        biofacial: null,
        comprovante: null,
        lastKycRejectionAt: '2026-03-01T08:30:00Z',
      });

      expect(profile.lastKycRejectionAt).toBe('2026-03-01T08:30:00Z');
    });
  });
});
