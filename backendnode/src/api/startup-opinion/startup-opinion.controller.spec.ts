import { Test, TestingModule } from '@nestjs/testing';
import { StartupOpinionController } from './startup-opinion.controller';
import { StartupOpinionService } from './startup-opinion.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { SessionService } from '../../auth/session/session.service';
import { Reflector } from '@nestjs/core';

describe('StartupOpinionController', () => {
  let controller: StartupOpinionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StartupOpinionController],
      providers: [
        StartupOpinionService,
        {
          provide: PrismaService,
          useValue: {
            startupOpinion: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: CookiesService,
          useValue: {},
        },
        {
          provide: SessionService,
          useValue: {},
        },
        {
          provide: Reflector,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<StartupOpinionController>(StartupOpinionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
