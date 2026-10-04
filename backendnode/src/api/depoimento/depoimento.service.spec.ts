import { Test, TestingModule } from '@nestjs/testing';
import { DepoimentoService } from './depoimento.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DepoimentoService', () => {
  let service: DepoimentoService;

  const mockPrismaService = {
    depoimento: {
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
        DepoimentoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DepoimentoService>(DepoimentoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
