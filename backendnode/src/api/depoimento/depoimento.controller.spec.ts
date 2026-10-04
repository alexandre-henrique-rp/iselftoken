import { Test, TestingModule } from '@nestjs/testing';
import { DepoimentoController } from './depoimento.controller';
import { DepoimentoService } from './depoimento.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { SessionService } from '../../auth/session/session.service';
import { Reflector } from '@nestjs/core';

describe('DepoimentoController', () => {
  let controller: DepoimentoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepoimentoController],
      providers: [
        DepoimentoService,
        {
          provide: PrismaService,
          useValue: {
            depoimento: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
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

    controller = module.get<DepoimentoController>(DepoimentoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
