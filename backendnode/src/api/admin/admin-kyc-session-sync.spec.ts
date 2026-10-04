import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SealsService } from '../seals/seals.service';
import { EmailService } from '../../email/email.service';
import { AuditService } from '../../common/audit/audit.service';
import { SessionService } from '../../auth/session/session.service';

/**
 * BUG-FT-002 (auditoria): após aprovar/rejeitar um KYCProfile, o snapshot
 * do user nas sessões Redis (`session:{sessionId}`) precisa ser sincronizado.
 * Sem isso, /users/me continuaria retornando o status antigo (cacheado
 * no momento do upload) e o perfil mostraria 'pendente de aprovação'
 * mesmo após o admin aprovar.
 *
 * Estes testes garantem que `decideKycUser` chama
 * `SessionService.refreshUserProfile` para todos os donos do KYCProfile.
 */
describe('AdminService — KYC sync com sessões Redis (BUG-FT-002)', () => {
  const mockPrisma: any = {
    kYCProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    upload: { findMany: jest.fn() },
    uploads: { delete: jest.fn() },
    startup: { count: jest.fn().mockResolvedValue(0) },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockSession = {
    refreshUserProfile: jest.fn().mockResolvedValue(1),
  };

  const mockEmitter = {
    emit: jest.fn(),
  };

  const mockEmail = {
    sendKycResubmissionEmail: jest.fn().mockResolvedValue({ success: true }),
    sendKycDecisionEmail: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockUploadsService: any = {
    remove: jest.fn().mockResolvedValue(undefined),
  };

  let service: AdminService;
  let beforeEachFn: any;

  beforeEachFn = () => {
    jest.clearAllMocks();
  };

  const buildModule = async () => {
    const m = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SealsService, useValue: {} },
        { provide: EmailService, useValue: mockEmail },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: SessionService, useValue: mockSession },
        { provide: EventEmitter2, useValue: mockEmitter },
        {
          provide: 'UploadsService',
          useValue: mockUploadsService,
        },
      ],
    }).compile();
    return m.get(AdminService);
  };

  beforeEach(() => {
    beforeEachFn();
  });

  it('decideKycUser APPROVED chama refreshUserProfile para o dono', async () => {
    service = await buildModule();

    const kycProfile = {
      id: 100,
      userId: null,
      originalName: 'avatar.jpg',
      url: 'https://s3/avatar.jpg',
      url_sm: null,
      url_md: null,
      url_web: null,
      url_lg: null,
      status: 'PENDING',
    };
    mockPrisma.kYCProfile.findUnique.mockResolvedValue(kycProfile);
    mockPrisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        kYCProfile: {
          update: jest
            .fn()
            .mockResolvedValue({ ...kycProfile, status: 'APPROVED' }),
        },
        user: {
          update: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
        },
      }),
    );
    mockPrisma.user.findMany.mockResolvedValue([{ id: 42 }]);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 42,
      telefone: null,
      avatar: {
        id: 100,
        url: 'https://s3/avatar.jpg',
        url_sm: null,
        url_md: null,
        url_web: null,
        url_lg: null,
        status: 'APPROVED',
      },
      documento: null,
      biofacial: null,
      comprovante: null,
      pais: null,
      paisCountry: null,
      bandeira: null,
      tipo_documento: null,
      reg_documento: null,
    });

    const r: any = await service.decideKycUser(100, 'APPROVED');
    expect(r.codigo).toBe(200);
    expect(mockSession.refreshUserProfile).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        avatar: expect.objectContaining({ status: 'APPROVED' }),
      }),
    );
    expect(mockEmitter.emit).toHaveBeenCalledWith('kyc.user.decided', {
      userId: 42,
      decision: 'APPROVED',
      kycStatus: 'APPROVED',
    });
  });

  it('decideKycUser APPROVED com múltiplos donos chama refresh para todos', async () => {
    service = await buildModule();

    const kycProfile = {
      id: 200,
      originalName: 'documento.pdf',
      url: 'https://s3/d.pdf',
      url_sm: null,
      url_md: null,
      url_web: null,
      url_lg: null,
      status: 'PENDING',
    };
    mockPrisma.kYCProfile.findUnique.mockResolvedValue(kycProfile);
    mockPrisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        kYCProfile: {
          update: jest
            .fn()
            .mockResolvedValue({ ...kycProfile, status: 'APPROVED' }),
        },
        user: {
          update: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
        },
      }),
    );
    mockPrisma.user.findMany.mockResolvedValue([{ id: 7 }, { id: 8 }]);
    mockPrisma.user.findUnique.mockResolvedValue({
      telefone: null,
      avatar: null,
      documento: {
        id: 200,
        url: 'https://s3/d.pdf',
        url_sm: null,
        url_md: null,
        url_web: null,
        url_lg: null,
        status: 'APPROVED',
      },
      biofacial: null,
      comprovante: null,
      pais: null,
      paisCountry: null,
      bandeira: null,
      tipo_documento: null,
      reg_documento: null,
    });

    await service.decideKycUser(200, 'APPROVED');
    expect(mockSession.refreshUserProfile).toHaveBeenCalledTimes(2);
    expect(
      mockSession.refreshUserProfile.mock.calls.map((c: any) => c[0]),
    ).toEqual(expect.arrayContaining([7, 8]));
    const emittedUserIds = mockEmitter.emit.mock.calls
      .filter((c: any) => c[0] === 'kyc.user.decided')
      .map((c: any) => c[1].userId);
    expect(emittedUserIds).toEqual(expect.arrayContaining([7, 8]));
  });

  it('decideKycUser REVOKE também sincroniza (status volta a PENDING)', async () => {
    service = await buildModule();

    const kycProfile = {
      id: 300,
      originalName: 'biofacial.mp4',
      url: 'https://s3/b.mp4',
      url_sm: null,
      url_md: null,
      url_web: null,
      url_lg: null,
      status: 'APPROVED',
    };
    mockPrisma.kYCProfile.findUnique.mockResolvedValue(kycProfile);
    mockPrisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        kYCProfile: {
          update: jest
            .fn()
            .mockResolvedValue({ ...kycProfile, status: 'PENDING' }),
        },
        user: {
          update: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
        },
      }),
    );
    mockPrisma.user.findMany.mockResolvedValue([{ id: 99 }]);
    mockPrisma.user.findUnique.mockResolvedValue({
      telefone: null,
      avatar: null,
      documento: null,
      biofacial: {
        id: 300,
        url: 'https://s3/b.mp4',
        url_sm: null,
        url_md: null,
        url_web: null,
        url_lg: null,
        status: 'PENDING',
      },
      comprovante: null,
      pais: null,
      paisCountry: null,
      bandeira: null,
      tipo_documento: null,
      reg_documento: null,
    });

    await service.decideKycUser(300, 'REVOKE');
    expect(mockSession.refreshUserProfile).toHaveBeenCalledWith(
      99,
      expect.objectContaining({
        biofacial: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
    // REVOKE normaliza o status para PENDING; o evento reflete isso.
    expect(mockEmitter.emit).toHaveBeenCalledWith('kyc.user.decided', {
      userId: 99,
      decision: 'REVOKE',
      kycStatus: 'PENDING',
    });
  });

  it('decideKycUser sem dono do KYCProfile não chama refresh (sem erro)', async () => {
    service = await buildModule();

    const kycProfile = {
      id: 400,
      originalName: 'lixo.jpg',
      url: 'https://s3/x.jpg',
      url_sm: null,
      url_md: null,
      url_web: null,
      url_lg: null,
      status: 'PENDING',
    };
    mockPrisma.kYCProfile.findUnique.mockResolvedValue(kycProfile);
    mockPrisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        kYCProfile: {
          update: jest
            .fn()
            .mockResolvedValue({ ...kycProfile, status: 'APPROVED' }),
        },
        user: {
          update: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
        },
      }),
    );
    mockPrisma.user.findMany.mockResolvedValue([]);

    const r: any = await service.decideKycUser(400, 'APPROVED');
    expect(r.codigo).toBe(200);
    expect(mockSession.refreshUserProfile).not.toHaveBeenCalled();
    expect(mockEmitter.emit).not.toHaveBeenCalledWith(
      'kyc.user.decided',
      expect.anything(),
    );
  });

  it('decideKycUser não propaga erro se refreshUserProfile falha', async () => {
    service = await buildModule();
    mockSession.refreshUserProfile.mockRejectedValueOnce(
      new Error('redis down'),
    );

    const kycProfile = {
      id: 500,
      originalName: 'avatar.jpg',
      url: 'https://s3/a.jpg',
      url_sm: null,
      url_md: null,
      url_web: null,
      url_lg: null,
      status: 'PENDING',
    };
    mockPrisma.kYCProfile.findUnique.mockResolvedValue(kycProfile);
    mockPrisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        kYCProfile: {
          update: jest
            .fn()
            .mockResolvedValue({ ...kycProfile, status: 'APPROVED' }),
        },
        user: {
          update: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
        },
      }),
    );
    mockPrisma.user.findMany.mockResolvedValue([{ id: 1 }]);
    mockPrisma.user.findUnique.mockResolvedValue({
      telefone: null,
      avatar: {
        id: 500,
        url: 'https://s3/a.jpg',
        url_sm: null,
        url_md: null,
        url_web: null,
        url_lg: null,
        status: 'APPROVED',
      },
      documento: null,
      biofacial: null,
      comprovante: null,
      pais: null,
      paisCountry: null,
      bandeira: null,
      tipo_documento: null,
      reg_documento: null,
    });

    const r: any = await service.decideKycUser(500, 'APPROVED');
    expect(r.codigo).toBe(200);
  });

  // ─── BUG-FT-005: rejeição admin → status volta para "análise" no profile ───
  // Quando o admin REJETA ou pede reenvio, o KYCProfile é deletado + FK
  // zerada, então o lookup por FK em `refreshKycOwnersSessions` retorna 0.
  // O cache da sessão fica stale (avatar=null no DB mas status antigo no Redis).
  // Estes testes fixam o cache refresh via cleanupOwner + persistem em
  // `User.lastKycRejectionAt/Reason/Slot` para o frontend saber que houve
  // rejeição recente.

  describe('BUG-FT-005 — REJECTED/NEEDS_RESUBMISSION: session refresh + flag User', () => {
    const rejectedKyc = (id: number, ownerAvatar = true) => ({
      id,
      originalName: 'avatar.jpg',
      url: `https://s3/${id}.jpg`,
      url_sm: null,
      url_md: null,
      url_web: null,
      url_lg: null,
      status: 'PENDING',
      mineType: 'image/jpeg',
      extension: 'jpg',
      size: 1024,
      mimeType: 'image/jpeg',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      rejectionReason: null,
      avatar_user: ownerAvatar ? [{}] : [],
      comprovante_user: [],
      documento_user: [],
      biofacial_user: [],
      startups: [],
      coverOf: [],
      mieOf: [],
      contratoSocialOf: [],
      cnpjOf: [],
      balancoAtualOf: [],
      declaracaoVeracidadeOf: [],
      ataEleicaoOf: [],
      balancoAnteriorOf: [],
      procuracaoOf: [],
      cvSociosOf: [],
      pitchDeckOf: [],
      projecoesOf: [],
      modeloContratoOfertaOf: [],
      comprovanteEnderecoOf: [],
      declaracaoReceitaOf: [],
    });

    const txMockForRejection = (
      id: number,
      slot: 'avatar' | 'comprovante' | 'documento' | 'biofacial',
    ) => ({
      kYCProfile: {
        update: jest
          .fn()
          .mockResolvedValue({ id, status: 'NEEDS_RESUBMISSION' }),
        delete: jest.fn(),
      },
      user: {
        update: jest.fn().mockResolvedValue({
          id: slot === 'avatar' ? 42 : slot === 'comprovante' ? 99 : 7,
        }),
        findFirst: jest.fn().mockResolvedValue({
          id: slot === 'avatar' ? 42 : slot === 'comprovante' ? 99 : 7,
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: slot === 'avatar' ? 42 : slot === 'comprovante' ? 99 : 7,
        }),
      },
    });

    it('REJECTED: chama refreshUserProfile para cleanupOwner (cache stale fix)', async () => {
      service = await buildModule();
      const kyc = rejectedKyc(700, true);
      mockPrisma.kYCProfile.findUnique.mockResolvedValueOnce(kyc);
      // prepareKycCleanup espera:
      //  - prisma.user.findMany → 1 owner com FK info
      //  - prisma.startup.count → 0 (sem referência compartilhada)
      //  - prisma.upload.findMany → uploadIds a remover
      mockPrisma.user.findMany.mockResolvedValueOnce([
        {
          id: 42,
          nome: 'Maria',
          email: 'm@example.com',
          avatar_id: 700,
          comprovante_id: null,
          documento_id: null,
          biofacial_id: null,
        },
      ]);
      mockPrisma.startup.count.mockResolvedValueOnce(0);
      mockPrisma.upload.findMany.mockResolvedValueOnce([
        {
          id: 900,
          userId: 42,
          startupId: null,
          bucket: 'image',
          key: 'k1',
          sha256: 'h1',
        },
      ]);
      mockPrisma.$transaction.mockImplementation(async (cb: any) =>
        cb(txMockForRejection(700, 'avatar')),
      );
      // refresh manual via cleanupOwner hidrata do banco
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        telefone: null,
        avatar: null,
        documento: null,
        biofacial: null,
        comprovante: null,
        pais: null,
        paisCountry: null,
        bandeira: null,
        tipo_documento: null,
        reg_documento: null,
        lastKycRejectionAt: new Date('2026-02-01'),
        lastKycRejectionReason: 'foto ilegível',
        lastKycRejectionSlot: 'avatar',
      });

      await service.decideKycUser(700, 'REJECTED', 'foto ilegível');

      // refreshUserProfile foi chamado via cleanupOwner fallback
      expect(mockSession.refreshUserProfile).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({
          avatar: null,
          lastKycRejectionSlot: 'avatar',
        }),
      );
    });

    it('NEEDS_RESUBMISSION: salva lastKycRejection* no User e dispara evento', async () => {
      service = await buildModule();
      mockPrisma.kYCProfile.findUnique.mockResolvedValueOnce(
        rejectedKyc(800, true),
      );
      // prepareKycCleanup: 1 owner, sem startup referenciando, com upload
      mockPrisma.user.findMany.mockResolvedValueOnce([
        {
          id: 99,
          nome: 'Maria',
          email: 'm@example.com',
          avatar_id: 800,
          comprovante_id: null,
          documento_id: null,
          biofacial_id: null,
        },
      ]);
      mockPrisma.startup.count.mockResolvedValueOnce(0);
      mockPrisma.upload.findMany.mockResolvedValueOnce([
        {
          id: 901,
          userId: 99,
          startupId: null,
          bucket: 'image',
          key: 'k2',
          sha256: 'h2',
        },
      ]);
      const userUpdate = jest.fn().mockResolvedValue({ id: 99 });
      mockPrisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          kYCProfile: {
            update: jest
              .fn()
              .mockResolvedValue({ id: 800, status: 'NEEDS_RESUBMISSION' }),
            delete: jest.fn(),
          },
          user: {
            update: userUpdate,
            findFirst: jest.fn().mockResolvedValue({ id: 99 }),
            findUnique: jest.fn().mockResolvedValue({ id: 99 }),
          },
        }),
      );
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        telefone: null,
        avatar: null,
        documento: null,
        biofacial: null,
        comprovante: null,
        pais: null,
        paisCountry: null,
        bandeira: null,
        tipo_documento: null,
        reg_documento: null,
        lastKycRejectionAt: new Date(),
        lastKycRejectionReason: 'imagem contra foto',
        lastKycRejectionSlot: 'avatar',
      });

      await service.decideKycUser(
        800,
        'NEEDS_RESUBMISSION',
        'imagem contra foto',
      );

      // A transação deve ter persistido lastKycRejection* no User
      expect(userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 99 },
          data: expect.objectContaining({
            lastKycRejectionAt: expect.any(Date),
            lastKycRejectionReason: 'imagem contra foto',
            lastKycRejectionSlot: 'avatar',
          }),
        }),
      );
      // Evento WS emitido para o owner (cache fresh)
      expect(mockEmitter.emit).toHaveBeenCalledWith(
        'kyc.user.decided',
        expect.objectContaining({
          userId: 99,
          decision: 'NEEDS_RESUBMISSION',
          kycStatus: 'NEEDS_RESUBMISSION',
        }),
      );
    });

    it('NEEDS_RESUBMISSION: detecta slot via FK (comprovante/documento/biofacial)', async () => {
      service = await buildModule();
      // Slot = comprovante (avatar_user=false, comprovante_user com entry)
      const kycComprovante: any = rejectedKyc(900, false);
      kycComprovante.comprovante_user = [{}];
      mockPrisma.kYCProfile.findUnique.mockResolvedValueOnce(kycComprovante);
      // prepareKycCleanup: 1 owner com comprovante_id
      mockPrisma.user.findMany.mockResolvedValueOnce([
        {
          id: 99,
          nome: 'Maria',
          email: 'm@example.com',
          avatar_id: null,
          comprovante_id: 900,
          documento_id: null,
          biofacial_id: null,
        },
      ]);
      mockPrisma.startup.count.mockResolvedValueOnce(0);
      mockPrisma.upload.findMany.mockResolvedValueOnce([
        {
          id: 902,
          userId: 99,
          startupId: null,
          bucket: 'image',
          key: 'k3',
          sha256: 'h3',
        },
      ]);
      const userUpdate = jest.fn().mockResolvedValue({ id: 99 });
      mockPrisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          kYCProfile: {
            update: jest
              .fn()
              .mockResolvedValue({ id: 900, status: 'NEEDS_RESUBMISSION' }),
            delete: jest.fn(),
          },
          user: {
            update: userUpdate,
            findFirst: jest.fn().mockResolvedValue({ id: 99 }),
            findUnique: jest.fn().mockResolvedValue({ id: 99 }),
          },
        }),
      );
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        telefone: null,
        avatar: null,
        documento: null,
        biofacial: null,
        comprovante: null,
        pais: null,
        paisCountry: null,
        bandeira: null,
        tipo_documento: null,
        reg_documento: null,
        lastKycRejectionAt: new Date(),
        lastKycRejectionReason: 'comprovante venc',
        lastKycRejectionSlot: 'comprovante',
      });

      await service.decideKycUser(
        900,
        'NEEDS_RESUBMISSION',
        'comprovante venc',
      );

      expect(userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 99 },
          data: expect.objectContaining({
            lastKycRejectionSlot: 'comprovante',
          }),
        }),
      );
    });

    it('APPROVED: limpa lastKycRejection* (rejeição anterior resolvida)', async () => {
      service = await buildModule();
      mockPrisma.kYCProfile.findUnique.mockResolvedValueOnce({
        ...rejectedKyc(1000, true),
        status: 'PENDING',
      });
      const txUpdate = jest
        .fn()
        .mockResolvedValue({ id: 1000, status: 'APPROVED' });
      const txFindFirst = jest.fn().mockResolvedValue({ id: 42 });
      const txUserUpdate = jest.fn().mockResolvedValue({ id: 42 });
      mockPrisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          kYCProfile: { update: txUpdate, delete: jest.fn() },
          user: {
            update: txUserUpdate,
            findFirst: txFindFirst,
            findUnique: jest.fn().mockResolvedValue({ id: 42 }),
          },
        }),
      );
      mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 42 }]);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        telefone: null,
        avatar: {
          id: 1000,
          url: 'https://s3/a.jpg',
          url_sm: null,
          url_md: null,
          url_web: null,
          url_lg: null,
          status: 'APPROVED',
        },
        documento: null,
        biofacial: null,
        comprovante: null,
        pais: null,
        paisCountry: null,
        bandeira: null,
        tipo_documento: null,
        reg_documento: null,
        lastKycRejectionAt: null,
        lastKycRejectionReason: null,
        lastKycRejectionSlot: null,
      });

      await service.decideKycUser(1000, 'APPROVED');

      // APPROVED limpa lastKycRejection* para o frontend não exibir "Faça upload novamente"
      expect(txUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42 },
          data: expect.objectContaining({
            lastKycRejectionAt: null,
            lastKycRejectionReason: null,
            lastKycRejectionSlot: null,
          }),
        }),
      );
    });

    it('NEEDS_RESUBMISSION idempotente (status já era NEEDS_RESUBMISSION): aceita sem cleanup', async () => {
      // BUG-FT-001 (S34): re-aplicar mesma decisão NÃO dispara nova comunicação.
      // A FK já está nulled (cleanup anterior); cleanupPreparation.ok seria false,
      // mas como decisão é NEEDS_RESUBMISSION e status já bate, deve prosseguir
      // sem erro e apenas atualizar lastKycRejection* se ainda não setado.
      service = await buildModule();
      mockPrisma.kYCProfile.findUnique.mockResolvedValueOnce({
        ...rejectedKyc(1100, true),
        status: 'NEEDS_RESUBMISSION',
        rejectionReason: 'motivo antigo',
      });
      const userUpdate = jest.fn().mockResolvedValue({ id: 99 });
      mockPrisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          kYCProfile: {
            update: jest
              .fn()
              .mockResolvedValue({ id: 1100, status: 'NEEDS_RESUBMISSION' }),
            delete: jest.fn(),
          },
          user: { update: userUpdate },
        }),
      );
      mockPrisma.user.findMany.mockResolvedValueOnce([]);

      const r = await service.decideKycUser(
        1100,
        'NEEDS_RESUBMISSION',
        'mesmo motivo',
      );
      expect(r.codigo).toBe(200);
    });
  });
});
