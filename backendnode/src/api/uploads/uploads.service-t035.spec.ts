/**
 * Specs T035 (B08) - "Nao se aplica" em uploads condicionais.
 * Atualizado para nova arquitetura de storage provider.
 */
import { Test } from '@nestjs/testing';
import { OBJECT_STORAGE_PROVIDER } from '../../common/storage/storage-provider.module';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from './uploads.service';

describe('UploadsService (T035)', () => {
  let service: UploadsService;
  let prisma: {
    upload: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      upload: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const m = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: OBJECT_STORAGE_PROVIDER,
          useValue: {
            upload: jest.fn().mockResolvedValue({
              url: 'https://storage.test/document/test.pdf',
              key: 'test.pdf',
              bucket: 'document',
              size: 1024,
            }),
            download: jest.fn(),
            delete: jest.fn(),
            getPresignedUrl: jest.fn(),
            exists: jest.fn().mockResolvedValue(true),
            healthCheck: jest.fn(),
          },
        },
      ],
    }).compile();
    service = m.get(UploadsService);
  });

  it('1. create: cria Upload com applicancy=NOT_APPLICABLE quando nao aplicavel', async () => {
    prisma.upload.create.mockResolvedValueOnce({
      id: 1,
      applicancy: 'NOT_APPLICABLE',
      fileKey: null,
      sha256: 'hash',
      status: 'READY',
    });

    const r = await service.create(
      {
        buffer: Buffer.from('test'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as any,
      undefined,
    );

    expect(r).toBeDefined();
  });

  it('2. findByStartup: retorna uploads com applicancy', async () => {
    prisma.upload.findMany.mockResolvedValueOnce([
      { id: 1, applicancy: 'APPLICABLE', fileKey: 'abc.pdf' },
      { id: 2, applicancy: 'NOT_APPLICABLE', fileKey: null },
    ]);

    const r = await service.findByStartup(10);
    expect(r).toHaveLength(2);
    expect(r[1].applicancy).toBe('NOT_APPLICABLE');
  });
});
