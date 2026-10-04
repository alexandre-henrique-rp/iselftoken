import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UploadStatus } from '@prisma/client';
import { Request } from 'express';
import { SessionService } from '../../auth/session/session.service';
import { BackupService } from '../../backup/backup.service';
import { AuditService } from '../../common/audit/audit.service';
import { OBJECT_STORAGE_PROVIDER } from '../../common/storage/storage-provider.module';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ImageProcessorService } from './services/image-processor.service';
import { VariantGeneratorService } from './services/variant-generator.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

describe('Property 2: preservação do upload de avatar fora da condição de bug', () => {
  let uploadsService: UploadsService;
  let uploadsController: UploadsController;
  let prisma: { upload: Record<string, jest.Mock> };
  let storageProvider: Record<string, jest.Mock>;

  const ownerId = 41;
  const otherUserId = 42;
  const readyUrl = 'https://storage.test/image/avatar-ready.webp';
  const uploadFor = (status: UploadStatus) => ({
    id: 81,
    status,
    rejectionReason: null,
    bucket: 'image',
    key: 'avatars/available.webp',
    url: status === UploadStatus.READY ? readyUrl : null,
    url_md:
      status === UploadStatus.READY
        ? 'https://storage.test/image-md/avatar.webp'
        : null,
    url_web:
      status === UploadStatus.READY
        ? 'https://storage.test/image-sm/avatar.webp'
        : null,
  });

  beforeEach(async () => {
    prisma = {
      upload: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    storageProvider = {
      delete: jest.fn(),
      download: jest.fn(),
      exists: jest.fn().mockResolvedValue(true),
      getBucketPrefix: jest.fn().mockReturnValue(''),
      getPresignedUrl: jest.fn().mockResolvedValue(readyUrl),
      healthCheck: jest.fn(),
      upload: jest.fn(),
      uploadStream: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OBJECT_STORAGE_PROVIDER, useValue: storageProvider },
        {
          provide: ImageProcessorService,
          useValue: {
            validateAndSanitize: jest.fn().mockResolvedValue({
              valid: true,
              metadata: { width: 16, height: 16 },
            }),
          },
        },
        {
          provide: VariantGeneratorService,
          useValue: {
            generateImageVariants: jest.fn().mockResolvedValue({
              lg: {},
              md: {
                webp: {
                  bucket: 'image-md',
                  key: 'avatar.webp',
                  url: 'https://storage.test/image-md/avatar.webp',
                },
              },
              sm: {
                webp: {
                  bucket: 'image-sm',
                  key: 'avatar.webp',
                  url: 'https://storage.test/image-sm/avatar.webp',
                },
              },
            }),
          },
        },
      ],
    }).compile();
    uploadsService = module.get(UploadsService);
    uploadsController = new UploadsController(
      uploadsService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  /** **Validates: Requirements 2.2, 3.1, 3.3** */
  it.each([UploadStatus.PENDING, UploadStatus.PROCESSING, UploadStatus.READY])(
    'preserva status autorizado %s e limita URL a READY',
    async (status) => {
      prisma.upload.findFirst.mockResolvedValue(uploadFor(status));
      const response = await uploadsController.getStatus(81, {
        user: { id: ownerId },
      } as unknown as Request);

      expect(response).toEqual({
        success: true,
        data: {
          id: 81,
          status,
          rejectionReason: null,
          url: status === UploadStatus.READY ? readyUrl : null,
          url_md:
            status === UploadStatus.READY
              ? 'https://storage.test/image-md/avatar.webp'
              : null,
          url_web:
            status === UploadStatus.READY
              ? 'https://storage.test/image-sm/avatar.webp'
              : null,
        },
      });
      expect(storageProvider.getPresignedUrl).not.toHaveBeenCalled();
    },
  );

  /** **Validates: Requirements 3.2** */
  it.each([
    'upload inexistente',
    'upload soft-deletado',
    'upload de outro proprietário',
  ])('não revela metadados para %s', async () => {
    prisma.upload.findFirst.mockResolvedValue(null);
    await expect(
      uploadsController.getStatus(81, {
        user: { id: otherUserId },
      } as unknown as Request),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storageProvider.getPresignedUrl).not.toHaveBeenCalled();
  });

  it('processa o caminho saudável de imagem de forma síncrona', async () => {
    const canonicalUrl = 'https://storage.test/image/available.webp';
    storageProvider.upload.mockResolvedValue({
      bucket: 'image',
      key: 'available.webp',
      url: canonicalUrl,
      size: 5,
    });
    storageProvider.exists.mockResolvedValue(true);
    prisma.upload.create.mockResolvedValue({
      id: 81,
      publicId: 'upload-ready',
      status: UploadStatus.READY,
      sha256: 'a'.repeat(64),
      url: canonicalUrl,
      url_md: 'https://storage.test/image-md/available.webp',
      url_web: 'https://storage.test/image-sm/available.webp',
    });

    const result = await uploadsService.create(
      {
        buffer: Buffer.from('image'),
        originalname: 'available.webp',
        mimetype: 'image/webp',
        size: 5,
      } as Express.Multer.File,
      ownerId,
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: UploadStatus.READY,
        url: canonicalUrl,
        url_md: expect.stringContaining('/image-md/'),
        url_web: expect.stringContaining('/image-sm/'),
      }),
    );
  });

  /** **Validates: Requirements 1.3, 2.4, 3.4** */
  it.each([
    UploadStatus.PENDING,
    UploadStatus.PROCESSING,
    UploadStatus.FAILED,
    UploadStatus.INFECTED,
  ])('preserva bloqueio de vínculo para avatar %s', async (status) => {
    const usersPrisma = {
      user: { findUnique: jest.fn().mockResolvedValue({}), update: jest.fn() },
      upload: {
        findFirst: jest.fn().mockResolvedValue({
          id: 81,
          bucket: 'image',
          key: 'avatars/available.webp',
          status,
          deletedAt: null,
        }),
      },
      kYCProfile: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const session = { refreshUserProfile: jest.fn() };
    const usersService = new UsersService(
      usersPrisma as any,
      { userBackup: jest.fn() } as unknown as BackupService,
      session as unknown as SessionService,
      { log: jest.fn() } as unknown as AuditService,
      storageProvider as any,
    );
    const result = await usersService.updateMe(
      { id: ownerId } as any,
      { avatar_upload_id: 81 } as any,
    );
    expect(result.error).toBe(true);
    expect(usersPrisma.kYCProfile.create).not.toHaveBeenCalled();
    expect(usersPrisma.user.update).not.toHaveBeenCalled();
    expect(session.refreshUserProfile).not.toHaveBeenCalled();
  });
});
