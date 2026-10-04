import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { EmailRenderService } from './email-render.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionService } from 'src/auth/session/session.service';

const mockPrisma = {
  emailTemplate: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  emailTemplateVersion: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockSession = {
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }),
};

const mockRender = {
  render: jest.fn().mockReturnValue({
    subject: 'Test Subject',
    html: '<p>Test HTML</p>',
    text: 'Test Text',
    usedVariables: [],
  }),
};

describe('EmailTemplatesService', () => {
  let service: EmailTemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplatesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SessionService, useValue: mockSession },
        { provide: EmailRenderService, useValue: mockRender },
      ],
    }).compile();

    service = module.get<EmailTemplatesService>(EmailTemplatesService);
    jest.clearAllMocks();
  });

  describe('getActiveBySlug', () => {
    it('should throw NotFoundException when template not found', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);
      await expect(service.getActiveBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return rendered email when template has PUBLISHED version', async () => {
      const mockTemplate = {
        id: '1',
        slug: 'welcome',
        name: 'Welcome',
        status: 'ACTIVE',
        currentVersion: {
          id: 'v1',
          version: 1,
          status: 'PUBLISHED',
          subject: 'Welcome',
          htmlTemplate: '<p>Hello</p>',
          textTemplate: 'Hello',
          variablesSchema: {},
        },
      };
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockRender.render.mockReturnValue({
        subject: 'Welcome',
        html: '<p>Hello</p>',
        text: 'Hello',
        usedVariables: [],
      });

      const result = await service.getActiveBySlug('welcome');

      expect(result.subject).toBe('Welcome');
      expect(result.html).toBe('<p>Hello</p>');
      expect(mockRender.render).toHaveBeenCalled();
    });
  });

  describe('listAll', () => {
    it('should return all active templates', async () => {
      const mockTemplates = [
        { id: '1', slug: 'welcome', name: 'Welcome', status: 'ACTIVE' },
        {
          id: '2',
          slug: 'verification-code',
          name: 'Verification',
          status: 'ACTIVE',
        },
      ];
      mockPrisma.emailTemplate.findMany.mockResolvedValue(mockTemplates);

      const result = await service.listAll();

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('welcome');
    });
  });

  describe('createDraft', () => {
    it('should create a new template with draft version', async () => {
      const dto = {
        slug: 'new-template',
        name: 'New Template',
        subject: 'Subject',
        htmlTemplate: '<p>HTML</p>',
        textTemplate: 'Text',
        variablesSchema: {},
      };
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);
      mockPrisma.emailTemplate.create.mockResolvedValue({
        id: '1',
        ...dto,
        status: 'DRAFT',
      });
      mockPrisma.emailTemplateVersion.create.mockResolvedValue({
        id: 'v1',
        version: 1,
        status: 'DRAFT',
      });

      const result = await service.createDraft(dto.slug, dto as any, 1);

      expect(mockPrisma.emailTemplate.create).toHaveBeenCalled();
      expect(mockPrisma.emailTemplateVersion.create).toHaveBeenCalled();
    });

    it('should create draft version for existing template', async () => {
      const dto = {
        slug: 'existing',
        subject: 'Subject',
        htmlTemplate: '<p>HTML</p>',
        textTemplate: 'Text',
      };
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.emailTemplateVersion.findFirst.mockResolvedValue(null);
      mockPrisma.emailTemplateVersion.create.mockResolvedValue({
        id: 'v2',
        version: 1,
        status: 'DRAFT',
      });

      const result = await service.createDraft('existing', dto as any, 1);

      expect(mockPrisma.emailTemplateVersion.create).toHaveBeenCalled();
    });
  });

  describe('previewVersion', () => {
    it('should return rendered preview without caching', async () => {
      const mockVersion = {
        id: 'v1',
        version: 1,
        status: 'PUBLISHED',
        subject: 'Preview Subject',
        htmlTemplate: '<p>Preview {{name}}</p>',
        textTemplate: 'Preview {{name}}',
        variablesSchema: { type: 'object', required: ['name'] },
        template: { slug: 'welcome' },
      };
      mockPrisma.emailTemplateVersion.findUnique.mockResolvedValue(mockVersion);
      mockRender.render.mockReturnValue({
        subject: 'Preview Subject',
        html: '<p>Preview John</p>',
        text: 'Preview John',
        usedVariables: ['name'],
      });

      const result = await service.previewVersion('welcome', 'v1', {
        name: 'John',
      });

      expect(result.subject).toBe('Preview Subject');
      expect(result.html).toBe('<p>Preview John</p>');
    });
  });

  describe('createTemplate', () => {
    it('should throw BadRequestException if slug already exists', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue({
        id: 'existing-id',
        slug: 'duplicated-slug',
      });

      await expect(
        service.createTemplate(
          {
            name: 'Template Duplicado',
            slug: 'duplicated-slug',
            subject: 'Assunto',
          },
          1,
        ),
      ).rejects.toThrow("Já existe um template com o slug 'duplicated-slug'");
    });

    it('should create template and initial draft version', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);
      mockPrisma.emailTemplate.create.mockResolvedValue({
        id: 'new-tmpl-id',
        name: 'Novo Template',
        slug: 'novo-template',
        description: 'Desc',
        isActive: true,
        createdByUserId: 1,
      });
      mockPrisma.emailTemplateVersion.create.mockResolvedValue({
        id: 'new-ver-id',
        templateId: 'new-tmpl-id',
        version: 1,
        status: 'DRAFT',
        subject: 'Assunto Teste',
      });
      mockPrisma.emailTemplate.update.mockResolvedValue({
        id: 'new-tmpl-id',
        name: 'Novo Template',
        slug: 'novo-template',
        currentVersionId: 'new-ver-id',
        versions: [{ id: 'new-ver-id', version: 1, status: 'DRAFT' }],
      });

      const result = await service.createTemplate(
        {
          name: 'Novo Template',
          slug: 'novo-template',
          description: 'Desc',
          subject: 'Assunto Teste',
        },
        1,
      );

      expect(mockPrisma.emailTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Novo Template',
          slug: 'novo-template',
          createdByUserId: 1,
        }),
      });
      expect(mockPrisma.emailTemplateVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          templateId: 'new-tmpl-id',
          version: 1,
          status: 'DRAFT',
          subject: 'Assunto Teste',
        }),
      });
      expect(result.currentVersionId).toBe('new-ver-id');
    });
  });
});
