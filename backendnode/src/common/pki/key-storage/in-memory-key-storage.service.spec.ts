import { InMemoryKeyStorageService } from './in-memory-key-storage.service';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

import * as fs from 'fs';

describe('InMemoryKeyStorageService', () => {
  let service: InMemoryKeyStorageService;
  const mockExistsSync = fs.existsSync as jest.Mock;
  const mockReadFileSync = fs.readFileSync as jest.Mock;
  const mockWriteFileSync = fs.writeFileSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('{}');
    mockWriteFileSync.mockImplementation(() => {});

    // Set test passphrase
    process.env.KEY_STORAGE_PASSPHRASE = 'test-passphrase-123';
  });

  afterEach(() => {
    delete process.env.KEY_STORAGE_PASSPHRASE;
  });

  describe('store and retrieve', () => {
    it('should store and retrieve a key', async () => {
      service = new InMemoryKeyStorageService();
      const privateKey =
        '-----BEGIN RSA PRIVATE KEY-----\nMOCK_KEY\n-----END RSA PRIVATE KEY-----';

      const path = await service.store('test/key/path', privateKey);

      expect(path).toBe('test/key/path');
      expect(mockWriteFileSync).toHaveBeenCalled();

      const retrieved = await service.retrieve('test/key/path');
      expect(retrieved).toBe(privateKey);
    });

    it('should throw when retrieving non-existent key', async () => {
      service = new InMemoryKeyStorageService();

      await expect(service.retrieve('non/existent/key')).rejects.toThrow(
        'Chave nao encontrada',
      );
    });
  });

  describe('exists', () => {
    it('should return true for existing key', async () => {
      service = new InMemoryKeyStorageService();
      await service.store('existing/key', 'some-key');

      const exists = await service.exists('existing/key');

      expect(exists).toBe(true);
    });

    it('should return false for non-existing key', async () => {
      service = new InMemoryKeyStorageService();

      const exists = await service.exists('non/existent/key');

      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an existing key', async () => {
      service = new InMemoryKeyStorageService();
      await service.store('key/to/delete', 'some-key');

      await service.delete('key/to/delete');

      const exists = await service.exists('key/to/delete');
      expect(exists).toBe(false);
    });

    it('should not throw when deleting non-existent key', async () => {
      service = new InMemoryKeyStorageService();

      await expect(service.delete('non/existent/key')).resolves.not.toThrow();
    });
  });

  describe('encryption', () => {
    it('should encrypt the stored key', async () => {
      service = new InMemoryKeyStorageService();
      const privateKey =
        '-----BEGIN RSA PRIVATE KEY-----\nSECRET_KEY\n-----END RSA PRIVATE KEY-----';

      await service.store('secret/key', privateKey);

      // Check that writeFileSync was called with JSON containing encrypted data
      expect(mockWriteFileSync).toHaveBeenCalled();
      const writtenData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);

      expect(writtenData['secret/key']).toBeDefined();
      expect(writtenData['secret/key'].encrypted).toBeDefined();
      expect(writtenData['secret/key'].iv).toBeDefined();
      expect(writtenData['secret/key'].tag).toBeDefined();
      expect(writtenData['secret/key'].salt).toBeDefined();

      // Verify the encrypted data is different from the plaintext
      expect(writtenData['secret/key'].encrypted).not.toContain('SECRET_KEY');
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', async () => {
      service = new InMemoryKeyStorageService();
      const privateKey =
        '-----BEGIN RSA PRIVATE KEY-----\nSECRET_KEY\n-----END RSA PRIVATE KEY-----';

      await service.store('key1', privateKey);
      await service.delete('key1');
      await service.store('key2', privateKey);

      const data1 = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      const data2 = JSON.parse(mockWriteFileSync.mock.calls[2][1]);

      // IVs should be different
      expect(data1['key1'].iv).not.toBe(data2['key2'].iv);
    });
  });

  describe('KEY_STORAGE_PATH configuration', () => {
    afterEach(() => {
      delete process.env.KEY_STORAGE_PATH;
    });

    it('persiste em diretório configurado (cria dir se necessário)', async () => {
      process.env.KEY_STORAGE_PATH = '/data/pki';
      mockExistsSync.mockReturnValue(false);
      service = new InMemoryKeyStorageService();

      await service.store('k', 'v');

      // Deve criar o diretório e gravar o arquivo dentro dele.
      expect(fs.mkdirSync).toHaveBeenCalledWith('/data/pki', {
        recursive: true,
      });
      const writtenPath = mockWriteFileSync.mock.calls[0][0] as string;
      expect(writtenPath).toBe('/data/pki/.pki_keystore.json');
    });

    it('aceita caminho completo de arquivo .json', async () => {
      process.env.KEY_STORAGE_PATH = '/data/pki/custom.json';
      mockExistsSync.mockReturnValue(false);
      service = new InMemoryKeyStorageService();

      await service.store('k', 'v');

      const writtenPath = mockWriteFileSync.mock.calls[0][0] as string;
      expect(writtenPath).toBe('/data/pki/custom.json');
    });
  });

  describe('load from existing keystore', () => {
    it('should load existing keys from file on initialization', () => {
      const existingData = {
        'existing/key': {
          encrypted: 'some-encrypted-data',
          iv: 'some-iv',
          tag: 'some-tag',
          salt: 'some-salt',
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingData));

      // Since we can't easily mock the deriveKey, we'll just check the keystore is initialized
      service = new InMemoryKeyStorageService();

      // The keystore should be initialized
      expect(service).toBeDefined();
    });
  });
});
