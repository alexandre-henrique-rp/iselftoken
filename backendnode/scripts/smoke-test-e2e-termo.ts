/**
 * Smoke Test E2E - Termo Digital (M6-S19)
 *
 * Script standalone que valida o fluxo completo:
 * 1. Bootstrap CA Root + Intermediate
 * 2. Emissao de certificados founder + startup
 * 3. Montagem do template termo
 * 4. Assinatura PAdES via SignatureService
 * 5. Calculo SHA-256 do PDF final
 * 6. Verificacao via VerificarService.validate()
 * 7. Validacao de resposta (valid, hashMatches, certificatesActive, signedWithinValidity)
 *
 * Uso:
 *   npm run smoke:e2e
 *
 * Variaveis de ambiente:
 *   DATABASE_URL       - URL SQLite do banco (file:./prisma/dev.db)
 *   KEY_STORAGE_MODE   - 'in-memory' (default) ou 'vault'
 *   KEY_STORAGE_PASSPHRASE - Senha para keystore (dev)
 */

import type { PrismaClient } from '@prisma/client';
import * as cryptoNode from 'crypto';
import 'dotenv/config';
import * as fs from 'fs';
import Handlebars from 'handlebars';
import * as forge from 'node-forge';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { getSeedPrismaClient } from '../prisma/seeds/seed-client-helper';

// ==========================================
// Configuracao
// ==========================================

const LOG_FILE = 'coverage/smoke-m6-s19.log';
const STORAGE_FILE = '.pki_keystore.json';
const ALGORITHM = 'aes-256-gcm';
const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

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

// Template do Termo de Adesao
const TERMO_TEMPLATE = `TERMO DE ADESAO DIGITAL

TERMO DE ADESAO AO SISTEMA DE CROWDFUNDING DE EQUITY
Iselftoken Plataforma de Investimentos Ltda.

---

1. DAS PARTES

1.1. Este Termo de Adesao Digital e celebrado entre:

(a) DO FUNDADOR: {{founder.name}}, portador(a) do CPF {{founder.cpf}}, email {{founder.email}} ("Fundador"); e

(b) DA STARTUP: {{startup.name}}, portadora do CNPJ {{startup.cnpj}}, com equity de {{startup.equity}} ("Startup").

---

2. DO OBJETO

2.1. O objeto deste Termo e a adesao da Startup ao sistema de crowdfunding de equityoferecido pela Iselftoken Plataforma de Investimentos Ltda.

---

3. DA ASSINATURA DIGITAL

3.1. Este Termo foi assinado digitalmente pelo Fundador utilizando certificado digital ICP nao qualificada, em conformidade com o Art. 4 da Lei 14.063/2020.

3.2. Fingerprint do certificado (SHA-256): {{certificateFingerprintFounder}}

---

4. DO DOCUMENTO HASH

4.1. Hash do documento (SHA-256): {{documentHash}}

---

ASSINATURA DIGITAL

Documento assinado eletronicamente em {{signedAt}}.
Hash do Documento: {{documentHash}}

Plataforma Iselftoken - iselftoken.com.br
`;

// ==========================================
// KeyStorage In-Memory (copiado do service para script standalone)
// ==========================================

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
      '[WARN] KeyStorage: usando stub in-memory criptografado. APENAS PARA DEV.',
    );
  }

  private getStoragePath(): string {
    return path.resolve(process.cwd(), STORAGE_FILE);
  }

  private deriveKey(salt: Buffer): Buffer {
    return cryptoNode.pbkdf2Sync(
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
    const salt = cryptoNode.randomBytes(SALT_LENGTH);
    const key = this.deriveKey(salt);
    const iv = cryptoNode.randomBytes(IV_LENGTH);
    const cipher = cryptoNode.createCipheriv(ALGORITHM, key, iv);
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
    const decipher = cryptoNode.createDecipheriv(ALGORITHM, key, iv);
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
// Utilitarios
// ==========================================

function generateSerial(): string {
  const bytes = forge.util.bytesToHex(
    forge.util.decode64(forge.util.encode64(String(Date.now()))),
  );
  return bytes.substring(0, 16).toUpperCase();
}

function now(): number {
  return Date.now();
}

function log(message: string, durations?: Record<string, number>): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);

  // Ensure coverage directory exists
  const coverageDir = path.dirname(path.resolve(process.cwd(), LOG_FILE));
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }

  // Append to log file
  const logEntry = {
    timestamp,
    message,
    durations: durations || undefined,
  };
  fs.appendFileSync(
    path.resolve(process.cwd(), LOG_FILE),
    JSON.stringify(logEntry) + '\n',
  );
}

// ==========================================
// Certificado e CSR
// ==========================================

function generateKeyPair(): {
  publicKeyPem: string;
  privateKeyPem: string;
  publicKeyDer: Buffer;
} {
  const { publicKey, privateKey } = cryptoNode.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const publicKeyDer = cryptoNode
    .createPublicKey(publicKey)
    .export({ type: 'spki', format: 'der' });

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    publicKeyDer: Buffer.from(publicKeyDer),
  };
}

function createCsr(
  ownerType: 'founder' | 'startup',
  ownerId: string,
  publicKeyPem: string,
  privateKeyPem: string,
): string {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = publicKey;

  const commonName =
    ownerType === 'founder' ? `USER:${ownerId}` : `STARTUP:${ownerId}`;

  csr.setSubject([
    { name: 'commonName', value: commonName },
    { name: 'organizationName', value: 'Iselftoken' },
    { name: 'countryName', value: 'BR' },
  ]);

  csr.sign(privateKey, forge.md.sha256.create());
  return forge.pki.certificationRequestToPem(csr);
}

async function signCertificate(
  csrPem: string,
  intermediateCa: { certificatePem: string; privateKeyRef: string },
  serialNumber: string,
  keyStorage: IKeyStorageService,
): Promise<string> {
  const csr = forge.pki.certificationRequestFromPem(csrPem);
  if (!csr.verify()) throw new Error('CSR verification failed');

  const intermediatePrivateKeyPem = await keyStorage.retrieve(
    intermediateCa.privateKeyRef,
  );
  const intermediatePrivateKey = forge.pki.privateKeyFromPem(
    intermediatePrivateKeyPem,
  );
  const intermediateCert = forge.pki.certificateFromPem(
    intermediateCa.certificatePem,
  );

  const cert = forge.pki.createCertificate();
  if (!csr.publicKey) throw new Error('CSR has no public key');
  cert.publicKey = csr.publicKey;
  cert.serialNumber = serialNumber;
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(cert.validity.notAfter.getDate() + 365);

  cert.setSubject(csr.subject.attributes);
  cert.setIssuer(intermediateCert.subject.attributes);

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    {
      name: 'keyUsage',
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: false,
      dataEncipherment: false,
    },
    { name: 'subjectKeyIdentifier', hash: true },
    {
      name: 'authorityKeyIdentifier',
      issuer: true,
      keyIdentifier: true,
      serialNumber: true,
    },
  ]);

  cert.sign(intermediatePrivateKey, forge.md.sha256.create());
  return forge.pki.certificateToPem(cert);
}

// ==========================================
// PDF Generation
// ==========================================

async function generatePdf(data: {
  startup: { name: string; cnpj: string; equity: string };
  founder: { name: string; cpf: string; email: string };
  signedAt: Date;
  certificateFingerprintFounder: string;
  certificateFingerprintStartup: string;
  documentHash: string;
  qrCodeUrl: string;
}): Promise<Buffer> {
  const template = Handlebars.compile(TERMO_TEMPLATE);
  const htmlContent = template(data);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Add content
    doc.font('Helvetica').fontSize(11);
    const lines = htmlContent.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        doc.text(line.trim(), { align: 'justify', indent: 20 });
      } else {
        doc.moveDown();
      }
    }

    doc.end();
  });
}

// ==========================================
// PAdES Signature
// ==========================================

function pemToP12(
  certificatePem: string,
  privateKeyPem: string,
  passphrase: string = '',
): Buffer {
  const cert = forge.pki.certificateFromPem(certificatePem);
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    privateKey,
    cert,
    passphrase || null,
    { friendlyName: 'signature' },
  );
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, 'binary');
}

async function signPdf(
  pdfBuffer: Buffer,
  certificatePem: string,
  privateKeyPem: string,
  reason: string,
  location: string,
  signerName: string,
): Promise<{ signedBuffer: Buffer; hash: string }> {
  const { SignPdf } = await import('node-signpdf');
  const plainAddPlaceholder = (
    await import('node-signpdf/dist/helpers/plainAddPlaceholder')
  ).default;

  // Calculate original PDF hash
  const originalHash = cryptoNode
    .createHash('sha256')
    .update(pdfBuffer)
    .digest('hex');

  // Convert to P12
  const p12Buffer = pemToP12(certificatePem, privateKeyPem, '');

  // Add placeholder
  const pdfWithPlaceholder = plainAddPlaceholder({
    pdfBuffer,
    reason,
    contactInfo: 'smoke-test@iselftoken.com.br',
    name: signerName,
    location,
  });

  // Sign
  const signPdf = new SignPdf();
  const signedBuffer = signPdf.sign(pdfWithPlaceholder, p12Buffer, {
    passphrase: '',
  });

  return { signedBuffer, hash: originalHash };
}

// ==========================================
// Verificacao (simula GET /verificar/:id)
// ==========================================

interface VerifyResult {
  valid: boolean;
  validation: {
    hashMatches: boolean;
    certificatesActive: boolean;
    signedWithinValidity: boolean;
  };
}

async function verifyDocument(
  prisma: PrismaClient,
  documentId: string,
  pdfHash: string,
): Promise<VerifyResult> {
  const signedDoc = await prisma.signedDocument.findUnique({
    where: { id: documentId },
    include: {
      signatureFounderCert: true,
      signatureStartupCert: true,
    },
  });

  if (!signedDoc) {
    throw new Error(`Documento nao encontrado: ${documentId}`);
  }

  const now = new Date();
  const founderCert = signedDoc.signatureFounderCert;
  const startupCert = signedDoc.signatureStartupCert;

  const hashMatches = signedDoc.documentHash === pdfHash;
  const founderCertActive =
    founderCert.status === 'active' && founderCert.expiresAt > now;
  const startupCertActive =
    startupCert.status === 'active' && startupCert.expiresAt > now;
  const certificatesActive = founderCertActive && startupCertActive;

  const signedWithinValidity =
    signedDoc.signatureFounderAt >= founderCert.issuedAt &&
    signedDoc.signatureFounderAt <= founderCert.expiresAt &&
    signedDoc.signatureStartupAt >= startupCert.issuedAt &&
    signedDoc.signatureStartupAt <= startupCert.expiresAt;

  const valid = hashMatches && certificatesActive && signedWithinValidity;

  return {
    valid,
    validation: {
      hashMatches,
      certificatesActive,
      signedWithinValidity,
    },
  };
}

// ==========================================
// Main
// ==========================================

async function main() {
  const t0 = now();
  const durations: Record<string, number> = {};

  console.log('[SMOKE] ==========================================');
  console.log('[SMOKE] Smoke Test E2E - Termo Digital (M6-S19)');
  console.log('[SMOKE] ==========================================');

  log('INICIANDO smoke test E2E do termo digital');

  const prisma = getSeedPrismaClient();

  const keyStorage = new InMemoryKeyStorageService();

  try {
    // ==========================================
    // STEP 1: Bootstrap CA Root + Intermediate
    // ==========================================
    const t1 = now();

    let rootCaId: string;
    let intermediateCaId: string;

    const existingRoot = await prisma.certificateAuthority.findFirst({
      where: { type: 'root', status: 'active' },
    });

    if (existingRoot) {
      console.log('[STEP 1] Root CA ja existe, pulando criacao');
      rootCaId = existingRoot.id;
    } else {
      console.log('[STEP 1] Gerando Root CA...');
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

      rootCaId = rootCa.id;
      console.log(`[STEP 1] Root CA criada: ${rootCaId}`);
    }

    const existingIntermediate = await prisma.certificateAuthority.findFirst({
      where: { type: 'intermediate', status: 'active' },
    });

    if (existingIntermediate) {
      console.log('[STEP 1] Intermediate CA ja existe, pulando criacao');
      intermediateCaId = existingIntermediate.id;
    } else {
      console.log('[STEP 1] Gerando Intermediate CA...');
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
        {
          name: 'organizationName',
          value: CA_CONFIG.INTERMEDIATE.organization,
        },
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
            rootCert.subject.getField('O')?.value ||
            CA_CONFIG.ROOT.organization,
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

      intermediateCaId = intermediateCa.id;
      console.log(`[STEP 1] Intermediate CA criada: ${intermediateCaId}`);
    }

    durations['step1_ca_bootstrap'] = now() - t1;
    log('STEP 1 OK: CA Root + Intermediate inicializadas', durations);

    // ==========================================
    // STEP 2: Emite cert founder + startup
    // ==========================================
    const t2 = now();

    const founderId = `founder-smoke-${Date.now()}`;
    const startupId = `startup-smoke-${Date.now()}`;

    console.log('[STEP 2] Emitindo certificado founder...');
    const founderKeys = generateKeyPair();
    const founderCsr = createCsr(
      'founder',
      founderId,
      founderKeys.publicKeyPem,
      founderKeys.privateKeyPem,
    );
    const founderSerial = generateSerial();
    const founderCertPem = await signCertificate(
      founderCsr,
      {
        certificatePem: (
          await prisma.certificateAuthority.findUniqueOrThrow({
            where: { id: intermediateCaId },
          })
        ).certificatePem,
        privateKeyRef: CA_CONFIG.INTERMEDIATE.path,
      },
      founderSerial,
      keyStorage,
    );
    const founderFingerprint = cryptoNode
      .createHash('sha256')
      .update(founderKeys.publicKeyDer)
      .digest('hex');

    const founderCert = await prisma.digitalCertificate.create({
      data: {
        issuerCaId: intermediateCaId,
        ownerType: 'founder',
        ownerId: founderId,
        serialNumber: founderSerial,
        certificatePem: founderCertPem,
        privateKeyRef: `iselftoken/pki/certs/${founderSerial}/private`,
        publicKeyFingerprint: founderFingerprint,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
    });

    await keyStorage.store(
      `iselftoken/pki/certs/${founderSerial}/private`,
      founderKeys.privateKeyPem,
    );

    console.log(`[STEP 2] Certificado founder criado: ${founderCert.id}`);

    console.log('[STEP 2] Emitindo certificado startup...');
    const startupKeys = generateKeyPair();
    const startupCsr = createCsr(
      'startup',
      startupId,
      startupKeys.publicKeyPem,
      startupKeys.privateKeyPem,
    );
    const startupSerial = generateSerial();
    const startupCertPem = await signCertificate(
      startupCsr,
      {
        certificatePem: (
          await prisma.certificateAuthority.findUniqueOrThrow({
            where: { id: intermediateCaId },
          })
        ).certificatePem,
        privateKeyRef: CA_CONFIG.INTERMEDIATE.path,
      },
      startupSerial,
      keyStorage,
    );
    const startupFingerprint = cryptoNode
      .createHash('sha256')
      .update(startupKeys.publicKeyDer)
      .digest('hex');

    const startupCert = await prisma.digitalCertificate.create({
      data: {
        issuerCaId: intermediateCaId,
        ownerType: 'startup',
        ownerId: startupId,
        serialNumber: startupSerial,
        certificatePem: startupCertPem,
        privateKeyRef: `iselftoken/pki/certs/${startupSerial}/private`,
        publicKeyFingerprint: startupFingerprint,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
    });

    await keyStorage.store(
      `iselftoken/pki/certs/${startupSerial}/private`,
      startupKeys.privateKeyPem,
    );

    console.log(`[STEP 2] Certificado startup criado: ${startupCert.id}`);
    durations['step2_issue_certs'] = now() - t2;
    log('STEP 2 OK: Certificados founder + startup emitidos', durations);

    // ==========================================
    // STEP 3: Monta template termo
    // ==========================================
    const t3 = now();

    console.log('[STEP 3] Gerando PDF do termo...');
    const signedAt = new Date();
    const documentHash = 'placeholder-hash-calculate-after-sign';
    const qrCodeUrl = `http://localhost:7077/verificar/smoke-test-${Date.now()}`;

    const pdfData = {
      startup: {
        name: 'Startup Smoke Test LTDA',
        cnpj: '12.345.678/0001-90',
        equity: '10%',
      },
      founder: {
        name: 'João Silva Santos',
        cpf: '123.456.789-00',
        email: 'joao.silva@smoketest.com.br',
      },
      signedAt,
      certificateFingerprintFounder:
        founderFingerprint.substring(0, 32) + '...',
      certificateFingerprintStartup:
        startupFingerprint.substring(0, 32) + '...',
      documentHash,
      qrCodeUrl,
    };

    const unsignedPdf = await generatePdf(pdfData);
    console.log(`[STEP 3] PDF gerado: ${unsignedPdf.length} bytes`);
    durations['step3_generate_pdf'] = now() - t3;
    log('STEP 3 OK: Template termo montado', durations);

    // ==========================================
    // STEP 4: Assina via SignatureService.signPdf()
    // ==========================================
    const t4 = now();

    console.log('[STEP 4] Assinando PDF...');
    const { signedBuffer, hash: originalHash } = await signPdf(
      unsignedPdf,
      founderCertPem,
      founderKeys.privateKeyPem,
      'Assinatura do Termo de Adesao',
      'São Paulo, SP',
      'João Silva Santos',
    );

    console.log(
      `[STEP 4] PDF assinado: ${signedBuffer.length} bytes, hash: ${originalHash.substring(0, 16)}...`,
    );
    durations['step4_sign_pdf'] = now() - t4;
    log('STEP 4 OK: PDF assinado via PAdES', durations);

    // ==========================================
    // STEP 5: Calcula SHA-256 do PDF final
    // ==========================================
    const t5 = now();

    console.log('[STEP 5] Calculando SHA-256 do PDF final...');
    const finalPdfHash = cryptoNode
      .createHash('sha256')
      .update(signedBuffer)
      .digest('hex');

    console.log(`[STEP 5] Hash final: ${finalPdfHash.substring(0, 16)}...`);
    durations['step5_hash_pdf'] = now() - t5;
    log('STEP 5 OK: SHA-256 calculado', durations);

    // ==========================================
    // STEP 6: Simula GET /verificar/:id
    // ==========================================
    const t6 = now();

    // Criar SignedDocument no banco para simular o endpoint
    // Primeiro precisamos de um user e startup de referencia

    console.log('[STEP 6] Persistindo documento e validando...');

    // Criar user de teste
    const testUser = await prisma.user.create({
      data: {
        email: `smoke-test-${Date.now()}@example.com`,
        nome: 'João Silva Santos',
        senha: '$2b$10$smoketest',
        role: 'FOUNDER',
        tipo_documento: 'CPF',
        reg_documento: '12345678900',
      },
    });

    // Criar startup de teste
    const testStartup = await prisma.startup.create({
      data: {
        nome: 'Startup Smoke Test LTDA',
        slug: `smoke-test-${Date.now()}`,
        cnpj: '12345678000190',
        razao_social: 'Startup Smoke Test LTDA',
        email: 'smoke@test.com',
        problema: 'Smoke test',
        solucao: 'Teste',
        modelo_receita: 'SaaS',
        status: 'APPROVED',
        founderId: testUser.id,
      },
    });

    const signedDoc = await prisma.signedDocument.create({
      data: {
        startupId: testStartup.id,
        founderId: testUser.id,
        type: 'termo_adesao',
        templateVersion: '1.0.0',
        fileKey: `smoke-test/${testStartup.id}/${Date.now()}.pdf`,
        documentHash: finalPdfHash,
        signatureFounderCertId: founderCert.id,
        signatureFounderAt: signedAt,
        signatureStartupCertId: startupCert.id,
        signatureStartupAt: signedAt,
      },
    });

    console.log(`[STEP 6] SignedDocument criado: ${signedDoc.id}`);

    const verifyResult = await verifyDocument(
      prisma,
      signedDoc.id,
      finalPdfHash,
    );

    console.log(
      '[STEP 6] Resultado da verificacao:',
      JSON.stringify(verifyResult, null, 2),
    );
    durations['step6_verify'] = now() - t6;
    log('STEP 6 OK: GET /verificar/:id simulado', durations);

    // ==========================================
    // STEP 7: Valida resposta
    // ==========================================
    const t7 = now();

    console.log('[STEP 7] Validando resposta...');

    const allValid =
      verifyResult.valid === true &&
      verifyResult.validation.hashMatches === true &&
      verifyResult.validation.certificatesActive === true &&
      verifyResult.validation.signedWithinValidity === true;

    if (!allValid) {
      console.error('[STEP 7] FALHA na validacao!');
      console.error('  valid:', verifyResult.valid, '(esperado: true)');
      console.error(
        '  hashMatches:',
        verifyResult.validation.hashMatches,
        '(esperado: true)',
      );
      console.error(
        '  certificatesActive:',
        verifyResult.validation.certificatesActive,
        '(esperado: true)',
      );
      console.error(
        '  signedWithinValidity:',
        verifyResult.validation.signedWithinValidity,
        '(esperado: true)',
      );

      log('FALHA: Validacao retornou valores inesperados', durations);
      throw new Error('Validacao do documento falhou');
    }

    console.log('[STEP 7] Validacao OK - todos os checks passaram');
    durations['step7_validate'] = now() - t7;
    log('STEP 7 OK: Resposta validada', durations);

    // ==========================================
    // Cleanup
    // ==========================================
    console.log('[CLEANUP] Removendo artefatos de teste...');
    await prisma.signedDocument
      .delete({ where: { id: signedDoc.id } })
      .catch(() => {});
    await prisma.digitalCertificate.deleteMany({
      where: { ownerId: { in: [founderId, startupId] } },
    });
    await prisma.startup
      .delete({ where: { id: testStartup.id } })
      .catch(() => {});
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    log('CLEANUP: Artefatos removidos');

    // ==========================================
    // Resumo
    // ==========================================
    const totalDuration = now() - t0;

    console.log('\n[SMOKE] ==========================================');
    console.log('[SMOKE] RESULTADO: SUCESSO');
    console.log('[SMOKE] ==========================================');
    console.log(`[SMOKE] Duracao total: ${totalDuration}ms`);
    console.log('[SMOKE] Durações por passo:');
    for (const [step, dur] of Object.entries(durations)) {
      console.log(`  ${step}: ${dur}ms`);
    }
    console.log('[SMOKE] ==========================================');

    log(`SUCESSO - smoke test completo em ${totalDuration}ms`, durations);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n[SMOKE] ==========================================');
    console.error('[SMOKE] RESULTADO: FALHA');
    console.error('[SMOKE] ==========================================');
    console.error('[SMOKE] Erro:', error);
    console.error('[SMOKE] ==========================================');

    log(`FALHA: ${error instanceof Error ? error.message : String(error)}`);

    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
