import { HttpException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { StartupExtrasService } from './startup-extras.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';

/**
 * BUG-FT-006: limite de 1000 caracteres da justificativa do "Não se
 * aplica". Defense in depth — frontend já limita via `maxLength={1000}`
 * em documents-section.tsx, mas o backend precisa garantir que requests
 * diretos (curl, BFF, extensões) não consigam contornar o limite.
 */
describe('StartupExtrasService.setDocumentNA — limite da justificativa (BUG-FT-006)', () => {
  const mockPrisma: any = {
    startup: {
      findUnique: jest.fn().mockResolvedValue({ id: 1, founderId: 42 }),
    },
    startupDocumentNA: {
      upsert: jest.fn().mockResolvedValue({ id: 1 }),
    },
    startupDocument: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };

  const mockS3: any = {};

  let service: StartupExtrasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.startup.findUnique.mockResolvedValue({ id: 1, founderId: 42 });
    mockPrisma.startupDocumentNA.upsert.mockResolvedValue({ id: 1 });
    mockPrisma.startupDocument.deleteMany.mockResolvedValue({ count: 0 });

    const m = await Test.createTestingModule({
      providers: [
        StartupExtrasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();

    service = m.get(StartupExtrasService);
  });

  it('justificativa de 1000 chars é aceita (boundary OK)', async () => {
    const texto = 'a'.repeat(1000);
    await expect(
      service.setDocumentNA(1, 42, 'PITCH_DECK', texto),
    ).resolves.toBeDefined();
    expect(mockPrisma.startupDocumentNA.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ justificativa: texto }),
      }),
    );
  });

  it('justificativa de 1001 chars rejeita 400 (limite hard-cap)', async () => {
    const texto = 'a'.repeat(1001);
    await expect(
      service.setDocumentNA(1, 42, 'PITCH_DECK', texto),
    ).rejects.toMatchObject({
      message: expect.stringContaining('1000 caracteres'),
      status: HttpStatus.BAD_REQUEST,
    });
    expect(mockPrisma.startupDocumentNA.upsert).not.toHaveBeenCalled();
  });

  it('justificativa de 5000 chars rejeita 400 (cenário extremo)', async () => {
    const texto = 'a'.repeat(5000);
    try {
      await service.setDocumentNA(1, 42, 'PITCH_DECK', texto);
      fail('esperava rejeição');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('justificativa < 3 chars rejeita 400 (mínimo válido)', async () => {
    await expect(
      service.setDocumentNA(1, 42, 'PITCH_DECK', 'ab'),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('whitespace antes/depois é trimado antes da validação', async () => {
    const texto = '   ' + 'a'.repeat(1000) + '   ';
    await expect(
      service.setDocumentNA(1, 42, 'PITCH_DECK', texto),
    ).resolves.toBeDefined();
    expect(mockPrisma.startupDocumentNA.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ justificativa: 'a'.repeat(1000) }),
      }),
    );
  });

  it('categoria ESSENCIAL (MIE) rejeita antes do limite de chars', async () => {
    // Garante que validação de categoria é avaliada antes do max length
    await expect(
      service.setDocumentNA(1, 42, 'MIE', 'a'.repeat(2000)),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
    expect(mockPrisma.startupDocumentNA.upsert).not.toHaveBeenCalled();
  });
});
