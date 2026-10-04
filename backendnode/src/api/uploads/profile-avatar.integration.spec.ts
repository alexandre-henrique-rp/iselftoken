import { ServiceUnavailableException } from '@nestjs/common';
import { UploadStatus } from '@prisma/client';
import { SessionService } from '../../auth/session/session.service';
import { BackupService } from '../../backup/backup.service';
import { AuditService } from '../../common/audit/audit.service';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/**
 * Integração do pipeline de avatar com armazenamento, processamento de imagem
 * e Redis locais. Nenhum provider externo ou arquivo real é utilizado.
 */
describe('Integração: upload de avatar autenticado', () => {
  const ownerId = 17;
  const anotherOwnerId = 18;

  function createEnvironment(objectAvailable = true) {
    const uploads: any[] = [];
    const kycProfiles: any[] = [];
    const objects = new Map<string, Buffer>();
    const redisSessions = new Map<string, unknown>();
    let nextUploadId = 1;
    let nextProfileId = 1;
    let availability = objectAvailable;
    const user = {
      id: ownerId,
      publicId: 'user-owner',
      email: 'owner@example.test',
      nome: 'Usuário de teste',
      role: 'USER',
      telefone: null,
      data_nascimento: null,
      genero: null,
      endereco: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      uf: null,
      cep: null,
      pais: null,
      bandeira: null,
      tipo_documento: null,
      reg_documento: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      avatar: null as any,
      comprovante: null,
      documento: null,
      biofacial: null,
      wallet: null,
      payments: [],
      subscriptions: [],
      startups: [],
    };

    const prisma: any = {
      upload: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (typeof where.id === 'number') {
            return uploads.find((upload) => upload.id === where.id) ?? null;
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const upload = {
            id: nextUploadId,
            publicId: `upload-${nextUploadId}`,
            variants: null,
            url: null,
            deletedAt: null,
            rejectionReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          nextUploadId += 1;
          uploads.push(upload);
          return upload;
        }),
        findFirst: jest.fn(
          async ({ where }: any) =>
            uploads.find(
              (upload) =>
                (where.id === undefined || upload.id === where.id) &&
                (where.userId === undefined ||
                  upload.userId === where.userId) &&
                (where.sha256 === undefined ||
                  upload.sha256 === where.sha256) &&
                (where.deletedAt === undefined ||
                  upload.deletedAt === where.deletedAt),
            ) ?? null,
        ),
        update: jest.fn(async ({ where, data }: any) => {
          const upload = uploads.find((item) => item.id === where.id);
          if (!upload) throw new Error('Upload ausente no double');
          Object.assign(upload, data, { updatedAt: new Date() });
          return upload;
        }),
      },
      user: {
        findUnique: jest.fn(async () => ({ ...user })),
        update: jest.fn(async ({ data }: any) => {
          if (data.avatar_id !== undefined) {
            user.avatar =
              kycProfiles.find((profile) => profile.id === data.avatar_id) ??
              null;
          }
          Object.assign(user, data, { updatedAt: new Date() });
          return { ...user, paisCountry: null };
        }),
      },
      kYCProfile: {
        create: jest.fn(async ({ data }: any) => {
          const profile = { id: nextProfileId, ...data };
          nextProfileId += 1;
          kycProfiles.push(profile);
          return profile;
        }),
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => null),
      },
      $transaction: jest.fn(async (callback: (tx: any) => unknown) =>
        callback(prisma),
      ),
    };

    const storageProvider = {
      upload: jest.fn(async ({ bucket, key, file }: any) => {
        if (availability) objects.set(`${bucket}/${key}`, file);
        return {
          bucket,
          key,
          size: file.length,
          url: `https://storage.test/${bucket}/${key}`,
        };
      }),
      exists: jest.fn(async (bucket: string, key: string) =>
        objects.has(`${bucket}/${key}`),
      ),
      download: jest.fn(async (bucket: string, key: string) => {
        const body = objects.get(`${bucket}/${key}`);
        if (!body) {
          throw Object.assign(new Error('NoSuchKey'), { Code: 'NoSuchKey' });
        }
        return { body };
      }),
      delete: jest.fn(async (bucket: string, key: string) => {
        objects.delete(`${bucket}/${key}`);
      }),
      getPresignedUrl: jest.fn(
        async (bucket: string, key: string) =>
          `https://storage.test/${bucket}/${key}`,
      ),
    };
    const imageProcessor = {
      validateAndSanitize: jest.fn(async () => ({
        valid: true,
        metadata: { width: 16, height: 16 },
      })),
    };
    const variantGenerator = {
      generateImageVariants: jest.fn(async () => ({
        lg: {},
        md: {
          webp: {
            bucket: 'image-md',
            key: 'avatar-md.webp',
            url: 'https://storage.test/image-md/avatar-md.webp',
          },
        },
        sm: {
          webp: {
            bucket: 'image-sm',
            key: 'avatar-sm.webp',
            url: 'https://storage.test/image-sm/avatar-sm.webp',
          },
        },
      })),
    };
    const uploadsService = new UploadsService(
      prisma,
      storageProvider as any,
      imageProcessor as any,
      variantGenerator as any,
    );
    const session = {
      getSession: jest.fn(async () => ({ id: ownerId })),
      refreshUserProfile: jest.fn(async (userId: number, profile: unknown) => {
        redisSessions.set(`session:${userId}`, profile);
        return 1;
      }),
      refreshUserProfileForSession: jest.fn(
        async (sessionId: string, _userId: number, profile: unknown) => {
          redisSessions.set(`session:${sessionId}`, profile);
          return true;
        },
      ),
    };
    const uploadsController = new UploadsController(
      uploadsService,
      { checkQuota: jest.fn(async () => undefined) } as any,
      { getPlan: jest.fn(async () => 'FREE') } as any,
      { getSessionId: jest.fn(() => 'owner-session') } as any,
      session as unknown as SessionService,
    );
    const usersService = new UsersService(
      prisma,
      {
        userBackup: jest.fn(async () => undefined),
      } as unknown as BackupService,
      session as unknown as SessionService,
      { log: jest.fn(async () => undefined) } as unknown as AuditService,
      storageProvider as any,
    );
    const usersController = new UsersController(
      usersService,
      {} as any,
      { getSessionId: jest.fn(() => 'owner-session') } as any,
    );
    return {
      uploads,
      user,
      prisma,
      storageProvider,
      session,
      redisSessions,
      uploadsController,
      usersController,
      setObjectAvailability: (value: boolean) => {
        availability = value;
      },
    };
  }

  const file = (): Express.Multer.File =>
    ({
      buffer: Buffer.from('avatar de integração local'),
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 27,
    }) as Express.Multer.File;

  /** **Validates: Requirements 2.1, 2.2, 2.5, 3.1, 3.3** */
  it('processa o objeto, vincula READY e atualiza a sessão Redis', async () => {
    const env = createEnvironment();

    const created = await env.uploadsController.uploadFile(
      {} as any,
      file(),
      'avatar',
    );

    expect(created.data).not.toHaveProperty('status');
    expect(created.data.url).toMatch(/^https:\/\/storage\.test\/image\//);

    const status = await env.uploadsController.getStatus(created.data.id, {
      user: { id: ownerId },
    } as any);
    expect(status).toEqual({
      success: true,
      data: expect.objectContaining({
        id: created.data.id,
        status: UploadStatus.READY,
        url: expect.stringContaining('/image/'),
        url_md: expect.stringContaining('/image-md/'),
        url_web: expect.stringContaining('/image-sm/'),
      }),
    });

    const patch = await env.usersController.updateMe(
      { user: { id: ownerId } } as any,
      { avatar_upload_id: created.data.id } as any,
    );

    expect(patch.error).toBe(false);
    expect(patch.message).toBe('Usuário atualizado com sucesso');
    expect(env.user.avatar).toEqual(
      expect.objectContaining({
        id: 1,
        url: expect.stringContaining('/image/'),
      }),
    );
    expect(env.session.refreshUserProfileForSession).toHaveBeenCalledWith(
      'owner-session',
      ownerId,
      expect.objectContaining({
        avatar: expect.objectContaining({ id: 1 }),
      }),
    );
    expect(env.redisSessions.get('session:owner-session')).toEqual(
      expect.objectContaining({ avatar: expect.objectContaining({ id: 1 }) }),
    );
    expect(env.session.refreshUserProfile).toHaveBeenCalledTimes(1);
    expect(env.redisSessions.get(`session:${ownerId}`)).toEqual(
      expect.objectContaining({ avatar: expect.objectContaining({ id: 1 }) }),
    );
  });

  /** **Validates: Requirements 2.1, 2.3, 2.4, 3.4** */
  it('responde 503 quando o objeto não está disponível, grava FAILED e rejeita o PATCH', async () => {
    const env = createEnvironment(false);

    // O S3 é a barreira canônica: quando o objeto não fica disponível, o
    // upload NÃO pode responder um 202 de "sucesso" com FAILED mascarado.
    // O controller propaga o erro real do storage (503 + motivo seguro).
    await expect(
      env.uploadsController.uploadFile({} as any, file(), 'avatar'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    // Mesmo lançando 503, o registro FAILED é persistido e consultável.
    expect(env.uploads).toHaveLength(1);
    const failed = env.uploads[0];
    expect(failed.status).toBe(UploadStatus.FAILED);

    const status = await env.uploadsController.getStatus(failed.id, {
      user: { id: ownerId },
    } as any);
    expect(status).toEqual({
      success: true,
      data: {
        id: failed.id,
        status: UploadStatus.FAILED,
        rejectionReason: expect.any(String),
        url: null,
        url_md: null,
        url_web: null,
      },
    });

    // O PATCH que tentaria vincular um upload FAILED continua sendo rejeitado.
    const patch = await env.usersController.updateMe(
      { user: { id: ownerId } } as any,
      { avatar_upload_id: failed.id } as any,
    );
    expect(patch.error).toBe(true);
    expect(env.prisma.kYCProfile.create).not.toHaveBeenCalled();
    expect(env.prisma.user.update).not.toHaveBeenCalled();
    expect(env.session.refreshUserProfile).not.toHaveBeenCalled();
    expect(env.user.avatar).toBeNull();
  });

  /** **Validates: Requirements 2.3, 3.1, 3.2** */
  it('cria tentativas próprias e consultáveis para dois usuários que reenviam os mesmos bytes', async () => {
    const env = createEnvironment();
    const first = await env.uploadsController.uploadFile(
      {} as any,
      file(),
      'avatar',
    );

    env.session.getSession.mockResolvedValueOnce({ id: anotherOwnerId });
    const second = await env.uploadsController.uploadFile(
      {} as any,
      file(),
      'avatar',
    );

    expect(env.uploads).toHaveLength(2);
    expect(env.uploads.map((upload) => upload.userId)).toEqual([
      ownerId,
      anotherOwnerId,
    ]);
    expect(env.uploads[0].sha256).toBe(env.uploads[1].sha256);
    expect(env.uploads[0].id).not.toBe(env.uploads[1].id);

    await expect(
      env.uploadsController.getStatus(second.data.id, {
        user: { id: anotherOwnerId },
      } as any),
    ).resolves.toEqual({
      success: true,
      data: expect.objectContaining({
        id: second.data.id,
        status: UploadStatus.READY,
        url: expect.stringContaining('/image/'),
        url_md: expect.stringContaining('/image-md/'),
        url_web: expect.stringContaining('/image-sm/'),
      }),
    });
    await expect(
      env.uploadsController.getStatus(first.data.id, {
        user: { id: anotherOwnerId },
      } as any),
    ).rejects.toThrow('Upload não encontrado');
  });
});
