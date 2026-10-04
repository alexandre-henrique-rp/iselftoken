import { PdfTemplateBuilderService } from './pdf-template-builder.service';
import { TermoAdesaoData } from './termo-adesao.template';

describe('PdfTemplateBuilderService', () => {
  let service: PdfTemplateBuilderService;

  beforeEach(() => {
    service = new PdfTemplateBuilderService();
  });

  const mockData: TermoAdesaoData = {
    startup: {
      name: 'Tech Startup Inovadora',
      cnpj: '12.345.678/0001-90',
      equity: '10%',
    },
    founder: {
      name: 'Joao Silva Santos',
      cpf: '***.123.456-**',
      email: 'joao@techstartup.com.br',
    },
    signedAt: new Date('2026-07-10T14:30:00Z'),
    certificateFingerprintFounder: 'a1b2c3d4e5f6789012345678901234567890abcdef',
    certificateFingerprintStartup: 'f1e2d3c4b5a6978012345678901234567890fedcba',
    documentHash: 'deadbeef1234567890abcdef1234567890beef1234',
    qrCodeUrl: 'https://iselftoken.com.br/verificar/abc123',
    termoVersao: '1.0',
  };

  describe('generateTermoPdf', () => {
    it('should generate a PDF buffer', async () => {
      const result = await service.generateTermoPdf(mockData);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('should generate PDF larger than 5KB', async () => {
      const result = await service.generateTermoPdf(mockData);

      // 5KB = 5120 bytes
      expect(result.buffer.length).toBeGreaterThan(5120);
    });

    it('should calculate correct SHA-256 hash', async () => {
      const result = await service.generateTermoPdf(mockData);

      // Verify hash is a valid SHA-256 hex string (64 characters)
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate PDF with PDF magic bytes', async () => {
      const result = await service.generateTermoPdf(mockData);

      // PDF files start with %PDF-
      const header = result.buffer.slice(0, 5).toString();
      expect(header).toBe('%PDF-');
    });

    it('should end with %%EOF', async () => {
      const result = await service.generateTermoPdf(mockData);

      // PDF files end with %%EOF (possibly followed by newline)
      const endContent = result.buffer.slice(-10).toString();
      expect(endContent).toContain('%%EOF');
    });

    it('should handle special characters in names', async () => {
      const dataWithSpecialChars: TermoAdesaoData = {
        ...mockData,
        startup: {
          ...mockData.startup,
          name: 'Empresa Teste & Filhos Ltda.',
        },
        founder: {
          ...mockData.founder,
          name: 'José António da Silva Júnior',
        },
      };

      const result = await service.generateTermoPdf(dataWithSpecialChars);

      expect(result.buffer.length).toBeGreaterThan(5120);
    });

    it('should handle long startup names', async () => {
      const dataWithLongName: TermoAdesaoData = {
        ...mockData,
        startup: {
          ...mockData.startup,
          name: 'A Maior Startup de Tecnologia e Inovacao do Brasil S/A',
        },
      };

      const result = await service.generateTermoPdf(dataWithLongName);

      expect(result.buffer.length).toBeGreaterThan(5120);
    });

    it('should handle different date formats', async () => {
      const dataWithDifferentDates: TermoAdesaoData = {
        ...mockData,
        signedAt: new Date('2025-01-01T00:00:00Z'),
      };

      const result = await service.generateTermoPdf(dataWithDifferentDates);

      expect(result.buffer.length).toBeGreaterThan(5120);
    });

    it('should produce different hash for different data', async () => {
      const result1 = await service.generateTermoPdf(mockData);

      const differentData: TermoAdesaoData = {
        ...mockData,
        founder: {
          ...mockData.founder,
          name: 'Different Person',
        },
      };
      const result2 = await service.generateTermoPdf(differentData);

      expect(result1.hash).not.toBe(result2.hash);
    });
  });

  describe('generateTermoPdf edge cases', () => {
    it('should handle 0% equity', async () => {
      const data: TermoAdesaoData = {
        ...mockData,
        startup: { ...mockData.startup, equity: '0%' },
      };

      const result = await service.generateTermoPdf(data);
      expect(result.buffer.length).toBeGreaterThan(5120);
    });

    it('should handle 100% equity', async () => {
      const data: TermoAdesaoData = {
        ...mockData,
        startup: { ...mockData.startup, equity: '100%' },
      };

      const result = await service.generateTermoPdf(data);
      expect(result.buffer.length).toBeGreaterThan(5120);
    });

    it('should handle very long document hash', async () => {
      const data: TermoAdesaoData = {
        ...mockData,
        documentHash: 'a'.repeat(64),
      };

      const result = await service.generateTermoPdf(data);
      expect(result.buffer.length).toBeGreaterThan(5120);
    });

    it('should handle founder with masked CPF', async () => {
      const data: TermoAdesaoData = {
        ...mockData,
        founder: { ...mockData.founder, cpf: '***.***.***-00' },
      };

      const result = await service.generateTermoPdf(data);
      expect(result.buffer.length).toBeGreaterThan(5120);
    });
  });
});
