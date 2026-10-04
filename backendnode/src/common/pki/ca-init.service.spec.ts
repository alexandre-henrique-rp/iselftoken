import { Test, TestingModule } from '@nestjs/testing';
import { CaInitService, KEY_STORAGE_SERVICE } from './ca-init.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as forge from 'node-forge';

// Helper to generate a real self-signed certificate for testing
function generateSelfSignedCert(
  commonName: string,
  daysValid: number,
): { cert: string; privateKey: string } {
  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(
    Date.now() + daysValid * 24 * 60 * 60 * 1000,
  );
  cert.setSubject([{ name: 'commonName', value: commonName }]);
  cert.setIssuer([{ name: 'commonName', value: commonName }]);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, pathLenConstraint: 1 },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true },
    { name: 'subjectKeyIdentifier', hash: true },
  ]);
  cert.sign(keypair.privateKey, forge.md.sha256.create());
  return {
    cert: forge.pki.certificateToPem(cert),
    privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
  };
}

// Generate real certificates for testing
const rootCertData = generateSelfSignedCert('ISELFTOKEN ROOT CA G1', 365 * 10);
const intermediateCertData = generateSelfSignedCert(
  'ISELFTOKEN INTERMEDIATE CA G1',
  365 * 5,
);

// Mock data with real forged certificates
const mockRootCa = {
  id: 'root-ca-id',
  type: 'root',
  commonName: 'ISELFTOKEN ROOT CA G1',
  organization: 'Iselftoken',
  certificatePem: rootCertData.cert,
  privateKeyRef: 'iselftoken/pki/root/private',
  issuedAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000),
  status: 'active',
  parentCaId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockIntermediateCa = {
  id: 'intermediate-ca-id',
  type: 'intermediate',
  commonName: 'ISELFTOKEN INTERMEDIATE CA G1',
  organization: 'Iselftoken',
  certificatePem: intermediateCertData.cert,
  privateKeyRef: 'iselftoken/pki/intermediate/private',
  issuedAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 5 * 24 * 60 * 60 * 1000),
  status: 'active',
  parentCaId: 'root-ca-id',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CaInitService', () => {
  let service: CaInitService;
  let mockPrismaService: any;
  let mockKeyStorage: any;

  beforeEach(async () => {
    mockPrismaService = {
      certificateAuthority: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
    };

    mockKeyStorage = {
      store: jest.fn().mockResolvedValue('iselftoken/pki/root/private'),
      retrieve: jest.fn().mockResolvedValue(rootCertData.privateKey),
      delete: jest.fn(),
      exists: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaInitService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: KEY_STORAGE_SERVICE, useValue: mockKeyStorage },
      ],
    }).compile();

    service = module.get<CaInitService>(CaInitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bootstrap', () => {
    it('should create Root CA when it does not exist', async () => {
      // First call (Root not found), second call (Intermediate not found)
      mockPrismaService.certificateAuthority.findFirst
        .mockResolvedValueOnce(null) // Root not found
        .mockResolvedValueOnce(null); // Intermediate not found

      mockPrismaService.certificateAuthority.findUniqueOrThrow.mockResolvedValue(
        mockRootCa,
      );

      mockPrismaService.certificateAuthority.create
        .mockResolvedValueOnce(mockRootCa)
        .mockResolvedValueOnce(mockIntermediateCa);

      const result = await service.bootstrap();

      expect(result.wasCreated).toBe(true);
      expect(result.rootCa.id).toBe('root-ca-id');
      expect(result.intermediateCa.id).toBe('intermediate-ca-id');
      expect(
        mockPrismaService.certificateAuthority.create,
      ).toHaveBeenCalledTimes(2);
    });

    it('should not create Root CA when it already exists (idempotency)', async () => {
      mockPrismaService.certificateAuthority.findFirst
        .mockResolvedValueOnce(mockRootCa) // Root found
        .mockResolvedValueOnce(mockIntermediateCa); // Intermediate found

      const result = await service.bootstrap();

      expect(result.wasCreated).toBe(false);
      expect(result.rootCa.id).toBe('root-ca-id');
      expect(result.intermediateCa.id).toBe('intermediate-ca-id');
      expect(
        mockPrismaService.certificateAuthority.create,
      ).not.toHaveBeenCalled();
    });

    it('should create Intermediate CA when Root exists but Intermediate does not', async () => {
      mockPrismaService.certificateAuthority.findFirst
        .mockResolvedValueOnce(mockRootCa) // Root found
        .mockResolvedValueOnce(null); // Intermediate not found

      mockPrismaService.certificateAuthority.findUniqueOrThrow.mockResolvedValue(
        mockRootCa,
      );
      mockPrismaService.certificateAuthority.create.mockResolvedValueOnce(
        mockIntermediateCa,
      );

      const result = await service.bootstrap();

      expect(result.wasCreated).toBe(true);
      expect(result.rootCa.id).toBe('root-ca-id');
      expect(result.intermediateCa.id).toBe('intermediate-ca-id');
      expect(
        mockPrismaService.certificateAuthority.create,
      ).toHaveBeenCalledTimes(1);
    });

    it('should call keyStorage.store with correct paths', async () => {
      mockPrismaService.certificateAuthority.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockPrismaService.certificateAuthority.findUniqueOrThrow.mockResolvedValue(
        mockRootCa,
      );

      mockPrismaService.certificateAuthority.create
        .mockResolvedValueOnce(mockRootCa)
        .mockResolvedValueOnce(mockIntermediateCa);

      await service.bootstrap();

      expect(mockKeyStorage.store).toHaveBeenCalledWith(
        'iselftoken/pki/root/private',
        expect.any(String),
      );
      expect(mockKeyStorage.store).toHaveBeenCalledWith(
        'iselftoken/pki/intermediate/private',
        expect.any(String),
      );
    });
  });

  describe('getActiveCas', () => {
    it('should return all active CAs', async () => {
      mockPrismaService.certificateAuthority.findMany.mockResolvedValue([
        mockRootCa,
        mockIntermediateCa,
      ]);

      const result = await service.getActiveCas();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('root');
      expect(result[1].type).toBe('intermediate');
    });

    it('should return empty array when no CAs exist', async () => {
      mockPrismaService.certificateAuthority.findMany.mockResolvedValue([]);

      const result = await service.getActiveCas();

      expect(result).toHaveLength(0);
    });
  });

  describe('isValidCertificatePem', () => {
    it('should return true for valid certificate PEM', () => {
      // Use a real self-signed certificate for testing
      const keypair = forge.pki.rsa.generateKeyPair(2048);
      const cert = forge.pki.createCertificate();
      cert.publicKey = keypair.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      cert.setSubject([{ name: 'commonName', value: 'Test' }]);
      cert.setIssuer([{ name: 'commonName', value: 'Test' }]);
      cert.sign(keypair.privateKey);
      const pem = forge.pki.certificateToPem(cert);

      const result = service.isValidCertificatePem(pem);

      expect(result).toBe(true);
    });

    it('should return false for invalid certificate PEM', () => {
      const result = service.isValidCertificatePem('NOT_A_VALID_PEM');

      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = service.isValidCertificatePem('');

      expect(result).toBe(false);
    });
  });

  describe('isValidPrivateKeyPem', () => {
    it('should return true for valid private key PEM', () => {
      const keypair = forge.pki.rsa.generateKeyPair(2048);
      const pem = forge.pki.privateKeyToPem(keypair.privateKey);

      const result = service.isValidPrivateKeyPem(pem);

      expect(result).toBe(true);
    });

    it('should return false for invalid private key PEM', () => {
      const result = service.isValidPrivateKeyPem('NOT_A_VALID_KEY');

      expect(result).toBe(false);
    });
  });

  describe('expiresAfter', () => {
    it('should return true if certificate expires after minDate', () => {
      const keypair = forge.pki.rsa.generateKeyPair(2048);
      const cert = forge.pki.createCertificate();
      cert.publicKey = keypair.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      cert.setSubject([{ name: 'commonName', value: 'Test' }]);
      cert.setIssuer([{ name: 'commonName', value: 'Test' }]);
      cert.sign(keypair.privateKey);
      const pem = forge.pki.certificateToPem(cert);

      const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const result = service.expiresAfter(pem, minDate);

      expect(result).toBe(true);
    });

    it('should return false if certificate expires before minDate', () => {
      const keypair = forge.pki.rsa.generateKeyPair(2048);
      const cert = forge.pki.createCertificate();
      cert.publicKey = keypair.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date(
        Date.now() - 365 * 24 * 60 * 60 * 1000,
      );
      cert.validity.notAfter = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      cert.setSubject([{ name: 'commonName', value: 'Test' }]);
      cert.setIssuer([{ name: 'commonName', value: 'Test' }]);
      cert.sign(keypair.privateKey);
      const pem = forge.pki.certificateToPem(cert);

      const minDate = new Date(); // Today

      const result = service.expiresAfter(pem, minDate);

      expect(result).toBe(false);
    });

    it('should return false for invalid certificate', () => {
      const result = service.expiresAfter('INVALID', new Date());

      expect(result).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should call bootstrap on module init', async () => {
      mockPrismaService.certificateAuthority.findFirst
        .mockResolvedValueOnce(mockRootCa)
        .mockResolvedValueOnce(mockIntermediateCa);

      await service.onModuleInit();

      expect(
        mockPrismaService.certificateAuthority.findFirst,
      ).toHaveBeenCalled();
    });
  });
});
