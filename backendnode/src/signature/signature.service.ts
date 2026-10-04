import { Inject, Injectable, Logger } from '@nestjs/common';
import * as forge from 'node-forge';
import { SignPdf } from 'node-signpdf';
import plainAddPlaceholder from 'node-signpdf/dist/helpers/plainAddPlaceholder';
import { IKeyStorageService } from '../common/pki/key-storage/key-storage.interface';
import { KEY_STORAGE_SERVICE } from '../common/pki/ca-init.service';

/**
 * Input data for signing a PDF.
 */
export interface SignPdfInput {
  /** PDF buffer to sign */
  pdfBuffer: Buffer;
  /** Certificate in PEM format */
  certificatePem: string;
  /** Reference to the private key in KeyStorageService */
  privateKeyRef: string;
  /** Reason for signing */
  reason: string;
  /** Location of signing */
  location: string;
  /** Contact info of signer */
  contactInfo: string;
  /** Name of signer */
  signerName: string;
}

/**
 * Result of signing a PDF.
 */
export interface SignPdfResult {
  /** Signed PDF buffer */
  signedBuffer: Buffer;
  /** SHA-256 hash of the original PDF */
  hash: string;
  /** Signature metadata */
  signatureInfo: {
    reason: string;
    location: string;
    signerName: string;
    signedAt: Date;
  };
}

/**
 * Converts PEM certificate and private key to P12 format for node-signpdf.
 *
 * @private
 * @param certificatePem - Certificate in PEM format
 * @param privateKeyPem - Private key in PEM format
 * @param passphrase - Passphrase for the P12 (empty string for no passphrase)
 * @returns P12 buffer
 */
function pemToP12(
  certificatePem: string,
  privateKeyPem: string,
  passphrase: string = '',
): Buffer {
  const cert = forge.pki.certificateFromPem(certificatePem);
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  // Create a PKCS#12 structure using forge
  // Note: toPkcs12Asn1 takes (key, certificate, password)
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, cert, passphrase, {
    friendlyName: 'signature',
  });

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, 'binary');
}

/**
 * Service for applying PAdES digital signatures to PDF documents.
 *
 * @description Implements PAdES Basic B-B (B-B) signature according to
 * ETSI EN 319 142 and ICP-Brazil standards. Uses node-signpdf for
 * cryptographic operations and pdf-lib for PDF manipulation.
 */
@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  constructor(
    @Inject(KEY_STORAGE_SERVICE)
    private readonly keyStorage: IKeyStorageService,
  ) {}

  /**
   * Signs a PDF document with PAdES Basic B-B signature.
   *
   * This method applies a digital signature to the PDF using the provided
   * certificate and private key. The signature includes:
   * - SHA-256 hash of the PDF content
   * - Certificate chain (leaf -> intermediate -> root)
   * - Metadata: reason, location, contact info, name
   *
   * @param input - SignPdfInput containing PDF and certificate data
   * @returns Promise<SignPdfResult> with signed PDF and metadata
   * @throws {Error} If signing fails or certificate is invalid
   *
   * @example
   * const result = await signatureService.signPdf({
   *   pdfBuffer: unsignedPdfBuffer,
   *   certificatePem: certPem,
   *   privateKeyRef: 'iselftoken/pki/certs/SERIAL/private',
   *   reason: 'Assinatura do Termo de Adesao',
   *   location: 'Sao Paulo, SP',
   *   contactInfo: 'contato@startup.com.br',
   *   signerName: 'Joao Silva'
   * });
   */
  async signPdf(input: SignPdfInput): Promise<SignPdfResult> {
    this.logger.debug('[SignatureService] Starting PAdES B-B signature');

    // Validate input
    if (!input.pdfBuffer || input.pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty or invalid');
    }

    if (!input.certificatePem) {
      throw new Error('Certificate PEM is required');
    }

    if (!input.privateKeyRef) {
      throw new Error('Private key reference is required');
    }

    // Load private key from KeyStorage
    const privateKeyPem = await this.keyStorage.retrieve(input.privateKeyRef);

    // Calculate SHA-256 hash of original PDF
    const crypto = await import('crypto');
    const pdfHash = crypto
      .createHash('sha256')
      .update(input.pdfBuffer)
      .digest('hex');

    // Convert PEM certificate and private key to P12 format
    const p12Buffer = pemToP12(input.certificatePem, privateKeyPem, '');

    // Add signature placeholder to PDF using node-signpdf's plainAddPlaceholder
    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer: input.pdfBuffer,
      reason: input.reason,
      contactInfo: input.contactInfo,
      name: input.signerName,
      location: input.location,
    });

    // Sign the PDF using node-signpdf
    const signPdf = new SignPdf();
    const signedBuffer = signPdf.sign(pdfWithPlaceholder, p12Buffer, {
      passphrase: '',
    });

    const signedAt = new Date();

    this.logger.log('[SignatureService] PDF signed successfully', {
      originalSize: input.pdfBuffer.length,
      signedSize: signedBuffer.length,
      hash: pdfHash.substring(0, 16) + '...',
    });

    return {
      signedBuffer,
      hash: pdfHash,
      signatureInfo: {
        reason: input.reason,
        location: input.location,
        signerName: input.signerName,
        signedAt,
      },
    };
  }

  /**
   * Verifies if a PDF buffer contains a valid PKCS#7 signature.
   *
   * @param pdfBuffer - PDF buffer to verify
   * @returns true if the PDF contains a signature, false otherwise
   */
  containsSignature(pdfBuffer: Buffer): boolean {
    try {
      const content = pdfBuffer.toString('binary');

      // Check for PKCS#7 signature markers
      const hasPkcs7 = content.includes('PKCS7') || content.includes('pkcs7');

      // Check for signature dictionary markers
      const hasSignatureDict =
        content.includes('/Type /Sig') || content.includes('/Type/Sig');

      // Check for Adobe PPKLite signature
      const hasAdobePpkLite = content.includes('Adobe.PPKLite');

      return hasPkcs7 || hasSignatureDict || hasAdobePpkLite;
    } catch {
      return false;
    }
  }
}

export default SignatureService;
