import { Test, TestingModule } from '@nestjs/testing';
import { StartupOpinionService } from './startup-opinion.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StartupOpinionService', () => {
  let service: StartupOpinionService;

  const mockPrismaService = {
    startupOpinion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupOpinionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StartupOpinionService>(StartupOpinionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
