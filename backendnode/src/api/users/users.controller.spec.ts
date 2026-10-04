import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { SessionService } from '../../auth/session/session.service';
import { BackupService } from '../../backup/backup.service';
import { AuditService } from '../../common/audit/audit.service';
import { OBJECT_STORAGE_PROVIDER } from '../../common/storage/storage-provider.module';
import { PrismaService } from '../../prisma/prisma.service';
import { StartupService } from '../startup/service/startup.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: BackupService,
          useValue: {
            createBackup: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
        {
          provide: OBJECT_STORAGE_PROVIDER,
          useValue: {
            getPresignedUrl: jest.fn(),
            getBucketPrefix: jest.fn().mockReturnValue(''),
          },
        },
        {
          provide: SessionService,
          useValue: {
            getSession: jest.fn(),
            setSession: jest.fn(),
            deleteSession: jest.fn(),
            updateSession: jest.fn(),
          },
        },
        {
          provide: CookiesService,
          useValue: {},
        },
        {
          provide: Reflector,
          useValue: {},
        },
        {
          provide: StartupService,
          // UsersController#getMyStartups delega para este service.
          // Mock minimo: nada e chamado no teste `should be defined`.
          useValue: {
            getFounderStartupOverview: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
