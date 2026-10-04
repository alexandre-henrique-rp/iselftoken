import { Logger } from '@nestjs/common';
import { VaultTransitKeyStorageService } from './vault-transit-key-storage.service';

describe('VaultTransitKeyStorageService', () => {
  const mockVaultAddr = 'http://localhost:8200';
  const mockVaultToken = 'test-token';
  const mockLogger: Partial<Logger> = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  let service: VaultTransitKeyStorageService;

  beforeEach(() => {
    service = new VaultTransitKeyStorageService(
      mockVaultAddr,
      mockVaultToken,
      mockLogger as Logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should strip trailing slash from vault addr', () => {
      const s = new VaultTransitKeyStorageService(
        'http://localhost:8200/',
        mockVaultToken,
        mockLogger as Logger,
      );
      expect(s.getVaultAddr()).toBe('http://localhost:8200');
    });

    it('should return vault addr without trailing slash', () => {
      expect(service.getVaultAddr()).toBe('http://localhost:8200');
    });
  });

  describe('exists', () => {
    it('should return true when key exists in vault', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: { type: 'rsa-2048' } }),
      };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.exists('iselftoken/pki/root/private');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8200/v1/transit/keys/iselftoken/pki/root/private',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should return false when key does not exist', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.exists('iselftoken/pki/nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('store', () => {
    it('should store key in vault transit', async () => {
      const mockResponse = { ok: true };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.store(
        'iselftoken/pki/root/private',
        '-----BEGIN RSA PRIVATE KEY-----',
      );

      expect(result).toBe('iselftoken/pki/root/private');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8200/v1/transit/keys/iselftoken/pki/root/private',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ type: 'rsa-2048', exportable: false }),
        }),
      );
    });

    it('should sanitize key name with invalid chars', async () => {
      const mockResponse = { ok: true };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      await service.store('key/with spaces!@#', 'pem');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8200/v1/transit/keys/key/with_spaces___',
        expect.any(Object),
      );
    });

    it('should throw on vault error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'internal server error',
      };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      await expect(
        service.store('iselftoken/pki/root/private', 'pem'),
      ).rejects.toThrow('Vault create key failed');
    });
  });

  describe('sign', () => {
    it('should sign data using vault transit', async () => {
      const mockSignature = 'vault签名base64==';
      const mockResponse = {
        ok: true,
        json: async () => ({ data: { signature: mockSignature } }),
      };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      const dataHash = Buffer.from('test-data-hash').toString('base64');
      const result = await service.sign(
        'iselftoken/pki/root/private',
        dataHash,
        'pkcs1v15',
      );

      expect(result).toBe(mockSignature);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8200/v1/transit/sign/iselftoken/pki/root/private',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            input: dataHash,
            signature_algorithm: 'pkcs1v15',
          }),
        }),
      );
    });

    it('should use rsassa-pss for pss algorithm', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: { signature: 'sig' } }),
      };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      await service.sign('key', 'hash', 'pss');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            input: 'hash',
            signature_algorithm: 'rsassa-pss',
          }),
        }),
      );
    });

    it('should throw on sign failure', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: async () => 'key not found',
      };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      await expect(service.sign('key', 'hash')).rejects.toThrow(
        'Vault sign failed',
      );
    });
  });

  describe('isHealthy', () => {
    it('should return true when vault responds', async () => {
      const mockResponse = { ok: true };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.isHealthy();

      expect(result).toBe(true);
    });

    it('should return true when vault is sealed (429)', async () => {
      const mockResponse = { ok: false, status: 429 };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false when vault is unreachable', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.isHealthy();

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete key from vault', async () => {
      const mockResponse = { ok: true, json: async () => ({ data: {} }) };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      await service.delete('iselftoken/pki/root/private');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8200/v1/transit/keys/iselftoken/pki/root/private',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('retrieve', () => {
    it('should return key metadata (not private key)', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: { type: 'rsa-2048', name: 'key_name' },
        }),
      };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.retrieve('key_name');

      expect(JSON.parse(result)).toMatchObject({
        name: 'key_name',
        type: 'rsa-2048',
        exported: 'false',
      });
    });

    it('should throw on key not found', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: async () => 'not found',
      };
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(mockResponse as unknown as Response);

      await expect(service.retrieve('nonexistent')).rejects.toThrow();
    });
  });
});
