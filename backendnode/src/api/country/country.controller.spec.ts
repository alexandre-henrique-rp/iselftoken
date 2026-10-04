import { Test, TestingModule } from '@nestjs/testing';
import { CountryController } from './country.controller';
import { CountryService } from './country.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { SessionService } from '../../auth/session/session.service';
import { Reflector } from '@nestjs/core';

describe('CountryController', () => {
  let controller: CountryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountryController],
      providers: [
        CountryService,
        {
          provide: PrismaService,
          useValue: {
            country: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            state: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            city: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
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

    controller = module.get<CountryController>(CountryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
