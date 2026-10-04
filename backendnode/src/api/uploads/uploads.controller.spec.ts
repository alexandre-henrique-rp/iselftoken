import {
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UploadStatus } from '@prisma/client';
import { Request } from 'express';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { SessionService } from '../../auth/session/session.service';
import { UserPlanHelper } from './helpers/user-plan.helper';
import { QuotaService, UserPlan } from './services/quota.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

describe('UploadsController', () => {
  let controller: UploadsController;
  let uploadsService: jest.Mocked<UploadsService>;

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
    status: 'READY' as UploadStatus,
    applicancy: 'APPLICABLE' as const,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockUploadsService = {
      create: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByUser: jest.fn(),
      findByStartup: jest.fn(),
      remove: jest.fn(),
      getStatusForUser: jest.fn(),
    };

    const mockQuotaService = {
      checkQuota: jest.fn().mockResolvedValue(undefined),
      getUsage: jest.fn(),
      getUserLimits: jest.fn(),
    } as unknown as jest.Mocked<QuotaService>;

    const mockUserPlanHelper = {
      getPlan: jest.fn().mockResolvedValue(UserPlan.FREE),
      invalidate: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<UserPlanHelper>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        {
          provide: UploadsService,
          useValue: mockUploadsService,
        },
        { provide: QuotaService, useValue: mockQuotaService },
        { provide: UserPlanHelper, useValue: mockUserPlanHelper },
        {
          provide: CookiesService,
          useValue: { getSessionId: jest.fn().mockReturnValue(undefined) },
        },
        {
          provide: SessionService,
          useValue: { getSession: jest.fn().mockResolvedValue(null) },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UploadsController>(UploadsController);
    uploadsService = module.get(UploadsService);
  });

  describe('POST /uploads', () => {
    it('deve retornar 200 com upload pronto', async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('fake-image-content'),
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

      const mockReq = { user: { id: 1, role: 'USER' } } as unknown as Request;

      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'test-public-id',
        status: 'READY',
      } as any);

      const result = await controller.uploadFile(mockReq, mockFile);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          id: 1,
          publicId: 'test-public-id',
        }),
      );
    });

    it('normaliza MIME de vídeo com codec e preserva o kind biofacial', async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('fake-video-content'),
        originalname: 'selfie.webm',
        mimetype: 'video/webm;codecs=vp9',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      const mockReq = { user: { id: 1, role: 'USER' } } as unknown as Request;

      uploadsService.create.mockResolvedValue({
        id: 83,
        publicId: 'biofacial-upload',
        status: UploadStatus.PENDING,
      } as any);

      await controller.uploadFile(mockReq, mockFile, 'biofacial');

      expect(mockFile.mimetype).toBe('video/webm');
      expect(uploadsService.create).toHaveBeenCalledWith(mockFile, undefined);
    });

    it('propaga URLs públicas estáveis do upload na resposta de sucesso', async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('fake-image-content'),
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
      const mockReq = { user: { id: 1, role: 'USER' } } as unknown as Request;

      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'test-public-id',
        status: UploadStatus.PENDING,
        url: 'https://storage.test/image/abc123.jpg',
      } as any);

      const result = await controller.uploadFile(mockReq, mockFile);

      expect(result.success).toBe(true);
      expect(result.data.url).toBe('https://storage.test/image/abc123.jpg');
    });

    it('responde 503 quando o storage não confirmou o objeto (status FAILED)', async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('fake-image-content'),
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
      const mockReq = { user: { id: 1, role: 'USER' } } as unknown as Request;

      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'test-public-id',
        status: UploadStatus.FAILED,
        rejectionReason: 'Arquivo indisponível no armazenamento.',
      } as any);

      await expect(
        controller.uploadFile(mockReq, mockFile),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('não expõe status na resposta de sucesso (status não é mais parte do contrato)', async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('fake-image-content'),
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
      const mockReq = { user: { id: 1, role: 'USER' } } as unknown as Request;

      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'test-public-id',
        status: UploadStatus.PENDING,
        url: 'https://storage.test/image/abc123.jpg',
      } as any);

      const result = await controller.uploadFile(mockReq, mockFile);

      // status não está no CreateUploadResponseDto (contrato enxuto)
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('status');
    });

    it('aceita pitch deck exatamente no limite de 15 MB', async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('fake-pdf-content'),
        originalname: 'pitch-deck.pdf',
        mimetype: 'application/pdf',
        size: 15 * 1024 * 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      const mockReq = { user: { id: 1, role: 'USER' } } as unknown as Request;

      uploadsService.create.mockResolvedValue({
        id: 2,
        publicId: 'pitch-deck-upload',
        status: UploadStatus.READY,
      } as any);

      await expect(
        controller.uploadFile(mockReq, mockFile, 'pitch-deck'),
      ).resolves.toEqual(expect.objectContaining({ success: true }));
      expect(uploadsService.create).toHaveBeenCalledWith(mockFile, undefined);
    });

    it('rejeita pitch deck acima de 15 MB', async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('fake-pdf-content'),
        originalname: 'pitch-deck.pdf',
        mimetype: 'application/pdf',
        size: 15 * 1024 * 1024 + 1,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      const mockReq = { user: { id: 1, role: 'USER' } } as unknown as Request;

      await expect(
        controller.uploadFile(mockReq, mockFile, 'pitch-deck'),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);
      expect(uploadsService.create).not.toHaveBeenCalled();
    });

    it('deve lan�ar BadRequestException se arquivo nao enviado', async () => {
      const mockReq = { user: { id: 1, role: 'USER' } } as unknown as Request;
      await expect(controller.uploadFile(mockReq, null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lan�ar BadRequestException para MIME nao permitido', async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('fake-content'),
        originalname: 'test.exe',
        mimetype: 'application/x-msdownload',
        size: 1024,
        fieldname: 'file',
        encoding: '7bit',
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const mockReq = { user: { id: 1, role: 'USER' } } as unknown as Request;

      await expect(controller.uploadFile(mockReq, mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /uploads', () => {
    it('deve listar uploads com pagina��o', async () => {
      uploadsService.findAll.mockResolvedValue({
        data: [mockUpload],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await controller.findAll({ page: 1, limit: 10 } as any);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /uploads/:id/status', () => {
    it('retorna FAILED autorizado sem traduzir o upload existente para 404', async () => {
      uploadsService.getStatusForUser.mockResolvedValue({
        id: 1,
        status: UploadStatus.FAILED,
        rejectionReason: 'Não foi possível ler o arquivo enviado.',
        url: null,
      } as any);

      await expect(
        controller.getStatus(1, { user: { id: 1 } } as unknown as Request),
      ).resolves.toEqual({
        success: true,
        data: {
          id: 1,
          status: UploadStatus.FAILED,
          rejectionReason: 'Não foi possível ler o arquivo enviado.',
          url: null,
        },
      });
    });
  });

  describe('GET /uploads/:id', () => {
    it('deve retornar upload por ID', async () => {
      uploadsService.findOne.mockResolvedValue(mockUpload);

      const result = await controller.findById(1);

      expect(result.success).toBe(true);
      expect(result.data.publicId).toBe('test-public-id');
    });

    it('deve lan�ar BadRequestException se upload nao encontrado', async () => {
      uploadsService.findOne.mockResolvedValue(null);

      await expect(controller.findById(999)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /uploads/user/:userId', () => {
    it('deve listar uploads por userId', async () => {
      uploadsService.findByUser.mockResolvedValue([mockUpload]);

      const result = await controller.findByUser(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /uploads/startup/:startupId', () => {
    it('deve listar uploads por startupId', async () => {
      uploadsService.findByStartup.mockResolvedValue([mockUpload]);

      const result = await controller.findByStartup(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('DELETE /uploads/:id', () => {
    it('deve remover upload (ADMIN)', async () => {
      uploadsService.remove.mockResolvedValue(undefined);

      const mockReq = {
        user: { id: 1, role: 'ADMIN' },
      } as unknown as Request;

      const result = await controller.remove(1, mockReq);

      expect(result.success).toBe(true);
    });

    it('deve remover upload (COMPLIANCE)', async () => {
      uploadsService.remove.mockResolvedValue(undefined);

      const mockReq = {
        user: { id: 2, role: 'COMPLIANCE' },
      } as unknown as Request;

      const result = await controller.remove(1, mockReq);

      expect(result.success).toBe(true);
    });

    it('deve lan�ar BadRequestException para roles nao autorizados', async () => {
      const mockReq = {
        user: { id: 3, role: 'USER' },
      } as unknown as Request;

      await expect(controller.remove(1, mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
