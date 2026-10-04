// Suite: criação e edição da primeira campanha
// Invariant: apenas o founder dono cria e edita a primeira campanha DRAFT dentro dos limites dinâmicos, com snapshots do ADR-008 persistidos.
// Boundary IN: HTTP NestJS, AuthGuard com sessão Redis, SystemConfigService e banco MySQL via Prisma.
// Boundary OUT: SMTP e object storage, cobertos por suas próprias suítes.

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfig } from '@prisma/client';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { ValidateFundador } from '../../../src/api/startup/service/validate.fundador';
import { SessionService } from '../../../src/auth/session/session.service';
import { SystemConfigService } from '../../../src/common/system-config/system-config.service';
import { OBJECT_STORAGE_PROVIDER } from '../../../src/common/storage/storage-provider.module';
import { EmailService } from '../../../src/email/email.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { cleanupTestUser } from './setup/db-cleanup';
import {
  buildAuthCookie,
  generateUniqueEmail,
  generateValidCnpj,
  generateValidCpf,
  generateValidPassword,
} from './setup/test-helpers';

const FINANCIAL_CONFIGS = {
  TOKEN_BASE_VALUE: 200,
  TOKEN_TRANSACTION_FEE: 40,
  TOKEN_MINT_FEE: 1,
  PLATFORM_ADMIN_FEE_PCT: 0.2,
  COMPLIANCE_FEE: 500,
  CAMPAIGN_MIN_TARGET: 500_000,
  CAMPAIGN_MAX_TARGET: 10_000_000,
  CAMPAIGN_MIN_TOKENS: 100,
  CAMPAIGN_MAX_TOKENS: 1_000_000,
} as const;

const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

const stubObjectStorage = {
  upload: jest
    .fn()
    .mockResolvedValue({ url: 'https://stub/campaign', key: 'campaign' }),
  getUrl: jest.fn().mockResolvedValue('https://stub/campaign'),
  delete: jest.fn().mockResolvedValue(undefined),
  healthCheck: jest.fn().mockResolvedValue(true),
};

type FounderFixture = {
  id: number;
  publicId: string;
  email: string;
  cookie: string;
};

type StartupFixture = {
  id: number;
};

describe('E2E Flow — criação da primeira campanha (S01.3a)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let systemConfigService: SystemConfigService;
  let previousConfigs: SystemConfig[] = [];
  let createdFounders: FounderFixture[] = [];
  let createdStartupIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('Logger')
      .useValue(mockLogger)
      .overrideProvider(Logger)
      .useValue(mockLogger)
      .overrideProvider(EmailService)
      .useValue({})
      .overrideProvider(OBJECT_STORAGE_PROVIDER)
      .useValue(stubObjectStorage)
      .overrideProvider(ValidateFundador)
      .useValue({ validateOrThrow: jest.fn().mockResolvedValue(true) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    sessionService = app.get(SessionService);
    systemConfigService = app.get(SystemConfigService);

    const keys = Object.keys(FINANCIAL_CONFIGS);
    previousConfigs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });

    for (const [key, value] of Object.entries(FINANCIAL_CONFIGS)) {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: {
          key,
          value,
          description: `Configuração determinística do E2E S01.3a: ${key}`,
        },
      });
    }
    await systemConfigService.invalidateCache();
  });

  beforeEach(async () => {
    await cleanupScenario();
  });

  afterEach(async () => {
    await cleanupScenario();
  });

  afterAll(async () => {
    try {
      await cleanupScenario();
      const previousKeys = new Set(previousConfigs.map((config) => config.key));
      const createdOnlyKeys = Object.keys(FINANCIAL_CONFIGS).filter(
        (key) => !previousKeys.has(key),
      );

      if (createdOnlyKeys.length > 0) {
        await prisma.systemConfig.deleteMany({
          where: { key: { in: createdOnlyKeys } },
        });
      }

      for (const config of previousConfigs) {
        await prisma.systemConfig.upsert({
          where: { key: config.key },
          update: {
            value: config.value,
            description: config.description,
            updatedBy: config.updatedBy,
          },
          create: {
            key: config.key,
            value: config.value,
            description: config.description,
            updatedBy: config.updatedBy,
          },
        });
      }
      await systemConfigService.invalidateCache();
    } finally {
      if (app) await app.close();
    }
  });

  function buildValidCampaignPayload(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      title: 'Rodada Seed S01.3a',
      targetAmount: 500_000,
      minInvestment: 1_000,
      valuation: 5_000_000,
      tokenPrice: 20,
      totalTokens: 25_000,
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1_000).toISOString(),
      ...overrides,
    };
  }

  async function createFounder(prefix: string): Promise<FounderFixture> {
    const email = generateUniqueEmail(prefix).toLowerCase();
    const user = await prisma.user.create({
      data: {
        email,
        nome: `Founder ${prefix}`,
        senha: generateValidPassword(),
        role: 'FOUNDER',
        tipo_documento: 'CPF',
        reg_documento: generateValidCpf(),
        termosAceitos: true,
        politicaAceita: true,
        isActive: true,
      },
    });

    const sessionData = {
      id: user.id,
      publicId: user.publicId,
      email: user.email,
      nome: user.nome,
      role: user.role,
      isActive: true,
      af2Verified: true,
      lastAccessAt: new Date().toISOString(),
      subscriptions: [
        {
          status: 'ACTIVE',
          expiresAt: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1_000,
          ).toISOString(),
        },
      ],
    };
    await sessionService.createSession(user.publicId, sessionData);

    const fixture = {
      id: user.id,
      publicId: user.publicId,
      email: user.email,
      cookie: buildAuthCookie(user.publicId),
    };
    createdFounders.push(fixture);
    return fixture;
  }

  async function createApprovedStartup(
    founderId: number,
    label: string,
  ): Promise<StartupFixture> {
    const startup = await prisma.startup.create({
      data: {
        founderId,
        nome: `Startup ${label}`,
        slug: `campaign-s013a-${label}-${Date.now()}`.toLowerCase(),
        razao_social: `Startup ${label} LTDA`,
        cnpj: generateValidCnpj(),
        email: `startup-${label.toLowerCase()}@example.com`,
        pais: { iso3: 'BRA', name: 'Brasil' },
        status: 'APPROVED',
      },
    });
    createdStartupIds.push(startup.id);
    return { id: startup.id };
  }

  function createCampaign(
    startupId: number,
    cookie: string,
    overrides: Record<string, unknown> = {},
  ): request.Test {
    return request(app.getHttpServer())
      .post(`/campaigns/${startupId}`)
      .set('Cookie', cookie)
      .send(buildValidCampaignPayload(overrides));
  }

  async function cleanupScenario(): Promise<void> {
    if (!prisma) return;

    if (createdStartupIds.length > 0) {
      await prisma.campaign.deleteMany({
        where: { startupId: { in: createdStartupIds } },
      });
      await prisma.startup.deleteMany({
        where: { id: { in: createdStartupIds } },
      });
    }

    for (const founder of createdFounders) {
      await sessionService.deleteSession(founder.publicId);
      await cleanupTestUser(prisma, founder.email);
    }

    createdStartupIds = [];
    createdFounders = [];
  }

  it('cria a primeira campanha em DRAFT com snapshots financeiros do ADR-008', async () => {
    const founder = await createFounder('campaign-success');
    const startup = await createApprovedStartup(founder.id, 'success');

    const response = await createCampaign(startup.id, founder.cookie).expect(
      201,
    );

    expect(response.body.data.status).toBe('DRAFT');
    expect(Number(response.body.data.tokenBaseValue)).toBe(20);
    expect(Number(response.body.data.tokenSellPrice)).toBe(20);
    expect(Number(response.body.data.adminFeeValue)).toBe(100_000);
    expect(Number(response.body.data.tokenMintingCost)).toBe(25_000);

    const persisted = await prisma.campaign.findUnique({
      where: { id: response.body.data.id },
    });
    expect(persisted?.status).toBe('DRAFT');
    expect(Number(persisted?.tokenSellPrice)).toBe(20);
  });

  it('rejeita targetAmount abaixo do mínimo dinâmico', async () => {
    const founder = await createFounder('campaign-min-target');
    const startup = await createApprovedStartup(founder.id, 'min-target');

    const response = await createCampaign(startup.id, founder.cookie, {
      targetAmount: 100_000,
    }).expect(400);

    expect(response.body.code).toBe('TARGET_BELOW_MINIMUM');
    expect(response.body.currentMin).toBe(500_000);
    expect(response.body.receivedValue).toBe(100_000);
    expect(
      await prisma.campaign.count({ where: { startupId: startup.id } }),
    ).toBe(0);
  });

  it('rejeita totalTokens acima do máximo dinâmico', async () => {
    const founder = await createFounder('campaign-max-tokens');
    const startup = await createApprovedStartup(founder.id, 'max-tokens');

    const response = await createCampaign(startup.id, founder.cookie, {
      totalTokens: 2_000_000,
    }).expect(400);

    expect(response.body.code).toBe('TOKENS_ABOVE_MAXIMUM');
    expect(response.body.currentMax).toBe(1_000_000);
    expect(response.body.receivedValue).toBe(2_000_000);
    expect(
      await prisma.campaign.count({ where: { startupId: startup.id } }),
    ).toBe(0);
  });

  it('rejeita founder autenticado que não é dono da startup', async () => {
    const owner = await createFounder('campaign-owner');
    const attacker = await createFounder('campaign-not-owner');
    const startup = await createApprovedStartup(owner.id, 'ownership');

    const response = await createCampaign(startup.id, attacker.cookie).expect(
      403,
    );

    expect(response.body.message).toContain('NOT_OWNER');
    expect(
      await prisma.campaign.count({ where: { startupId: startup.id } }),
    ).toBe(0);
  });

  it('rejeita a segunda campanha criada pelo endpoint de primeira campanha', async () => {
    const founder = await createFounder('campaign-duplicate');
    const startup = await createApprovedStartup(founder.id, 'duplicate');

    await createCampaign(startup.id, founder.cookie).expect(201);
    const response = await createCampaign(startup.id, founder.cookie, {
      title: 'Segunda campanha indevida',
    }).expect(400);

    expect(response.body.code).toBe('STARTUP_ALREADY_HAS_CAMPAIGN');
    expect(
      await prisma.campaign.count({ where: { startupId: startup.id } }),
    ).toBe(1);
  });

  it('edita uma campanha DRAFT e recalcula os snapshots financeiros', async () => {
    const founder = await createFounder('campaign-edit-draft');
    const startup = await createApprovedStartup(founder.id, 'edit-draft');
    const created = await createCampaign(startup.id, founder.cookie).expect(
      201,
    );

    const response = await request(app.getHttpServer())
      .patch(`/campaigns/${created.body.data.id}/draft`)
      .set('Cookie', founder.cookie)
      .send({
        title: 'Rodada Seed Atualizada',
        targetAmount: 600_000,
        totalTokens: 20_000,
      })
      .expect(200);

    expect(response.body.status).toBe('DRAFT');
    expect(response.body.title).toBe('Rodada Seed Atualizada');
    expect(Number(response.body.tokenBaseValue)).toBe(30);
    expect(Number(response.body.tokenSellPrice)).toBe(30);
    expect(Number(response.body.adminFeeValue)).toBe(120_000);
    expect(Number(response.body.tokenMintingCost)).toBe(20_000);

    const persisted = await prisma.campaign.findUnique({
      where: { id: created.body.data.id },
    });
    expect(Number(persisted?.tokenSellPrice)).toBe(30);
  });

  it('bloqueia a edição quando a campanha não está em DRAFT', async () => {
    const founder = await createFounder('campaign-edit-open');
    const startup = await createApprovedStartup(founder.id, 'edit-open');
    const created = await createCampaign(startup.id, founder.cookie).expect(
      201,
    );

    await prisma.campaign.update({
      where: { id: created.body.data.id },
      data: { status: 'OPEN' },
    });

    const response = await request(app.getHttpServer())
      .patch(`/campaigns/${created.body.data.id}/draft`)
      .set('Cookie', founder.cookie)
      .send({ title: 'Alteração bloqueada' })
      .expect(403);

    expect(response.body.code).toBe('CAMPAIGN_NOT_EDITABLE');
    const persisted = await prisma.campaign.findUnique({
      where: { id: created.body.data.id },
    });
    expect(persisted?.title).toBe('Rodada Seed S01.3a');
    expect(persisted?.status).toBe('OPEN');
  });
});
