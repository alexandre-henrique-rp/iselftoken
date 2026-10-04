import { Logger } from '@nestjs/common';
import { createKeyStorageService } from './key-storage.factory';
import { InMemoryKeyStorageService } from './in-memory-key-storage.service';
import { VaultTransitKeyStorageService } from './vault-transit-key-storage.service';

jest.mock('./in-memory-key-storage.service');
jest.mock('./vault-transit-key-storage.service');

const mockLogger: Partial<Logger> = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('createKeyStorageService (factory)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.KEY_STORAGE_MODE;
    delete process.env.VAULT_ADDR;
    delete process.env.VAULT_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('KEY_STORAGE_MODE=in-memory (default)', () => {
    it('should return InMemoryKeyStorageService', async () => {
      const service = await createKeyStorageService(mockLogger as Logger);

      expect(service).toBeInstanceOf(InMemoryKeyStorageService);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('KEY_STORAGE_MODE=in-memory'),
      );
    });
  });

  describe('KEY_STORAGE_MODE=in-memory (explicit)', () => {
    it('should return InMemoryKeyStorageService', async () => {
      process.env.KEY_STORAGE_MODE = 'in-memory';

      const service = await createKeyStorageService(mockLogger as Logger);

      expect(service).toBeInstanceOf(InMemoryKeyStorageService);
    });
  });

  describe('KEY_STORAGE_MODE=vault without VAULT_ADDR', () => {
    it('should fallback to InMemoryKeyStorageService', async () => {
      process.env.KEY_STORAGE_MODE = 'vault';
      // VAULT_ADDR not set

      const service = await createKeyStorageService(mockLogger as Logger);

      expect(service).toBeInstanceOf(InMemoryKeyStorageService);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('VAULT_ADDR/VAULT_TOKEN nao definido'),
      );
    });
  });

  describe('KEY_STORAGE_MODE=vault without VAULT_TOKEN', () => {
    it('should fallback to InMemoryKeyStorageService', async () => {
      process.env.KEY_STORAGE_MODE = 'vault';
      process.env.VAULT_ADDR = 'http://localhost:8200';
      // VAULT_TOKEN not set

      const service = await createKeyStorageService(mockLogger as Logger);

      expect(service).toBeInstanceOf(InMemoryKeyStorageService);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('VAULT_ADDR/VAULT_TOKEN nao definido'),
      );
    });
  });

  describe('KEY_STORAGE_MODE=vault with Vault unavailable', () => {
    it('should fallback to InMemoryKeyStorageService', async () => {
      process.env.KEY_STORAGE_MODE = 'vault';
      process.env.VAULT_ADDR = 'http://localhost:8200';
      process.env.VAULT_TOKEN = 'test-token';

      // Mock fetch to simulate Vault unavailable
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const service = await createKeyStorageService(mockLogger as Logger);

      expect(service).toBeInstanceOf(InMemoryKeyStorageService);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Fallback para InMemoryKeyStorageService'),
      );
    });
  });

  describe('KEY_STORAGE_MODE=vault with Vault available', () => {
    it('should return VaultTransitKeyStorageService', async () => {
      process.env.KEY_STORAGE_MODE = 'vault';
      process.env.VAULT_ADDR = 'http://localhost:8200';
      process.env.VAULT_TOKEN = 'test-token';

      const mockResponse = { ok: true };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      const service = await createKeyStorageService(mockLogger as Logger);

      expect(service).toBeInstanceOf(VaultTransitKeyStorageService);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('VaultTransitKeyStorageService'),
      );
    });
  });

  describe('KEY_STORAGE_MODE=vault with Vault returning 429 (sealed)', () => {
    it('should return VaultTransitKeyStorageService (429 means available)', async () => {
      process.env.KEY_STORAGE_MODE = 'vault';
      process.env.VAULT_ADDR = 'http://localhost:8200';
      process.env.VAULT_TOKEN = 'test-token';

      const mockResponse = { ok: false, status: 429 };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      const service = await createKeyStorageService(mockLogger as Logger);

      expect(service).toBeInstanceOf(VaultTransitKeyStorageService);
    });
  });

  describe('KEY_STORAGE_MODE=vault with other non-ok status', () => {
    it('should fallback if status is not ok and not 429', async () => {
      process.env.KEY_STORAGE_MODE = 'vault';
      process.env.VAULT_ADDR = 'http://localhost:8200';
      process.env.VAULT_TOKEN = 'test-token';

      const mockResponse = { ok: false, status: 500 };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      const service = await createKeyStorageService(mockLogger as Logger);

      expect(service).toBeInstanceOf(InMemoryKeyStorageService);
    });
  });
});
