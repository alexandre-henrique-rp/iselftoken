import { Test, TestingModule } from '@nestjs/testing';
import { UploadStatus } from '@prisma/client';
import { Request } from 'express';
import { OBJECT_STORAGE_PROVIDER } from '../../common/storage/storage-provider.module';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageProcessorService } from './services/image-processor.service';
import { VariantGeneratorService } from './services/variant-generator.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/**
 * Property 1: disponibilidade do objeto canônico antes de processamento.
 *
 * Fluxo síncrono: cada create envia o objeto ao storage, confirma
 * `exists(bucket, key)` e só então processa variantes e persiste READY.
 *
 * **Validates: Requirements 1.1, 2.1, 3.4**
 */
describe('Condição de bug: publicação sem objeto canônico disponível', () => {
  let service: UploadsService;
  let prisma: { upload: Record<string, jest.Mock> };
  let storageProvider: Record<string, jest.Mock>;

  const ownerUserId = 101;
  const authenticatedUserId = 202;
  const file = {
    buffer: Buffer.from('avatar sem objeto no RustFS'),
    originalname: 'avatar.png',
    mimetype: 'image/png',
    size: 48,
  } as Express.Multer.File;

  const uploadRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 77,
    publicId: 'upload-avatar',
    userId: ownerUserId,
    type: 'image',
    mimeType: 'image/png',
    originalName: 'avatar.png',
    size: file.size,
    extension: 'png',
    bucket: 'image',
    key: 'avatars/canonical.png',
    sha256: 'f'.repeat(64),
    status: UploadStatus.READY,
    rejectionReason: null,
    url: null,
    url_md: null,
    url_web: null,
    deletedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      upload: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    storageProvider = {
      delete: jest.fn(),
      download: jest.fn(),
      exists: jest.fn().mockResolvedValue(false),
      getBucketPrefix: jest.fn().mockReturnValue(''),
      getPresignedUrl: jest.fn(),
      healthCheck: jest.fn(),
      upload: jest.fn().mockResolvedValue({
        url: 'https://storage.test/image/canonical.png',
        key: 'canonical.png',
        bucket: 'image',
        size: file.size,
      }),
      uploadStream: jest.fn(),
    };

    const imageProcessor = {
      validateAndSanitize: jest.fn().mockResolvedValue({
        valid: true,
        metadata: { width: 16, height: 16 },
      }),
    };
    const variantGenerator = {
      generateImageVariants: jest.fn().mockResolvedValue({
        lg: {},
        md: {
          webp: {
            bucket: 'image-md',
            key: 'canonical.webp',
            url: 'https://storage.test/image-md/canonical.webp',
          },
        },
        sm: {
          webp: {
            bucket: 'image-sm',
            key: 'canonical.webp',
            url: 'https://storage.test/image-sm/canonical.webp',
          },
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OBJECT_STORAGE_PROVIDER, useValue: storageProvider },
        { provide: ImageProcessorService, useValue: imageProcessor },
        { provide: VariantGeneratorService, useValue: variantGenerator },
      ],
    }).compile();
    service = module.get(UploadsService);
  });

  it('não publica job e grava FAILED quando o objeto não existe após o upload', async () => {
    const failed = uploadRecord({
      status: UploadStatus.FAILED,
      rejectionReason:
        'Arquivo indisponível no armazenamento. Envie-o novamente.',
    });
    prisma.upload.create.mockResolvedValue(failed);
    storageProvider.exists.mockResolvedValue(false);

    const result = await service.create(file, ownerUserId);

    // Sem consulta de deduplicação prévia
    expect(prisma.upload.findFirst).not.toHaveBeenCalled();
    expect(prisma.upload.findUnique).not.toHaveBeenCalled();
    // Fez upload, confirmou ausência, limpou o objeto e persistiu FAILED
    expect(storageProvider.upload).toHaveBeenCalled();
    expect(storageProvider.exists).toHaveBeenCalled();
    expect(storageProvider.delete).toHaveBeenCalled();
    expect(prisma.upload.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: ownerUserId,
        status: UploadStatus.FAILED,
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({ status: UploadStatus.FAILED }),
    );
  });

  it('processa e persiste READY somente após confirmar disponibilidade', async () => {
    const ready = uploadRecord({
      status: UploadStatus.READY,
      url: 'https://storage.test/image/canonical.png',
      url_md: 'https://storage.test/image-md/canonical.webp',
      url_web: 'https://storage.test/image-sm/canonical.webp',
    });
    prisma.upload.create.mockResolvedValue(ready);
    storageProvider.exists.mockResolvedValue(true);

    const result = await service.create(file, ownerUserId);

    const uploadOrder = storageProvider.upload.mock.invocationCallOrder[0];
    const existsOrder = storageProvider.exists.mock.invocationCallOrder[0];
    const createOrder = prisma.upload.create.mock.invocationCallOrder[0];
    expect(uploadOrder).toBeLessThan(existsOrder);
    expect(existsOrder).toBeLessThan(createOrder);
    expect(storageProvider.exists).toHaveBeenCalledWith(
      'image',
      expect.stringMatching(/^[a-f0-9]{64}\.png$/),
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: UploadStatus.READY,
        url: ready.url,
        url_md: ready.url_md,
        url_web: ready.url_web,
      }),
    );
  });

  /**
   * **Validates: Requirements 1.2, 2.3, 3.1, 3.2**
   *
   * Dois usuários (ou o mesmo) reenviando os mesmos bytes geram REGISTROS
   * NOVOS e independentes; o getStatus isola ownership.
   */
  it('cria tentativa própria sem revelar registros de outro proprietário', async () => {
    const ownAttempt = uploadRecord({
      id: 78,
      publicId: 'upload-do-solicitante',
      userId: authenticatedUserId,
      status: UploadStatus.READY,
    });
    prisma.upload.create.mockResolvedValue(ownAttempt);
    prisma.upload.findFirst.mockResolvedValue({
      id: ownAttempt.id,
      status: ownAttempt.status,
      rejectionReason: null,
      bucket: ownAttempt.bucket,
      key: ownAttempt.key,
      url: null,
    });
    storageProvider.exists.mockResolvedValue(true);

    const result = await service.create(file, authenticatedUserId);
    const controller = new UploadsController(
      service,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    expect(prisma.upload.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: authenticatedUserId }),
    });
    await expect(
      controller.getStatus(result.id, {
        user: { id: authenticatedUserId },
      } as unknown as Request),
    ).resolves.toEqual({
      success: true,
      data: {
        id: ownAttempt.id,
        status: UploadStatus.READY,
        rejectionReason: null,
        url: null,
      },
    });
  });

  it('mantém upload público sem proprietário e sem deduplicação de registro', async () => {
    const publicAttempt = uploadRecord({
      id: 79,
      userId: null,
      status: UploadStatus.READY,
    });
    prisma.upload.create.mockResolvedValue(publicAttempt);
    storageProvider.exists.mockResolvedValue(true);

    await service.create(file);

    expect(prisma.upload.findFirst).not.toHaveBeenCalled();
    expect(prisma.upload.findUnique).not.toHaveBeenCalled();
    expect(prisma.upload.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null }),
    });
  });
});
