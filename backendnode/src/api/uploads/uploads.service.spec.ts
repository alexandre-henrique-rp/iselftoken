import { Test, TestingModule } from '@nestjs/testing';
import { UploadStatus } from '@prisma/client';
import { OBJECT_STORAGE_PROVIDER } from '../../common/storage/storage-provider.module';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageProcessorService } from './services/image-processor.service';
import { VariantGeneratorService } from './services/variant-generator.service';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  let service: UploadsService;
  let storageProvider: Record<string, jest.Mock>;

  const mockUpload = {
    id: 1,
    publicId: 'test-public-id',
    userId: 1,
    startupId: null,
    type: 'image',
    mimeType: 'image/jpeg',
    originalName: 'test.jpg',
    size: 1024,
    extension: 'jpg',
    bucket: 'image',
    key: 'abc123.jpg',
    sha256: 'sha256hash',
    variants: null,
    status: 'READY',
    applicancy: 'APPLICABLE',
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    storageProvider = {
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
      getPresignedUrl: jest.fn(),
      exists: jest.fn(),
      healthCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: PrismaService,
          useValue: {
            upload: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              aggregate: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: OBJECT_STORAGE_PROVIDER,
          useValue: storageProvider,
        },
        {
          provide: ImageProcessorService,
          useValue: {
            validateAndSanitize: jest.fn(),
          },
        },
        {
          provide: VariantGeneratorService,
          useValue: {
            generateImageVariants: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  describe('create síncrono', () => {
    it('processa imagem, persiste READY e retorna URLs públicas das variantes', async () => {
      const prisma = (service as any).prisma;
      const file = {
        buffer: Buffer.from('image'),
        mimetype: 'image/jpeg',
        originalname: 'avatar.jpg',
        size: 5,
      } as Express.Multer.File;
      const originalUrl = 'https://storage.test/image/hash.jpg';
      storageProvider.upload.mockResolvedValue({
        url: originalUrl,
        key: 'hash.jpg',
        bucket: 'image',
        size: file.size,
      });
      storageProvider.exists.mockResolvedValue(true);
      (service as any).imageProcessor.validateAndSanitize.mockResolvedValue({
        valid: true,
        metadata: { width: 1000, height: 800, format: 'jpeg', size: file.size },
      });
      (service as any).variantGenerator.generateImageVariants.mockResolvedValue(
        {
          md: {
            jpeg: {
              bucket: 'image-md',
              key: 'hash.jpg',
              url: 'https://storage.test/image-md/hash.jpg',
            },
          },
          sm: {
            webp: {
              bucket: 'image-sm',
              key: 'hash.webp',
              url: 'https://storage.test/image-sm/hash.webp',
            },
          },
          lg: {},
        },
      );
      prisma.upload.create.mockResolvedValue({
        ...mockUpload,
        status: UploadStatus.READY,
        url: originalUrl,
        url_md: 'https://storage.test/image-md/hash.webp',
        url_web: 'https://storage.test/image-sm/hash.webp',
      });

      const result = await service.create(file, 1);

      expect(result.status).toBe(UploadStatus.READY);
      expect(result.url).toBe(originalUrl);
      expect(result.url_md).toContain('image-md');
      expect(result.url_web).toContain('image-sm');
      expect(prisma.upload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: UploadStatus.READY,
          url: originalUrl,
          url_md: expect.stringContaining('image-md'),
          url_web: expect.stringContaining('image-sm'),
        }),
      });
    });

    it('repete a URL original nos campos de documento sem processamento extra', async () => {
      const prisma = (service as any).prisma;
      const file = {
        buffer: Buffer.from('pdf'),
        mimetype: 'application/pdf',
        originalname: 'documento.pdf',
        size: 3,
      } as Express.Multer.File;
      const originalUrl = 'https://storage.test/document/documento.pdf';
      storageProvider.upload.mockResolvedValue({
        url: originalUrl,
        key: 'hash.pdf',
        bucket: 'document',
        size: file.size,
      });
      storageProvider.exists.mockResolvedValue(true);
      prisma.upload.create.mockResolvedValue({
        ...mockUpload,
        type: 'document',
        status: UploadStatus.READY,
        url: originalUrl,
        url_md: originalUrl,
        url_web: originalUrl,
      });

      const result = await service.create(file, 1);

      expect(result.url).toBe(originalUrl);
      expect(result.url_md).toBe(originalUrl);
      expect(result.url_web).toBe(originalUrl);
      expect(
        (service as any).imageProcessor.validateAndSanitize,
      ).not.toHaveBeenCalled();
      expect(
        (service as any).variantGenerator.generateImageVariants,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve retornar upload existente', async () => {
      (service as any).prisma.upload.findUnique.mockResolvedValue(mockUpload);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.publicId).toBe('test-public-id');
    });

    it('deve retornar null se nao encontrado', async () => {
      (service as any).prisma.upload.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('deve listar uploads por userId', async () => {
      (service as any).prisma.upload.findMany.mockResolvedValue([mockUpload]);

      const result = await service.findByUser(1);

      expect(result).toHaveLength(1);
      expect(result[0].publicId).toBe('test-public-id');
    });
  });

  describe('findByStartup', () => {
    it('deve listar uploads por startupId', async () => {
      (service as any).prisma.upload.findMany.mockResolvedValue([mockUpload]);

      const result = await service.findByStartup(1);

      expect(result).toHaveLength(1);
    });
  });

  describe('GET /uploads/:id/status', () => {
    it.each([UploadStatus.FAILED, UploadStatus.INFECTED])(
      'retorna estado terminal autorizado %s sem URL',
      async (status) => {
        (service as any).prisma.upload.findFirst.mockResolvedValue({
          id: 1,
          status,
          rejectionReason: 'Motivo seguro para o cliente',
          bucket: 'image',
          key: 'avatars/failed.png',
          url: null,
          url_md: null,
          url_web: null,
        });

        await expect(service.getStatusForUser(1, 7)).resolves.toEqual({
          id: 1,
          status,
          rejectionReason: 'Motivo seguro para o cliente',
          url: null,
          url_md: null,
          url_web: null,
        });
        expect(storageProvider.getPresignedUrl).not.toHaveBeenCalled();
      },
    );

    it('retorna as URLs públicas persistidas para READY sem presign', async () => {
      const originalUrl = 'https://storage.test/image/ready.png';
      (service as any).prisma.upload.findFirst.mockResolvedValue({
        id: 1,
        status: UploadStatus.READY,
        rejectionReason: null,
        url: originalUrl,
        url_md: 'https://storage.test/image-md/ready.webp',
        url_web: 'https://storage.test/image-sm/ready.webp',
      });

      await expect(service.getStatusForUser(1, 7)).resolves.toEqual({
        id: 1,
        status: UploadStatus.READY,
        rejectionReason: null,
        url: originalUrl,
        url_md: 'https://storage.test/image-md/ready.webp',
        url_web: 'https://storage.test/image-sm/ready.webp',
      });
      expect(storageProvider.getPresignedUrl).not.toHaveBeenCalled();
    });
  });
});
