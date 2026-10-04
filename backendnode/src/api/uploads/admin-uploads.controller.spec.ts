import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminUploadsController } from './admin-uploads.controller';
import { UploadsService } from './uploads.service';
import { AuthGuard } from '../../auth/auth.guard';
import { ComplianceGuard } from '../../auth/compliance.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { SessionService } from '../../auth/session/session.service';
import { CookiesService } from '../../auth/cookies/cookies.service';

describe('AdminUploadsController', () => {
  let controller: AdminUploadsController;
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
    variants: null,
    status: 'READY',
    applicancy: 'APPLICABLE',
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockUploadsService = {
    remove: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSessionService = {
    getSession: jest.fn(),
    updateSession: jest.fn(),
  };

  const mockCookiesService = {
    getSessionId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 3600000, limit: 10 }])],
      controllers: [AdminUploadsController],
      providers: [
        { provide: UploadsService, useValue: mockUploadsService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: CookiesService, useValue: mockCookiesService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ComplianceGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminUploadsController>(AdminUploadsController);
    uploadsService = module.get<UploadsService>(UploadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('remove', () => {
    it('deve remover upload com sucesso para ADMIN', async () => {
      const mockUser = { id: 1, role: 'ADMIN' };
      const request = { user: mockUser } as any;

      mockUploadsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1, request);

      expect(result).toEqual({ success: true });
      expect(mockUploadsService.remove).toHaveBeenCalledWith(1, mockUser);
    });

    it('deve remover upload com sucesso para COMPLIANCE', async () => {
      const mockUser = { id: 2, role: 'COMPLIANCE' };
      const request = { user: mockUser } as any;

      mockUploadsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1, request);

      expect(result).toEqual({ success: true });
      expect(mockUploadsService.remove).toHaveBeenCalledWith(1, mockUser);
    });

    it('deve lancar 404 se upload nao encontrado', async () => {
      const mockUser = { id: 1, role: 'ADMIN' };
      const request = { user: mockUser } as any;

      mockUploadsService.remove.mockRejectedValue(
        new NotFoundException('Upload nao encontrado'),
      );

      await expect(controller.remove(999, request)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve propagar erro de BadRequestException', async () => {
      const mockUser = { id: 1, role: 'ADMIN' };
      const request = { user: mockUser } as any;

      mockUploadsService.remove.mockRejectedValue(
        new BadRequestException('Erro interno'),
      );

      await expect(controller.remove(1, request)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
