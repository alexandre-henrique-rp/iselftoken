import { getSeedPrismaClient } from './seed-client-helper';
import { seedOpinions } from './seed-opinions';

jest.mock('./seed-client-helper', () => ({
  getSeedPrismaClient: jest.fn(),
}));

jest.mock('./seed-image-helper', () => ({
  seedImageFromUrl: jest.fn().mockResolvedValue({
    ok: true,
    uploaded: true,
    url: 'http://localhost:7077/api/files/image/seed/avatar-test.png',
    url_sm: 'http://localhost:7077/api/files/image/seed/avatar-test.png',
    url_md: 'http://localhost:7077/api/files/image/seed/avatar-test.png',
    url_web: 'http://localhost:7077/api/files/image/seed/avatar-test.png',
    url_lg: 'http://localhost:7077/api/files/image/seed/avatar-test.png',
    size: 2048,
    contentType: 'image/png',
  }),
}));

describe('seedOpinions', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 100, ...data }),
          ),
      },
      kYCProfile: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 200, ...data }),
          ),
      },
      startup: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, nome: 'NeuralForge' },
          { id: 2, nome: 'PaySwift' },
        ]),
      },
      country: {
        upsert: jest.fn().mockResolvedValue({ id: 31 }),
      },
      startupOpinion: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 1, ...data }),
          ),
      },
      depoimento: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 1, ...data }),
          ),
      },
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    (getSeedPrismaClient as jest.Mock).mockReturnValue(mockPrisma);
  });

  it('deve criar usuários reais para os autores e cadastrar StartupOpinions e Depoimentos', async () => {
    await seedOpinions();

    expect(mockPrisma.startup.findMany).toHaveBeenCalled();
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(mockPrisma.kYCProfile.create).toHaveBeenCalled();
    expect(mockPrisma.startupOpinion.create).toHaveBeenCalled();
    expect(mockPrisma.depoimento.create).toHaveBeenCalled();
    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });
});
