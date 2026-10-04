import { Test, TestingModule } from '@nestjs/testing';
import { CountryService } from './country.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CountryService', () => {
  let service: CountryService;

  const mockPrismaService = {
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CountryService>(CountryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
