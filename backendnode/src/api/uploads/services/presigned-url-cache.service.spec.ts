import { Test, TestingModule } from '@nestjs/testing';
import { PresignedUrlCacheService } from './presigned-url-cache.service';
import { OBJECT_STORAGE_PROVIDER } from '../../../common/storage/storage-provider.module';

// Token for default Redis connection in @nestjs-modules/ioredis
const REDIS_CONNECTION_TOKEN = 'default_IORedisModuleConnectionToken';

describe('PresignedUrlCacheService', () => {
  let service: PresignedUrlCacheService;
  let mockRedis: any;
  let mockStorageProvider: any;

  const mockPresignedUrl =
    'https://image.s3.amazonaws.com/key.jpg?signature=abc';

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      hgetall: jest.fn(),
      hincrby: jest.fn(),
    };

    mockStorageProvider = {
      getPresignedUrl: jest.fn().mockResolvedValue(mockPresignedUrl),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresignedUrlCacheService,
        { provide: REDIS_CONNECTION_TOKEN, useValue: mockRedis },
        { provide: OBJECT_STORAGE_PROVIDER, useValue: mockStorageProvider },
      ],
    }).compile();

    service = module.get<PresignedUrlCacheService>(PresignedUrlCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPresignedUrl', () => {
    it('deve retornar URL do cache quando existir e for valida', async () => {
      const expiresAt = new Date(Date.now() + 60000 * 60).toISOString(); // 1 hour from now
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          url: mockPresignedUrl,
          expiresAt,
        }),
      );

      const result = await service.getPresignedUrl('image', 'key.jpg', 604800);

      expect(result).toBe(mockPresignedUrl);
      expect(mockStorageProvider.getPresignedUrl).not.toHaveBeenCalled();
    });

    it('deve gerar nova URL quando cache expirado', async () => {
      const expiredExpiresAt = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          url: mockPresignedUrl,
          expiresAt: expiredExpiresAt,
        }),
      );
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.getPresignedUrl('image', 'key.jpg', 604800);

      expect(result).toBe(mockPresignedUrl);
      expect(mockStorageProvider.getPresignedUrl).toHaveBeenCalledWith(
        'image',
        'key.jpg',
        604800,
      );
    });

    it('deve gerar nova URL quando cache nao existir (MISS)', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.getPresignedUrl('image', 'key.jpg', 604800);

      expect(result).toBe(mockPresignedUrl);
      expect(mockStorageProvider.getPresignedUrl).toHaveBeenCalledWith(
        'image',
        'key.jpg',
        604800,
      );
    });

    it('deve retornar null quando URL expirada e tempo restante < 60s', async () => {
      const soonExpiresAt = new Date(Date.now() + 30 * 1000).toISOString(); // 30 seconds from now
      mockRedis.get.mockResolvedValue(
        JSON.stringify({
          url: mockPresignedUrl,
          expiresAt: soonExpiresAt,
        }),
      );

      // Should generate new URL since remaining time < 60s
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.getPresignedUrl('image', 'key.jpg', 604800);

      expect(result).toBe(mockPresignedUrl);
      expect(mockStorageProvider.getPresignedUrl).toHaveBeenCalled();
    });
  });

  describe('invalidate', () => {
    it('deve remover cache ao invalidar', async () => {
      mockRedis.keys.mockResolvedValue(['presigned:image:key.jpg:123456']);
      mockRedis.del.mockResolvedValue(1);

      await service.invalidate('image', 'key.jpg');

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('getHitRatio', () => {
    it('deve retornar hit ratio acumulado', async () => {
      mockRedis.hgetall.mockResolvedValue({ hits: '80', misses: '20' });

      const ratio = await service.getHitRatio();

      expect(ratio).toBe(0.8); // 80%
    });
  });
});
