import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { SessionService } from '../../auth/session/session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../config/config.service';
import { PlansController } from './plans.controller';
import { AdminValidateService } from './services/admi-validate.service';
import { PlansService } from './services/plans.service';

describe('PlansController', () => {
  let controller: PlansController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [
        PlansService,
        {
          provide: PrismaService,
          useValue: {
            plan: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: { getEffective: jest.fn() },
        },
        {
          provide: AdminValidateService,
          useValue: {},
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

    controller = module.get<PlansController>(PlansController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
