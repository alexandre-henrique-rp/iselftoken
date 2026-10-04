import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from '../../auth/session/session.service';
import { BackupService } from '../../backup/backup.service';
import { AuditService } from '../../common/audit/audit.service';
import { OBJECT_STORAGE_PROVIDER } from '../../common/storage/storage-provider.module';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    upload: { findFirst: jest.Mock };
    kYCProfile: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let session: {
    getUserCache: jest.Mock;
    deleteUserCache: jest.Mock;
    refreshUserProfile: jest.Mock;
    refreshUserProfileForSession: jest.Mock;
  };
  let storageProvider: { getPresignedUrl: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            upload: {
              findFirst: jest.fn(),
            },
            kYCProfile: {
              create: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn(),
            },
            $transaction: jest.fn(async (callback) => callback(prisma)),
          },
        },
        {
          provide: BackupService,
          useValue: {
            createBackup: jest.fn(),
            userBackup: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            getSession: jest.fn(),
            getUserCache: jest.fn().mockResolvedValue(null),
            deleteUserCache: jest.fn(),
            setSession: jest.fn(),
            deleteSession: jest.fn(),
            updateSession: jest.fn(),
            refreshUserProfile: jest.fn(),
            refreshUserProfileForSession: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: OBJECT_STORAGE_PROVIDER,
          useValue: {
            getPresignedUrl: jest.fn(),
            getBucketPrefix: jest.fn().mockReturnValue(''),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService) as unknown as typeof prisma;
    session = module.get(SessionService) as unknown as typeof session;
    storageProvider = module.get(
      OBJECT_STORAGE_PROVIDER,
    ) as typeof storageProvider;
  });

  it('hidrata uma sessão antiga com dados pessoais e KYC no GET /users/me', async () => {
    prisma.user.findUnique.mockResolvedValue({
      telefone: '11999999999',
      data_nascimento: null,
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
      avatar: { id: 1, url: 'avatar', status: 'APPROVED' },
      comprovante: null,
      documento: null,
      biofacial: null,
    });

    const result = await service.getMe({
      id: 1,
      publicId: 'public-1',
      email: 'user@example.com',
      nome: 'Usuário',
      role: 'USER',
      pais: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      wallet: null,
      subscriptions: [],
      startups: [],
    } as any);

    expect(result.error).toBe(false);
    expect(result.data?.telefone).toBe('11999999999');
    expect(result.data?.avatar).toEqual({
      id: 1,
      url: 'avatar',
      url_sm: null,
      url_md: null,
      url_lg: null,
      url_web: null,
      status: 'APPROVED',
    });
    expect(session.getUserCache).toHaveBeenCalledWith('1');
    expect(session.refreshUserProfile).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ telefone: '11999999999' }),
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, select: expect.any(Object) }),
    );
  });

  it('converte imediatamente o upload do usuário em KYCProfile e vincula o avatar', async () => {
    storageProvider.getPresignedUrl.mockResolvedValue(
      'https://storage/avatar-new.jpg',
    );
    prisma.user.findUnique.mockResolvedValueOnce({});
    prisma.upload.findFirst.mockResolvedValue({
      id: 44,
      userId: 7,
      originalName: 'avatar-new.jpg',
      size: 1024,
      mimeType: 'image/jpeg',
      extension: 'jpg',
      bucket: 'image',
      key: 'new-upload.jpg',
      url: 'https://storage/avatar-new.jpg',
      url_md: 'https://storage/avatar-new.jpg',
      url_web: 'https://storage/avatar-new.jpg',
      status: 'PENDING',
    });
    prisma.kYCProfile.create.mockResolvedValue({ id: 99 });
    prisma.kYCProfile.findFirst.mockResolvedValue({
      id: 99,
      mineType: 'image/jpeg',
    });
    prisma.user.update.mockResolvedValue({
      id: 7,
      avatar: {
        id: 99,
        url: 'https://storage/avatar-new.jpg',
        url_sm: null,
        url_md: null,
        url_lg: null,
        status: 'PENDING',
      },
    });

    const result = await service.updateMe(
      { id: 7 } as any,
      { avatar_upload_id: 44 } as any,
      'session-abc',
    );

    expect(prisma.upload.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 44, userId: 7, deletedAt: null },
      }),
    );
    expect(prisma.kYCProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          originalName: 'avatar-new.jpg',
          url: 'https://storage/avatar-new.jpg',
          status: 'PENDING',
        }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ avatar_id: 99 }),
      }),
    );
    expect(result.data?.avatar?.id).toBe(99);
    expect(session.refreshUserProfileForSession).toHaveBeenCalledWith(
      'session-abc',
      7,
      expect.objectContaining({
        avatar: expect.objectContaining({ id: 99 }),
      }),
    );
  });

  it('regenera presigned URLs expiradas no GET /users/me', async () => {
    const expiredUrl =
      'https://iselftoken-image.s3.sa-east-1.amazonaws.com/avatar/test.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=expired';
    const freshUrl =
      'https://iselftoken-image.s3.sa-east-1.amazonaws.com/avatar/test.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=fresh';

    storageProvider.getPresignedUrl.mockResolvedValue(freshUrl);

    prisma.user.findUnique.mockResolvedValue({
      telefone: '11999999999',
      data_nascimento: null,
      genero: null,
      endereco: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      uf: null,
      cep: null,
      tipo_documento: null,
      reg_documento: null,
      avatar: {
        id: 1,
        url: expiredUrl,
        url_sm: expiredUrl,
        url_md: expiredUrl,
        url_lg: expiredUrl,
        status: 'APPROVED',
      },
      comprovante: null,
      documento: null,
      biofacial: null,
    });

    const result = await service.getMe({
      id: 1,
      publicId: 'public-1',
      email: 'user@example.com',
      nome: 'Usuário',
      role: 'USER',
      pais: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      wallet: null,
      subscriptions: [],
      startups: [],
    } as any);

    expect(result.error).toBe(false);
    expect(result.data?.avatar?.url).toBe(freshUrl);
    expect(result.data?.avatar?.url_sm).toBe(freshUrl);
    expect(result.data?.avatar?.url_md).toBe(freshUrl);
    expect(result.data?.avatar?.url_lg).toBe(freshUrl);
    expect(storageProvider.getPresignedUrl).toHaveBeenCalledTimes(4);
  });

  it('mantém URL original quando parsing falha no GET /users/me', async () => {
    const invalidUrl = 'not-a-valid-url';

    prisma.user.findUnique.mockResolvedValue({
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
      tipo_documento: null,
      reg_documento: null,
      avatar: {
        id: 1,
        url: invalidUrl,
        url_sm: null,
        url_md: null,
        url_lg: null,
        status: 'PENDING',
      },
      comprovante: null,
      documento: null,
      biofacial: null,
    });

    const result = await service.getMe({
      id: 1,
      publicId: 'public-1',
      email: 'user@example.com',
      nome: 'Usuário',
      role: 'USER',
      pais: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      wallet: null,
      subscriptions: [],
      startups: [],
    } as any);

    expect(result.error).toBe(false);
    expect(result.data?.avatar?.url).toBe(invalidUrl);
    expect(storageProvider.getPresignedUrl).not.toHaveBeenCalled();
  });
});
