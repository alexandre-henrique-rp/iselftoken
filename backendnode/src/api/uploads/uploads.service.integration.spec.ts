/**
 * Testes de integracao para UploadsService.
 *
 * Testa o fluxo completo: create -> processamento -> findOne -> delete.
 * Usa mocks do storage provider e Prisma.
 *
 * @see T33
 */
import { Test, TestingModule } from '@nestjs/testing';
import { OBJECT_STORAGE_PROVIDER } from '../../common/storage/storage-provider.module';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageProcessorService } from './services/image-processor.service';
import { VariantGeneratorService } from './services/variant-generator.service';
import { UploadsService } from './uploads.service';

describe('UploadsService (Integration)', () => {
  let service: UploadsService;
  let prisma: any;
  let storageProvider: any;

  const mockUpload = {
    id: 1,
    publicId: 'test-public-id-123',
    userId: 1,
    startupId: null,
    type: 'image',
    mimeType: 'image/jpeg',
    originalName: 'test.jpg',
    size: 1024,
    extension: 'jpg',
    bucket: 'image',
    key: 'abc123sha256.jpg',
    sha256: 'abc123sha256',
    variants: null,
    status: 'READY',
    applicancy: 'APPLICABLE',
    rejectionReason: null,
    url: 'https://image.localhost/abc123sha256.jpg',
    url_md: 'https://image-md.localhost/abc123sha256.webp',
    url_web: 'https://image-sm.localhost/abc123sha256.webp',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockFile: Express.Multer.File = {
    buffer: Buffer.from('test image content'),
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    fieldname: 'file',
    encoding: '7bit',
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  beforeEach(async () => {
    const mockPrisma = {
      upload: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockStorageProvider = {
      upload: jest.fn().mockResolvedValue({
        url: 'https://image.localhost/abc123sha256.jpg',
        key: 'abc123sha256.jpg',
        bucket: 'image',
        size: 1024,
      }),
      download: jest.fn(),
      delete: jest.fn(),
      getPresignedUrl: jest.fn(),
      exists: jest.fn().mockResolvedValue(true),
      healthCheck: jest.fn(),
      uploadStream: jest.fn(),
    };

    const mockImageProcessor = {
      validateAndSanitize: jest.fn().mockResolvedValue({
        valid: true,
        metadata: { width: 1000, height: 800 },
      }),
    };
    const mockVariantGenerator = {
      generateImageVariants: jest.fn().mockResolvedValue({
        lg: {},
        md: {
          webp: {
            bucket: 'image-md',
            key: 'abc123sha256.webp',
            url: 'https://image-md.localhost/abc123sha256.webp',
          },
        },
        sm: {
          webp: {
            bucket: 'image-sm',
            key: 'abc123sha256.webp',
            url: 'https://image-sm.localhost/abc123sha256.webp',
          },
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OBJECT_STORAGE_PROVIDER, useValue: mockStorageProvider },
        { provide: ImageProcessorService, useValue: mockImageProcessor },
        { provide: VariantGeneratorService, useValue: mockVariantGenerator },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
    prisma = module.get(PrismaService);
    storageProvider = module.get(OBJECT_STORAGE_PROVIDER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar upload com sucesso e retornar 200 com READY', async () => {
      prisma.upload.create.mockResolvedValue({
        ...mockUpload,
        status: 'READY',
      });

      const result = await service.create(mockFile);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('publicId');
      expect(result.status).toBe('READY');
      expect(result.sha256).toBeDefined();
      expect(storageProvider.exists).toHaveBeenCalled();
      expect(storageProvider.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          bucket: 'image',
          contentType: 'image/jpeg',
        }),
      );
      expect(result.url).toBe(mockUpload.url);
      expect(result.url_md).toBe(mockUpload.url_md);
      expect(result.url_web).toBe(mockUpload.url_web);
    });

    it('cria um registro NOVO a cada chamada com os mesmos bytes (sem deduplicação)', async () => {
      prisma.upload.create
        .mockResolvedValueOnce({ ...mockUpload, id: 1 })
        .mockResolvedValueOnce({ ...mockUpload, id: 2 });

      const first = await service.create(mockFile, mockUpload.userId);
      const second = await service.create(mockFile, mockUpload.userId);

      expect(prisma.upload.findFirst).not.toHaveBeenCalled();
      expect(prisma.upload.findUnique).not.toHaveBeenCalled();
      expect(prisma.upload.create).toHaveBeenCalledTimes(2);
      expect(prisma.upload.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({ userId: mockUpload.userId }),
      });
      expect(first.id).toBe(1);
      expect(second.id).toBe(2);
      expect(storageProvider.upload).toHaveBeenCalledTimes(2);
    });

    it('grava FAILED consultável quando o objeto não fica disponível no storage', async () => {
      storageProvider.exists.mockResolvedValueOnce(false);
      prisma.upload.create.mockResolvedValue({
        ...mockUpload,
        status: 'FAILED',
        rejectionReason: 'Arquivo indisponível no armazenamento.',
        url: null,
        url_md: null,
        url_web: null,
      });

      const result = await service.create(mockFile, mockUpload.userId);

      expect(result.status).toBe('FAILED');
      expect(storageProvider.delete).toHaveBeenCalled();
      expect(prisma.upload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    });

    it('deve falhar quando storage provider lancar erro', async () => {
      storageProvider.upload.mockRejectedValue(
        new Error('Storage unavailable'),
      );

      await expect(service.create(mockFile)).rejects.toThrow();
    });

    it('deve usar bucket correto para videos', async () => {
      const videoFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'video/mp4',
        originalname: 'video.mp4',
        size: 1024 * 1024,
      };

      prisma.upload.create.mockResolvedValue({
        ...mockUpload,
        type: 'video',
        bucket: 'video',
        url: 'https://video.localhost/abc123sha256.mp4',
        url_md: null,
        url_web: null,
      });
      storageProvider.upload.mockResolvedValue({
        url: 'https://video.localhost/abc123sha256.mp4',
        key: 'abc123sha256.mp4',
        bucket: 'video',
        size: 1024 * 1024,
      });

      const result = await service.create(videoFile);

      expect(result.status).toBe('READY');
      expect(result.url).toBe('https://video.localhost/abc123sha256.mp4');
      expect(result.url_md).toBeUndefined();
      expect(result.url_web).toBeUndefined();
      expect(storageProvider.upload).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'video' }),
      );
    });

    it('deve usar bucket correto para documentos', async () => {
      const docFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'application/pdf',
        originalname: 'document.pdf',
        size: 2048,
      };

      prisma.upload.create.mockResolvedValue({
        ...mockUpload,
        type: 'document',
        bucket: 'document',
        url: 'https://document.localhost/abc123sha256.pdf',
        url_md: 'https://document.localhost/abc123sha256.pdf',
        url_web: 'https://document.localhost/abc123sha256.pdf',
      });
      storageProvider.upload.mockResolvedValue({
        url: 'https://document.localhost/abc123sha256.pdf',
        key: 'abc123sha256.pdf',
        bucket: 'document',
        size: 2048,
      });

      const result = await service.create(docFile);

      expect(result.url).toBe(result.url_md);
      expect(result.url).toBe(result.url_web);
      expect(storageProvider.upload).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'document' }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar upload existente', async () => {
      prisma.upload.findUnique.mockResolvedValue(mockUpload);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUpload);
      expect(prisma.upload.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve retornar null quando nao encontrado', async () => {
      prisma.upload.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('deve retornar uploads paginados', async () => {
      const uploads = [mockUpload, { ...mockUpload, id: 2 }];
      prisma.upload.findMany.mockResolvedValue(uploads);
      prisma.upload.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('deve filtrar por status', async () => {
      prisma.upload.findMany.mockResolvedValue([mockUpload]);
      prisma.upload.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10, status: 'PENDING' });

      expect(prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('deve filtrar por tipo', async () => {
      prisma.upload.findMany.mockResolvedValue([mockUpload]);
      prisma.upload.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10, type: 'image' });

      expect(prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'image' }),
        }),
      );
    });
  });

  describe('findByUser', () => {
    it('deve retornar uploads do usuario', async () => {
      prisma.upload.findMany.mockResolvedValue([mockUpload]);

      const result = await service.findByUser(1);

      expect(result).toHaveLength(1);
      expect(prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1 },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findByStartup', () => {
    it('deve retornar uploads da startup', async () => {
      prisma.upload.findMany.mockResolvedValue([mockUpload]);

      const result = await service.findByStartup(1);

      expect(result).toHaveLength(1);
      expect(prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { startupId: 1 },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('remove', () => {
    it('deve fazer soft-delete quando ha outras referencias SHA-256', async () => {
      const uploadWithRefs = { ...mockUpload, sha256: 'shared-sha256' };
      prisma.upload.findUnique.mockResolvedValue(uploadWithRefs);
      prisma.upload.count.mockResolvedValue(2); // 2 outras referencias

      await service.remove(1, { id: 1, role: 'ADMIN' });

      expect(prisma.upload.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
      // Nao deve deletar do storage
      expect(storageProvider.delete).not.toHaveBeenCalled();
    });

    it('deve deletar do storage quando nao ha outras referencias', async () => {
      const uploadNoRefs = { ...mockUpload, sha256: 'unique-sha256' };
      prisma.upload.findUnique.mockResolvedValue(uploadNoRefs);
      prisma.upload.count.mockResolvedValue(0); // Sem outras referencias
      storageProvider.delete.mockResolvedValue(undefined);

      await service.remove(1, { id: 1, role: 'ADMIN' });

      expect(storageProvider.delete).toHaveBeenCalledWith(
        'image',
        'abc123sha256.jpg',
      );
    });

    it('deve deletar variants quando existir', async () => {
      const uploadWithVariants = {
        ...mockUpload,
        variants: {
          lg: {},
          md: {
            png: { bucket: 'image-md', key: 'hash.png', size: 2048 },
          },
          sm: {
            webp: { bucket: 'image-sm', key: 'hash.webp', size: 1024 },
          },
        },
      };
      prisma.upload.findUnique.mockResolvedValue(uploadWithVariants);
      prisma.upload.count.mockResolvedValue(0);
      storageProvider.delete.mockResolvedValue(undefined);

      await service.remove(1, { id: 1, role: 'ADMIN' });

      // Deve deletar o original + uma variant media + uma variant pequena
      expect(storageProvider.delete).toHaveBeenCalledTimes(3);
    });

    it('deve lancar NotFoundException quando upload nao existe', async () => {
      prisma.upload.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(999, { id: 1, role: 'ADMIN' }),
      ).rejects.toThrow();
    });
  });
});
