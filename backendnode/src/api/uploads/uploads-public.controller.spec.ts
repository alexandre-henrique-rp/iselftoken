import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadsPublicController } from './uploads-public.controller';
import { UploadsService } from './uploads.service';
import { ThrottlerModule } from '@nestjs/throttler';

describe('UploadsPublicController', () => {
  let controller: UploadsPublicController;
  let uploadsService: UploadsService;

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
    variants: {
      lg: {
        avif: { bucket: 'image', key: 'abc123.avif', size: 409600 },
        webp: { bucket: 'image', key: 'abc123.webp', size: 716800 },
        jpeg: { bucket: 'image', key: 'abc123.jpg', size: 1228800 },
      },
    },
    status: 'READY',
    applicancy: 'APPLICABLE',
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockUploadsService = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByUser: jest.fn(),
    findByStartup: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 100,
          },
        ]),
      ],
      controllers: [UploadsPublicController],
      providers: [{ provide: UploadsService, useValue: mockUploadsService }],
    }).compile();

    controller = module.get<UploadsPublicController>(UploadsPublicController);
    uploadsService = module.get<UploadsService>(UploadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findById', () => {
    it('deve retornar detalhes do upload com variants', async () => {
      mockUploadsService.findOne.mockResolvedValue(mockUpload);

      const result = await controller.findById(1);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.publicId).toBe('test-public-id');
      expect(result.data.variants).toBeDefined();
    });

    it('deve lancar BadRequestException se upload nao encontrado', async () => {
      mockUploadsService.findOne.mockResolvedValue(null);

      await expect(controller.findById(999)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de uploads', async () => {
      const paginatedResult = {
        data: [mockUpload],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockUploadsService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findByUser', () => {
    it('deve retornar uploads do usuario', async () => {
      mockUploadsService.findByUser.mockResolvedValue([mockUpload]);

      const result = await controller.findByUser(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByStartup', () => {
    it('deve retornar uploads da startup', async () => {
      mockUploadsService.findByStartup.mockResolvedValue([mockUpload]);

      const result = await controller.findByStartup(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
