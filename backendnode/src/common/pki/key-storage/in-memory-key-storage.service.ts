import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { IKeyStorageService } from './key-storage.interface';

const STORAGE_FILE = '.pki_keystore.json';
const ALGORITHM = 'aes-256-gcm';
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Implementacao in-memory (stub) do KeyStorageService para ambientes de dev.
 *
 * Este stub:
 * - Armazena chaves criptografadas em arquivo JSON local (AES-256-GCM)
 * - Usa senha do env (KEY_STORAGE_PASSPHRASE) para derivar a chave de criptografia
 * - Loga warning claro quando em uso
 *
 * @warning VAULT INDISPONIVEL. USANDO STUB DE FILESYSTEM CRIPTOGRAFADO. APENAS PARA DEV.
 * @note Em producao, usar HashiCorp Vault transit engine via VaultProductionKeyStorage.
 */
@Injectable()
export class InMemoryKeyStorageService implements IKeyStorageService {
  private readonly logger = new Logger(InMemoryKeyStorageService.name);
  private keystore: Map<
    string,
    { encrypted: string; iv: string; tag: string; salt: string }
  > = new Map();
  private passphrase: string;

  constructor() {
    this.passphrase =
      process.env.KEY_STORAGE_PASSPHRASE ||
      'dev-passphrase-change-in-production';
    this.load();
    this.logger.warn(
      '[PKI] Vault indisponivel. Usando stub de filesystem criptografado. APENAS PARA DEV.',
    );
    this.logger.warn(
      '[PKI] Para producao, configure VAULT_ADDR e VAULT_TOKEN no ambiente.',
    );
  }

  private getStoragePath(): string {
    // Permite apontar o keystore para um diretório persistente (ex.: um
    // volume Docker). Sem isso, o arquivo fica em `process.cwd()` e é
    // perdido quando o container é recriado — o que dessincroniza o
    // keystore do banco (CAs no banco sem as chaves privadas), causando
    // "Chave nao encontrada" ao assinar termos.
    //
    // Config: `KEY_STORAGE_PATH` pode ser um diretório (usa o nome padrão
    // do arquivo dentro dele) ou o caminho completo do arquivo `.json`.
    const configured = process.env.KEY_STORAGE_PATH?.trim();
    if (configured) {
      return configured.endsWith('.json')
        ? path.resolve(configured)
        : path.resolve(configured, STORAGE_FILE);
    }
    return path.resolve(process.cwd(), STORAGE_FILE);
  }

  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.passphrase,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      'sha256',
    );
  }

  private encrypt(plaintext: string): {
    encrypted: string;
    iv: string;
    tag: string;
    salt: string;
  } {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.deriveKey(salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt.toString('base64'),
    };
  }

  private decrypt(encryptedData: {
    encrypted: string;
    iv: string;
    tag: string;
    salt: string;
  }): string {
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const key = this.deriveKey(salt);
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private load(): void {
    const storagePath = this.getStoragePath();
    if (fs.existsSync(storagePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
        this.keystore = new Map(Object.entries(data));
      } catch {
        this.keystore = new Map();
      }
    }
  }

  private persist(): void {
    const storagePath = this.getStoragePath();
    const dir = path.dirname(storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = Object.fromEntries(this.keystore);
    fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
  }

  async store(key: string, privateKeyPem: string): Promise<string> {
    const encrypted = this.encrypt(privateKeyPem);
    this.keystore.set(key, encrypted);
    this.persist();
    this.logger.debug(`[PKI] Chave armazenada: ${key}`);
    return key;
  }

  async retrieve(key: string): Promise<string> {
    const entry = this.keystore.get(key);
    if (!entry) {
      throw new Error(`Chave nao encontrada: ${key}`);
    }
    return this.decrypt(entry);
  }

  async delete(key: string): Promise<void> {
    this.keystore.delete(key);
    this.persist();
    this.logger.debug(`[PKI] Chave removida: ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    return this.keystore.has(key);
  }
}
