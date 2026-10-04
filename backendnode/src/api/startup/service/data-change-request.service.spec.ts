import { Test, TestingModule } from '@nestjs/testing';
import { DataChangeRequestService } from './data-change-request.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/common/audit/audit.service';
import { EmailService } from 'src/email/email.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataChangeField, DataChangeStatus } from '@prisma/client';

describe('DataChangeRequestService', () => {
  let service: DataChangeRequestService;
  let prisma: any;
  let auditService: any;
  let emailService: any;

  const mockStartup = {
    id: 1,
    founderId: 10,
    nome: 'TechNova',
    slug: 'technova',
    cnpj: '11222333000181',
    razao_social: 'TechNova LTDA',
    pais: { iso3: 'BRA', name: 'Brasil' },
  };

  const mockFounder = {
    id: 10,
    nome: 'João Silva',
    email: 'joao@example.com',
  };

  const mockPendingRequest = {
    id: 1,
    startupId: 1,
    requestedByUserId: 10,
    field: DataChangeField.CNPJ,
    currentValue: '11222333000181',
    requestedValue: '12345678000199',
    status: DataChangeStatus.PENDING,
    reviewedByUserId: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      startup: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      dataChangeRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    emailService = {
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataChangeRequestService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(DataChangeRequestService);
  });

  describe('createRequest()', () => {
    it('deve criar solicitação CNPJ com status PENDING', async () => {
      prisma.startup.findUnique.mockResolvedValue(mockStartup);
      prisma.dataChangeRequest.create.mockResolvedValue(mockPendingRequest);

      const result = await service.createRequest(
        1,
        10,
        DataChangeField.CNPJ,
        '12345678000199',
      );

      expect(result.status).toBe(DataChangeStatus.PENDING);
      expect(result.field).toBe(DataChangeField.CNPJ);
      expect(prisma.dataChangeRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startupId: 1,
            requestedByUserId: 10,
            field: DataChangeField.CNPJ,
            requestedValue: '12345678000199',
            status: DataChangeStatus.PENDING,
          }),
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DATA_CHANGE_REQUESTED' }),
      );
    });

    it('deve lançar erro 400 para campo não bloqueado', async () => {
      await expect(
        service.createRequest(1, 10, 'NOME_FANTASIA' as any, 'Novo Nome'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro 400 quando requestedValue é igual ao atual', async () => {
      prisma.startup.findUnique.mockResolvedValue(mockStartup);

      await expect(
        service.createRequest(1, 10, DataChangeField.CNPJ, '11222333000181'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar erro 404 quando startup não existe', async () => {
      prisma.startup.findUnique.mockResolvedValue(null);

      await expect(
        service.createRequest(999, 10, DataChangeField.CNPJ, '12345678000199'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro 403 quando startup não pertence ao founder', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        ...mockStartup,
        founderId: 99,
      });

      await expect(
        service.createRequest(1, 10, DataChangeField.CNPJ, '12345678000199'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve criar solicitação para RAZAO_SOCIAL', async () => {
      prisma.startup.findUnique.mockResolvedValue(mockStartup);
      prisma.dataChangeRequest.create.mockResolvedValue({
        ...mockPendingRequest,
        field: DataChangeField.RAZAO_SOCIAL,
        currentValue: 'TechNova LTDA',
        requestedValue: 'TechNova Tecnologia S.A.',
      });

      const result = await service.createRequest(
        1,
        10,
        DataChangeField.RAZAO_SOCIAL,
        'TechNova Tecnologia S.A.',
      );

      expect(result.field).toBe(DataChangeField.RAZAO_SOCIAL);
    });

    it('deve criar solicitação para PAIS', async () => {
      prisma.startup.findUnique.mockResolvedValue(mockStartup);
      prisma.dataChangeRequest.create.mockResolvedValue({
        ...mockPendingRequest,
        field: DataChangeField.PAIS,
        currentValue: '{"iso3":"BRA","name":"Brasil"}',
        requestedValue: '{"iso3":"USA","name":"Estados Unidos"}',
      });

      const result = await service.createRequest(
        1,
        10,
        DataChangeField.PAIS,
        '{"iso3":"USA","name":"Estados Unidos"}',
      );

      expect(result.field).toBe(DataChangeField.PAIS);
    });
  });

  describe('listByStartup()', () => {
    it('deve listar solicitações do fundador', async () => {
      const requests = [mockPendingRequest];
      prisma.dataChangeRequest.findMany.mockResolvedValue(requests);

      const result = await service.listByStartup(1, 10);

      expect(result).toEqual(requests);
      expect(prisma.dataChangeRequest.findMany).toHaveBeenCalledWith({
        where: { startupId: 1, requestedByUserId: 10 },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('listPending()', () => {
    it('deve listar todas as solicitações PENDING para compliance', async () => {
      const requests = [
        {
          ...mockPendingRequest,
          startup: {
            id: 1,
            nome: 'TechNova',
            cnpj: '11.222.333/0001-81',
            slug: 'technova',
          },
          requestedBy: mockFounder,
        },
      ];
      prisma.dataChangeRequest.findMany.mockResolvedValue(requests);

      const result = await service.listPending();

      expect(result).toEqual(requests);
      expect(prisma.dataChangeRequest.findMany).toHaveBeenCalledWith({
        where: { status: DataChangeStatus.PENDING },
        include: {
          startup: { select: { id: true, nome: true, cnpj: true, slug: true } },
          requestedBy: { select: { id: true, nome: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('review()', () => {
    const fullRequest = {
      ...mockPendingRequest,
      startup: mockStartup,
      requestedBy: mockFounder,
    };

    it('deve aprovar solicitação e atualizar campo na Startup', async () => {
      prisma.dataChangeRequest.findUnique.mockResolvedValue(fullRequest);
      prisma.startup.update.mockResolvedValue({
        ...mockStartup,
        cnpj: '12345678000199',
      });
      prisma.dataChangeRequest.update.mockResolvedValue({
        ...mockPendingRequest,
        status: DataChangeStatus.APPROVED,
        reviewedByUserId: 20,
        reviewNote: 'CNPJ verificado e aprovado',
        reviewedAt: new Date(),
      });

      const result = await service.review(
        1,
        20,
        'APPROVED',
        'CNPJ verificado e aprovado',
      );

      expect(result.status).toBe(DataChangeStatus.APPROVED);
      expect(prisma.startup.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { cnpj: '12345678000199' },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DATA_CHANGE_APPROVED' }),
      );
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'joao@example.com' }),
      );
    });

    it('deve rejeitar solicitação sem atualizar Startup', async () => {
      prisma.dataChangeRequest.findUnique.mockResolvedValue(fullRequest);
      prisma.dataChangeRequest.update.mockResolvedValue({
        ...mockPendingRequest,
        status: DataChangeStatus.REJECTED,
        reviewedByUserId: 20,
        reviewNote: 'CNPJ não confere com documentação',
        reviewedAt: new Date(),
      });

      const result = await service.review(
        1,
        20,
        'REJECTED',
        'CNPJ não confere com documentação',
      );

      expect(result.status).toBe(DataChangeStatus.REJECTED);
      expect(prisma.startup.update).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DATA_CHANGE_REJECTED' }),
      );
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('deve lançar erro 400 quando reviewNote tem menos de 10 caracteres', async () => {
      await expect(service.review(1, 20, 'APPROVED', 'curta')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar erro 404 quando solicitação não existe', async () => {
      prisma.dataChangeRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.review(
          999,
          20,
          'APPROVED',
          'Nota válida com mais de 10 caracteres',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro 400 quando solicitação já foi processada', async () => {
      prisma.dataChangeRequest.findUnique.mockResolvedValue({
        ...fullRequest,
        status: DataChangeStatus.APPROVED,
      });

      await expect(
        service.review(
          1,
          20,
          'APPROVED',
          'Nota válida com mais de 10 caracteres',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve enviar email ao fundador em ambas as decisões', async () => {
      prisma.dataChangeRequest.findUnique.mockResolvedValue(fullRequest);
      prisma.startup.update.mockResolvedValue(mockStartup);
      prisma.dataChangeRequest.update.mockResolvedValue({
        ...mockPendingRequest,
        status: DataChangeStatus.APPROVED,
        reviewedByUserId: 20,
        reviewedAt: new Date(),
      });

      await service.review(
        1,
        20,
        'APPROVED',
        'Aprovado com verificação documental',
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@example.com',
          subject: expect.stringContaining('APROVADA'),
        }),
      );
    });

    it('deve registrar AuditLog em cada transição de status', async () => {
      prisma.dataChangeRequest.findUnique.mockResolvedValue(fullRequest);
      prisma.startup.update.mockResolvedValue(mockStartup);
      prisma.dataChangeRequest.update.mockResolvedValue({
        ...mockPendingRequest,
        status: DataChangeStatus.APPROVED,
        reviewedByUserId: 20,
        reviewedAt: new Date(),
      });

      await service.review(
        1,
        20,
        'APPROVED',
        'Aprovado pela equipe de compliance',
      );

      expect(auditService.log).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 20,
          action: 'DATA_CHANGE_APPROVED',
          entity: 'DataChangeRequest',
          entityId: 1,
        }),
      );
    });

    it('deve atualizar campo RAZAO_SOCIAL na Startup quando aprovado', async () => {
      const razaoRequest = {
        ...fullRequest,
        field: DataChangeField.RAZAO_SOCIAL,
        currentValue: 'TechNova LTDA',
        requestedValue: 'TechNova Tecnologia S.A.',
      };
      prisma.dataChangeRequest.findUnique.mockResolvedValue(razaoRequest);
      prisma.startup.update.mockResolvedValue(mockStartup);
      prisma.dataChangeRequest.update.mockResolvedValue({
        ...razaoRequest,
        status: DataChangeStatus.APPROVED,
        reviewedByUserId: 20,
        reviewedAt: new Date(),
      });

      await service.review(
        1,
        20,
        'APPROVED',
        'Razão social atualizada com documento',
      );

      expect(prisma.startup.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { razao_social: 'TechNova Tecnologia S.A.' },
      });
    });

    it('deve atualizar campo PAIS na Startup quando aprovado (JSON)', async () => {
      const paisRequest = {
        ...fullRequest,
        field: DataChangeField.PAIS,
        currentValue: '{"iso3":"BRA","name":"Brasil"}',
        requestedValue: '{"iso3":"USA","name":"Estados Unidos"}',
      };
      prisma.dataChangeRequest.findUnique.mockResolvedValue(paisRequest);
      prisma.startup.update.mockResolvedValue(mockStartup);
      prisma.dataChangeRequest.update.mockResolvedValue({
        ...paisRequest,
        status: DataChangeStatus.APPROVED,
        reviewedByUserId: 20,
        reviewedAt: new Date(),
      });

      await service.review(
        1,
        20,
        'APPROVED',
        'País alterado conforme documentação',
      );

      expect(prisma.startup.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { pais: { iso3: 'USA', name: 'Estados Unidos' } },
      });
    });

    it('deve aceitar requestedValue de PAIS em texto puro (fallback quando nao e JSON valido)', async () => {
      const paisTextoPuro = {
        ...fullRequest,
        field: DataChangeField.PAIS,
        currentValue: 'Brasil',
        requestedValue: 'Estados Unidos', // nao e JSON
      };
      prisma.dataChangeRequest.findUnique.mockResolvedValue(paisTextoPuro);
      prisma.startup.update.mockResolvedValue(mockStartup);
      prisma.dataChangeRequest.update.mockResolvedValue({
        ...paisTextoPuro,
        status: DataChangeStatus.APPROVED,
        reviewedByUserId: 20,
        reviewedAt: new Date(),
      });

      await service.review(
        1,
        20,
        'APPROVED',
        'Pais alterado em texto puro, sem JSON',
      );

      expect(prisma.startup.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { pais: 'Estados Unidos' },
      });
    });
  });

  // ============================================================
  // TESTES DE INTEGRACAO (T064) — validam comportamentos que dependem
  // de multiplos componentes trabalhando juntos.
  // ============================================================

  describe('Integracao: tolerancia a falha de email', () => {
    const fullRequest = {
      ...mockPendingRequest,
      startup: mockStartup,
      requestedBy: mockFounder,
    };

    it('deve retornar sucesso mesmo quando emailService.sendEmail lanca erro', async () => {
      emailService.sendEmail.mockRejectedValueOnce(new Error('SMTP down'));
      prisma.dataChangeRequest.findUnique.mockResolvedValue(fullRequest);
      prisma.startup.update.mockResolvedValue({ ...mockStartup, cnpj: 'novo' });
      prisma.dataChangeRequest.update.mockResolvedValue({
        ...mockPendingRequest,
        status: DataChangeStatus.APPROVED,
        reviewedByUserId: 20,
        reviewedAt: new Date(),
      });

      await expect(
        service.review(1, 20, 'APPROVED', 'Aprovado mesmo com falha de email'),
      ).resolves.toBeDefined();
    });
  });

  describe('Integracao: isolamento por usuario', () => {
    it('listByStartup deve filtrar por requestedByUserId', async () => {
      prisma.dataChangeRequest.findMany.mockResolvedValue([mockPendingRequest]);

      await service.listByStartup(1, 99); // userId 99 != 10

      expect(prisma.dataChangeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startupId: 1,
            requestedByUserId: 99,
          }),
        }),
      );
    });
  });
});
