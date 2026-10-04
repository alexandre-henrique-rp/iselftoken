import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { S3Service } from '../../../src/s3/s3.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { cleanupTestUser } from './setup/db-cleanup';
import {
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
} from './setup/test-helpers';

describe('E2E - URLs de Upload Completas (T024)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmail = generateUniqueEmail('e2eUploadUrl');

  beforeAll(async () => {
    process.env.BACKEND_PUBLIC_URL = 'http://test.local:7077';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await cleanupTestUser(prisma, testEmail);
    await app.close();
  });

  describe('S3Service.upload()', () => {
    it('deve retornar URL completa com BACKEND_PUBLIC_URL', async () => {
      const s3Service = app.get<S3Service>(S3Service);
      const result = await s3Service.upload(
        Buffer.from('test-content'),
        'image',
        'test-file.jpg',
        'image/jpeg',
      );
      // URL deve comecar com BACKEND_PUBLIC_URL, nao com path relativo
      expect(result.url).toMatch(/^http:\/\/test\.local:7077\//);
      // URL deve ter o bucket prefix + nome (ex: /iselftoken-image/test-file.jpg)
      expect(result.url).toContain('/iselftoken-image/');
      expect(result.url).not.toMatch(/^\//);
    });
  });

  describe('URL format validation', () => {
    it('deve conter protocolo http/https, host, e path correto', async () => {
      const s3Service = app.get<S3Service>(S3Service);
      const result = await s3Service.upload(
        Buffer.from('test'),
        'image',
        'file.jpg',
        'image/jpeg',
      );

      const url = result.url;
      expect(url).toMatch(/^https?:\/\//);
      expect(url).toContain('/iselftoken-image/');
      expect(url).not.toMatch(/^\//);
      // Nao deve conter URL interna do storage
      expect(url).not.toContain('localhost:9000');
    });
  });
});
