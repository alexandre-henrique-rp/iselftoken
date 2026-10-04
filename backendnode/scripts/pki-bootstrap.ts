/**
 * Script de bootstrap da Certificate Authority interna.
 *
 * Uso:
 *   npm run pki:init
 *
 * Este script:
 * - Verifica se as CAs (Root + Intermediate) ja existem
 * - Cria as CAs se nao existirem
 * - E IDEMPOTENTE: rodar 2x nao duplica registros
 *
 * Variaveis de ambiente:
 *   DATABASE_URL       - URL SQLite do banco (file:./prisma/dev.db)
 *   KEY_STORAGE_MODE   - 'in-memory' (default) ou 'vault'
 *   KEY_STORAGE_PASSPHRASE - Senha para criptografia do keystore (dev)
 *   VAULT_ADDR         - Endereco do Vault (se KEY_STORAGE_MODE=vault)
 *   VAULT_TOKEN        - Token do Vault (se KEY_STORAGE_MODE=vault)
 */

import type { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import 'dotenv/config';
import * as fs from 'fs';
import * as forge from 'node-forge';
import * as path from 'path';
import { getSeedPrismaClient } from '../prisma/seeds/seed-client-helper';

// ==========================================
// KeyStorage In-Memory (copiado do service para script standalone)
// ==========================================

const STORAGE_FILE = '.pki_keystore.json';
const ALGORITHM = 'aes-256-gcm';
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

interface IKeyStorageService {
  store(key: string, privateKeyPem: string): Promise<string>;
  retrieve(key: string): Promise<string>;
}

class InMemoryKeyStorageService implements IKeyStorageService {
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
    console.warn(
      '[WARN] Vault indisponivel. Usando stub de filesystem criptografado. APENAS PARA DEV.',
    );
  }

  private getStoragePath(): string {
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
    const data = Object.fromEntries(this.keystore);
    fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
  }

  async store(key: string, privateKeyPem: string): Promise<string> {
    const encrypted = this.encrypt(privateKeyPem);
    this.keystore.set(key, encrypted);
    this.persist();
    return key;
  }

  async retrieve(key: string): Promise<string> {
    const entry = this.keystore.get(key);
    if (!entry) throw new Error(`Chave nao encontrada: ${key}`);
    return this.decrypt(entry);
  }
}

// ==========================================
// Configuracao da CA
// ==========================================

const CA_CONFIG = {
  ROOT: {
    commonName: 'ISELFTOKEN ROOT CA G1',
    organization: 'Iselftoken',
    validityDays: 365 * 10,
    path: 'iselftoken/pki/root/private',
  },
  INTERMEDIATE: {
    commonName: 'ISELFTOKEN INTERMEDIATE CA G1',
    organization: 'Iselftoken',
    validityDays: 365 * 5,
    path: 'iselftoken/pki/intermediate/private',
  },
};

// ==========================================
// Main
// ==========================================

function generateSerial(): string {
  const bytes = forge.util.bytesToHex(
    forge.util.decode64(forge.util.encode64(String(Date.now()))),
  );
  return bytes.substring(0, 16).toUpperCase();
}

async function createRootCa(
  prisma: PrismaClient,
  keyStorage: IKeyStorageService,
) {
  console.log('[PKI] Gerando Root CA...');

  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = generateSerial();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(
    cert.validity.notBefore.getDate() + CA_CONFIG.ROOT.validityDays,
  );

  const attrs = [
    { name: 'commonName', value: CA_CONFIG.ROOT.commonName },
    { name: 'organizationName', value: CA_CONFIG.ROOT.organization },
    { name: 'countryName', value: 'BR' },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, pathLenConstraint: 1 },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true },
    { name: 'subjectKeyIdentifier', hash: true },
  ]);

  cert.sign(keypair.privateKey, forge.md.sha256.create());

  const certificatePem = forge.pki.certificateToPem(cert);
  await keyStorage.store(CA_CONFIG.ROOT.path, privateKeyPem);

  const rootCa = await prisma.certificateAuthority.create({
    data: {
      type: 'root',
      commonName: CA_CONFIG.ROOT.commonName,
      organization: CA_CONFIG.ROOT.organization,
      certificatePem,
      privateKeyRef: CA_CONFIG.ROOT.path,
      issuedAt: cert.validity.notBefore,
      expiresAt: cert.validity.notAfter,
      status: 'active',
    },
  });

  console.log(`[PKI] Root CA criada: ${rootCa.id}`);
  return rootCa;
}

async function createIntermediateCa(
  prisma: PrismaClient,
  keyStorage: IKeyStorageService,
  rootCaId: string,
) {
  console.log('[PKI] Gerando Intermediate CA...');

  const rootCaRecord = await prisma.certificateAuthority.findUniqueOrThrow({
    where: { id: rootCaId },
  });

  const rootCertPem = rootCaRecord.certificatePem;
  const rootPrivateKeyPem = await keyStorage.retrieve(
    rootCaRecord.privateKeyRef,
  );

  const rootCert = forge.pki.certificateFromPem(rootCertPem);
  const rootPrivateKey = forge.pki.privateKeyFromPem(rootPrivateKeyPem);

  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = generateSerial();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(
    cert.validity.notBefore.getDate() + CA_CONFIG.INTERMEDIATE.validityDays,
  );

  const subject = [
    { name: 'commonName', value: CA_CONFIG.INTERMEDIATE.commonName },
    { name: 'organizationName', value: CA_CONFIG.INTERMEDIATE.organization },
    { name: 'countryName', value: 'BR' },
  ];

  const issuer = [
    {
      name: 'commonName',
      value:
        rootCert.subject.getField('CN')?.value || CA_CONFIG.ROOT.commonName,
    },
    {
      name: 'organizationName',
      value:
        rootCert.subject.getField('O')?.value || CA_CONFIG.ROOT.organization,
    },
    { name: 'countryName', value: 'BR' },
  ];

  cert.setSubject(subject);
  cert.setIssuer(issuer);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, pathLenConstraint: 0 },
    {
      name: 'keyUsage',
      keyCertSign: true,
      cRLSign: true,
      digitalSignature: true,
      nonRepudiation: true,
    },
    { name: 'subjectKeyIdentifier', hash: true },
    {
      name: 'authorityKeyIdentifier',
      issuer: true,
      keyIdentifier: true,
      serialNumber: true,
    },
  ]);

  cert.sign(rootPrivateKey, forge.md.sha256.create());

  const certificatePem = forge.pki.certificateToPem(cert);
  await keyStorage.store(CA_CONFIG.INTERMEDIATE.path, privateKeyPem);

  const intermediateCa = await prisma.certificateAuthority.create({
    data: {
      type: 'intermediate',
      parentCaId: rootCaId,
      commonName: CA_CONFIG.INTERMEDIATE.commonName,
      organization: CA_CONFIG.INTERMEDIATE.organization,
      certificatePem,
      privateKeyRef: CA_CONFIG.INTERMEDIATE.path,
      issuedAt: cert.validity.notBefore,
      expiresAt: cert.validity.notAfter,
      status: 'active',
    },
  });

  console.log(`[PKI] Intermediate CA criada: ${intermediateCa.id}`);
  return intermediateCa;
}

async function main() {
  console.log('[PKI] ==========================================');
  console.log('[PKI] Bootstrap da CA Interna - Iselftoken');
  console.log('[PKI] ==========================================');

  const prisma = getSeedPrismaClient();

  const keyStorage = new InMemoryKeyStorageService();

  try {
    // Verificar Root CA existente
    const existingRoot = await prisma.certificateAuthority.findFirst({
      where: { type: 'root', status: 'active' },
    });

    let rootCaId: string;

    if (existingRoot) {
      console.log('[PKI] Root CA ja existe, pulando criacao');
      rootCaId = existingRoot.id;
    } else {
      const rootCa = await createRootCa(prisma, keyStorage);
      rootCaId = rootCa.id;
    }

    // Verificar Intermediate CA existente
    const existingIntermediate = await prisma.certificateAuthority.findFirst({
      where: { type: 'intermediate', status: 'active' },
    });

    if (existingIntermediate) {
      console.log('[PKI] Intermediate CA ja existe, pulando criacao');
    } else {
      await createIntermediateCa(prisma, keyStorage, rootCaId);
    }

    console.log('[PKI] ==========================================');
    console.log('[PKI] Bootstrap concluido com sucesso!');
    console.log('[PKI] ==========================================');
  } catch (error) {
    console.error('[PKI] Erro durante bootstrap:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
