import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../../common/audit/audit.service';
import { SessionService } from '../../auth/session/session.service';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SealsService } from '../seals/seals.service';
import { S3Service } from '../../s3/s3.service';
import { AdminService } from './admin.service';

describe('AdminService.reviewStartupDocument', () => {
  let service: AdminService;
  const prisma = {
    startupDocument: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    startupDocumentRejection: {
      create: jest.fn(),
    },
  };
  const audit = { log: jest.fn() };
  const eventEmitter = { emit: jest.fn() };
  const s3 = { delete: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: SealsService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: AuditService, useValue: audit },
        {
          provide: SessionService,
          useValue: { refreshUserProfile: jest.fn().mockResolvedValue(0) },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: S3Service, useValue: s3 },
      ],
    }).compile();
    service = moduleRef.get(AdminService);
  });

  it('aprova documento (APPROVED) e audita', async () => {
    prisma.startupDocument.findUnique.mockResolvedValue({
      id: 5,
      startupId: 1,
      categoria: 'CONTRATO_SOCIAL',
      nome: 'contrato-social.pdf',
      s3Key: 'startup-1/abc.pdf',
      mimetype: 'application/pdf',
      sizeBytes: 1024,
      uploadedById: 7,
      createdAt: new Date(),
    });
    prisma.startupDocument.update.mockResolvedValue({
      id: 5,
      reviewStatus: 'APPROVED',
      reviewNote: null,
      reviewedAt: new Date(),
    });

    const r: any = await service.reviewStartupDocument(
      1,
      5,
      'APPROVED',
      undefined,
      7,
    );

    expect(r.error).toBe(false);
    expect(prisma.startupDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          reviewStatus: 'APPROVED',
          reviewNote: null,
          reviewedById: 7,
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STARTUP_DOCUMENT_APPROVED' }),
    );
    // APPROVED não deve notificar o founder (nenhum evento de rejeição).
    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      'startup.document.rejected',
      expect.anything(),
    );
  });

  it('rejeita com justificativa >=20 chars (REJECTED) — hard delete + rejection row', async () => {
    prisma.startupDocument.findUnique.mockResolvedValue({
      id: 5,
      startupId: 1,
      categoria: 'CONTRATO_SOCIAL',
      nome: 'contrato-social.pdf',
      s3Key: 'startup-1/abc.pdf',
      mimetype: 'application/pdf',
      sizeBytes: 1024,
      uploadedById: 7,
      createdAt: new Date(),
    });
    prisma.startupDocumentRejection.create.mockResolvedValue({ id: 99 });
    prisma.startupDocument.delete.mockResolvedValue({ id: 5 });

    const r: any = await service.reviewStartupDocument(
      1,
      5,
      'REJECTED',
      'Documento ilegível em várias páginas — refazer upload.',
      7,
    );
    expect(r.error).toBe(false);
    // REJECTED NÃO deve chamar update; chama delete + create rejection row.
    expect(prisma.startupDocument.update).not.toHaveBeenCalled();
    expect(prisma.startupDocument.delete).toHaveBeenCalledWith({
      where: { id: 5 },
    });
    expect(prisma.startupDocumentRejection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startupId: 1,
        categoria: 'CONTRATO_SOCIAL',
        documentName: 'contrato-social.pdf',
        reason: 'Documento ilegível em várias páginas — refazer upload.',
        rejectedById: 7,
      }),
    });
    expect(s3.delete).toHaveBeenCalledWith('document', 'startup-1/abc.pdf');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STARTUP_DOCUMENT_REJECTED_AND_DELETED',
        oldValue: expect.objectContaining({ s3Key: 'startup-1/abc.pdf' }),
      }),
    );
    // REJECTED emite evento com payload enriquecido (categoria inclusa).
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'startup.document.rejected',
      expect.objectContaining({
        startupId: 1,
        categoria: 'CONTRATO_SOCIAL',
        documentName: 'contrato-social.pdf',
        reason: 'Documento ilegível em várias páginas — refazer upload.',
        rejectedById: 7,
      }),
    );
  });

  it('rejeita sem justificativa → 400', async () => {
    const r: any = await service.reviewStartupDocument(1, 5, 'REJECTED', '', 7);
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(400);
    expect(prisma.startupDocument.delete).not.toHaveBeenCalled();
  });

  it('rejeita com justificativa <20 chars → 400 NOTE_TOO_SHORT', async () => {
    const r: any = await service.reviewStartupDocument(
      1,
      5,
      'REJECTED',
      'curto',
      7,
    );
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(400);
    expect(r.detalhe?.code).toBe('NOTE_TOO_SHORT');
    expect(prisma.startupDocument.delete).not.toHaveBeenCalled();
  });

  it('documento de outra startup → 404', async () => {
    prisma.startupDocument.findUnique.mockResolvedValue({
      id: 5,
      startupId: 999,
      reviewStatus: 'PENDING_REVIEW',
    });
    const r: any = await service.reviewStartupDocument(
      1,
      5,
      'APPROVED',
      undefined,
      7,
    );
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(404);
  });

  it('decisão inválida → 400', async () => {
    const r: any = await service.reviewStartupDocument(
      1,
      5,
      'MAYBE' as any,
      undefined,
      7,
    );
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(400);
  });
});
