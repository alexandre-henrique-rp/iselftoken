import { S3Service } from './s3.service';

describe('S3Service', () => {
  let service: S3Service;
  let mockConfigService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          AWS_REGION: 'sa-east-1',
          AWS_ACCESS_KEY_ID: 'test-access-key',
          AWS_SECRET_ACCESS_KEY: 'test-secret-key',
          S3_BUCKET_PREFIX: 'test',
          BACKEND_PUBLIC_URL: 'http://localhost:7077',
          S3_PUBLIC_BASE_URL: 'https://s3.sa-east-1.amazonaws.com',
        };
        return config[key] ?? defaultValue;
      }),
    };
  });

  describe('constructor', () => {
    it('deve inicializar com config', () => {
      service = new S3Service(mockConfigService);
      expect(service.s3PublicBaseUrl).toBe(
        'https://s3.sa-east-1.amazonaws.com',
      );
    });
  });

  describe('getPublicUrl', () => {
    it('deve retornar URL publica com bucket e key', () => {
      service = new S3Service(mockConfigService);

      const url = service.getPublicUrl('image', 'test.jpg');

      expect(url).toContain('test-image');
      expect(url).toContain('test.jpg');
    });

    it('deve usar bucket sem prefixo quando S3_BUCKET_PREFIX vazio', () => {
      mockConfigService.get = jest.fn((key: string, defaultValue?: string) => {
        if (key === 'S3_BUCKET_PREFIX') return '';
        const config: Record<string, string> = {
          AWS_REGION: 'sa-east-1',
          AWS_ACCESS_KEY_ID: 'test-access-key',
          AWS_SECRET_ACCESS_KEY: 'test-secret-key',
          BACKEND_PUBLIC_URL: 'http://localhost:7077',
          S3_PUBLIC_BASE_URL: 'https://s3.sa-east-1.amazonaws.com',
        };
        return config[key] ?? defaultValue;
      });

      service = new S3Service(mockConfigService);
      const url = service.getPublicUrl('image', 'test.jpg');

      expect(url).toContain('image');
    });
  });

  describe('getPresignedImageUrl', () => {
    it('deve assinar URL legada do bucket de imagens', async () => {
      service = new S3Service(mockConfigService);
      const signedUrl = 'https://signed.example/image?X-Amz-Signature=test';
      const getUrl = jest.spyOn(service, 'getUrl').mockResolvedValue(signedUrl);

      const result = await service.getPresignedImageUrl(
        'https://test-image.s3.us-east-1.amazonaws.com/seed/medicoreflex/cover.jpg',
      );

      expect(result).toBe(signedUrl);
      expect(getUrl).toHaveBeenCalledWith(
        'image',
        'seed/medicoreflex/cover.jpg',
        900,
      );
    });

    it('deve preservar URL externa e URL já assinada', async () => {
      service = new S3Service(mockConfigService);
      const externalUrl = 'https://example.com/cover.jpg';
      const signedUrl =
        'https://test-image.s3.us-east-1.amazonaws.com/cover.jpg?X-Amz-Signature=test';

      await expect(service.getPresignedImageUrl(externalUrl)).resolves.toBe(
        externalUrl,
      );
      await expect(service.getPresignedImageUrl(signedUrl)).resolves.toBe(
        signedUrl,
      );
    });

    it('deve rejeitar host S3 que nao pertence a um bucket de imagem', async () => {
      service = new S3Service(mockConfigService);

      await expect(
        service.getPresignedImageUrl(
          'https://test-document.s3.us-east-1.amazonaws.com/secret.pdf',
        ),
      ).resolves.toBeNull();
    });
  });
  describe('upload - metodos legados', () => {
    it('deve ter metodo upload definido', () => {
      service = new S3Service(mockConfigService);
      expect(typeof service.upload).toBe('function');
    });

    it('deve ter metodo download definido', () => {
      service = new S3Service(mockConfigService);
      expect(typeof service.download).toBe('function');
    });

    it('deve ter metodo getUrl definido', () => {
      service = new S3Service(mockConfigService);
      expect(typeof service.getUrl).toBe('function');
    });

    it('deve ter metodo delete definido', () => {
      service = new S3Service(mockConfigService);
      expect(typeof service.delete).toBe('function');
    });

    it('deve ter metodo exists definido', () => {
      service = new S3Service(mockConfigService);
      expect(typeof service.exists).toBe('function');
    });

    it('deve ter metodo healthCheck definido', () => {
      service = new S3Service(mockConfigService);
      expect(typeof service.healthCheck).toBe('function');
    });
  });
});
