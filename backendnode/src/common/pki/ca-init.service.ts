import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IKeyStorageService } from './key-storage/key-storage.interface';
import * as forge from 'node-forge';

export const KEY_STORAGE_SERVICE = 'IKeyStorageService';

/**
 * Constantes de configuracao da CA.
 */
const CA_CONFIG = {
  ROOT: {
    commonName: 'ISELFTOKEN ROOT CA G1',
    organization: 'Iselftoken',
    validityDays: 365 * 10, // 10 anos
    path: 'iselftoken/pki/root/private',
  },
  INTERMEDIATE: {
    commonName: 'ISELFTOKEN INTERMEDIATE CA G1',
    organization: 'Iselftoken',
    validityDays: 365 * 5, // 5 anos
    path: 'iselftoken/pki/intermediate/private',
  },
} as const;

/**
 * Resultado do bootstrap da CA.
 */
export interface CaBootstrapResult {
  rootCa: { id: string; commonName: string; expiresAt: Date };
  intermediateCa: { id: string; commonName: string; expiresAt: Date };
  wasCreated: boolean; // false se CAs ja existiam (idempotencia)
}

/**
 * Implementacao do servico de inicializacao da CA interna.
 *
 * Este servico:
 * - Gera a Root CA (auto-assinada) na primeira execucao
 * - Gera a Intermediate CA (assinada pela Root) na primeira execucao
 * - E idempotente: rodar 2x nao recria CAs ja existentes
 * - Armazena chaves privadas no KeyStorageService (Vault ou stub in-memory)
 *
 * @description Bootstrap da Certificate Authority interna para termo de adesao digital.
 * Algoritmo: RSA 2048 + SHA-256.
 */
@Injectable()
export class CaInitService implements OnModuleInit {
  private readonly logger = new Logger(CaInitService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(KEY_STORAGE_SERVICE)
    @Optional()
    private readonly keyStorage: IKeyStorageService,
  ) {}

  /**
   * Callback executado quando o modulo NestJS inicializa.
   * Verifica se as CAs existem e cria se necessario.
   */
  async onModuleInit(): Promise<void> {
    const result = await this.bootstrap();
    if (result.wasCreated) {
      this.logger.log('[PKI] CAs inicializadas com sucesso');
    }
  }

  /**
   * Verifica se as CAs existem, criando-as se necessario.
   * Metodo idempotente: chamar 2x nao causa duplicacao.
   *
   * @returns CaBootstrapResult com os IDs das CAs e indicador se foram criadas
   */
  async bootstrap(): Promise<CaBootstrapResult> {
    this.logger.log('[PKI] Iniciando bootstrap da CA interna...');

    // Verifica se Root CA ja existe
    const existingRoot = await this.prisma.certificateAuthority.findFirst({
      where: { type: 'root', status: 'active' },
    });

    let rootCa: { id: string; commonName: string; expiresAt: Date };
    let intermediateCa: { id: string; commonName: string; expiresAt: Date };

    if (existingRoot) {
      this.logger.log('[PKI] Root CA ja existe, pulando criacao');
      rootCa = existingRoot;
    } else {
      rootCa = await this.createRootCa();
    }

    // Verifica se Intermediate CA ja existe
    const existingIntermediate =
      await this.prisma.certificateAuthority.findFirst({
        where: { type: 'intermediate', status: 'active' },
      });

    if (existingIntermediate) {
      this.logger.log('[PKI] Intermediate CA ja existe, pulando criacao');
      intermediateCa = existingIntermediate;
    } else {
      intermediateCa = await this.createIntermediateCa(rootCa.id);
    }

    return {
      rootCa,
      intermediateCa,
      wasCreated: !existingRoot || !existingIntermediate,
    };
  }

  /**
   * Gera e persiste a Root CA.
   *
   * @private
   * @returns O registro da Root CA criada
   */
  private async createRootCa(): Promise<{
    id: string;
    commonName: string;
    expiresAt: Date;
  }> {
    this.logger.log('[PKI] Gerando Root CA...');

    // Gerar par de chaves RSA 2048
    const keypair = forge.pki.rsa.generateKeyPair(2048);
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

    // Criar certificado auto-assinado
    const cert = forge.pki.createCertificate();
    cert.publicKey = keypair.publicKey;
    cert.serialNumber = this.generateSerial();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setDate(
      cert.validity.notBefore.getDate() + CA_CONFIG.ROOT.validityDays,
    );

    // Subject e Issuer (sao iguais para Root CA)
    const attrs = [
      { name: 'commonName', value: CA_CONFIG.ROOT.commonName },
      { name: 'organizationName', value: CA_CONFIG.ROOT.organization },
      { name: 'countryName', value: 'BR' },
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // Extensions da Root CA
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
        pathLenConstraint: 1,
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        cRLSign: true,
        digitalSignature: false,
        nonRepudiation: false,
        keyEncipherment: false,
        dataEncipherment: false,
      },
      {
        name: 'subjectKeyIdentifier',
        hash: true,
      },
    ]);

    // Assinar com a propria chave privada
    cert.sign(keypair.privateKey, forge.md.sha256.create());

    const certificatePem = forge.pki.certificateToPem(cert);

    // Armazenar chave privada no KeyStorageService
    await this.keyStorage.store(CA_CONFIG.ROOT.path, privateKeyPem);

    // Persistir no banco
    const rootCa = await this.prisma.certificateAuthority.create({
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

    this.logger.log(`[PKI] Root CA criada: ${rootCa.id}`);
    return rootCa;
  }

  /**
   * Gera e persiste a Intermediate CA.
   *
   * @private
   * @param rootCaId - ID da Root CA para assinatura
   * @returns O registro da Intermediate CA criada
   */
  private async createIntermediateCa(
    rootCaId: string,
  ): Promise<{ id: string; commonName: string; expiresAt: Date }> {
    this.logger.log('[PKI] Gerando Intermediate CA...');

    // Buscar Root CA para assinar
    const rootCaRecord =
      await this.prisma.certificateAuthority.findUniqueOrThrow({
        where: { id: rootCaId },
      });

    // Parse do certificado e chave da Root CA
    const rootCertPem = rootCaRecord.certificatePem;
    const rootPrivateKeyPem = await this.keyStorage.retrieve(
      rootCaRecord.privateKeyRef,
    );

    const rootCert = forge.pki.certificateFromPem(rootCertPem);
    const rootPrivateKey = forge.pki.privateKeyFromPem(rootPrivateKeyPem);

    // Gerar par de chaves para Intermediate CA
    const keypair = forge.pki.rsa.generateKeyPair(2048);
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

    // Criar certificado da Intermediate CA
    const cert = forge.pki.createCertificate();
    cert.publicKey = keypair.publicKey;
    cert.serialNumber = this.generateSerial();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setDate(
      cert.validity.notBefore.getDate() + CA_CONFIG.INTERMEDIATE.validityDays,
    );

    // Subject da Intermediate CA
    const subject = [
      { name: 'commonName', value: CA_CONFIG.INTERMEDIATE.commonName },
      { name: 'organizationName', value: CA_CONFIG.INTERMEDIATE.organization },
      { name: 'countryName', value: 'BR' },
    ];

    // Issuer e a Root CA
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

    // Extensions da Intermediate CA
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
        pathLenConstraint: 0,
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        cRLSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: false,
        dataEncipherment: false,
      },
      {
        name: 'subjectKeyIdentifier',
        hash: true,
      },
      {
        name: 'authorityKeyIdentifier',
        issuer: true,
        keyIdentifier: true,
        serialNumber: true,
      },
    ]);

    // Assinar com a chave privada da Root CA
    cert.sign(rootPrivateKey, forge.md.sha256.create());

    const certificatePem = forge.pki.certificateToPem(cert);

    // Armazenar chave privada no KeyStorageService
    await this.keyStorage.store(CA_CONFIG.INTERMEDIATE.path, privateKeyPem);

    // Persistir no banco
    const intermediateCa = await this.prisma.certificateAuthority.create({
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

    this.logger.log(`[PKI] Intermediate CA criada: ${intermediateCa.id}`);
    return intermediateCa;
  }

  /**
   * Gera um serial number unico para certificados.
   *
   * @private
   * @returns String de serial number hexadecimal
   */
  private generateSerial(): string {
    const bytes = forge.util.bytesToHex(
      forge.util.decode64(forge.util.encode64(String(Date.now()))),
    );
    return bytes.substring(0, 16).toUpperCase();
  }

  /**
   * Recupera os certificados da CA (Root e Intermediate).
   * Util para debugging e verificacao da cadeia.
   *
   * @returns Lista de certificados ativos
   */
  async getActiveCas(): Promise<
    Array<{
      id: string;
      type: string;
      commonName: string;
      certificatePem: string;
      issuedAt: Date;
      expiresAt: Date;
      status: string;
    }>
  > {
    return this.prisma.certificateAuthority.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        type: true,
        commonName: true,
        certificatePem: true,
        issuedAt: true,
        expiresAt: true,
        status: true,
      },
      orderBy: { type: 'asc' },
    });
  }

  /**
   * Verifica se o certificado PEM e valido (parseavel).
   *
   * @param pem - Certificado em formato PEM
   * @returns true se o certificado e valido
   */
  isValidCertificatePem(pem: string): boolean {
    try {
      forge.pki.certificateFromPem(pem);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica se uma chave privada PEM e valida (parseavel).
   *
   * @param pem - Chave privada em formato PEM
   * @returns true se a chave e valida
   */
  isValidPrivateKeyPem(pem: string): boolean {
    try {
      forge.pki.privateKeyFromPem(pem);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica se o certificado expira apos a data especificada.
   *
   * @param pem - Certificado em formato PEM
   * @param minDate - Data minima de expiracao
   * @returns true se o certificado expira apos minDate
   */
  expiresAfter(pem: string, minDate: Date): boolean {
    try {
      const cert = forge.pki.certificateFromPem(pem);
      return cert.validity.notAfter > minDate;
    } catch {
      return false;
    }
  }
}
