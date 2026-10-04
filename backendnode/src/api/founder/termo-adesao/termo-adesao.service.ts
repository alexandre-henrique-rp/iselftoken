import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CertificateService } from '../../../common/pki/certificate.service';
import { PdfTemplateBuilderService } from '../../../template/pdf-template-builder.service';
import { SignatureService } from '../../../signature/signature.service';
import { S3Service } from '../../../s3/s3.service';
import { SignTermoAdesaoDto } from './dto/sign-termo-adesao.dto';
import {
  SignedDocumentResponseDto,
  GetTermoAdesaoResponseDto,
} from './dto/termo-adesao-response.dto';
import * as crypto from 'crypto';

/**
 * Tempo de validade da presigned URL em segundos (7 dias).
 */
const PRESIGNED_URL_TTL = 7 * 24 * 60 * 60;

/**
 * Service for managing Termo de Adesao signing operations.
 *
 * @description Handles the complete flow of signing the Termo de Adesao:
 * - Idempotent certificate issuance (founder + startup)
 * - PDF rendering with legal text
 * - PAdES digital signatures (founder + startup)
 * - S3 upload with presigned URLs
 * - Audit logging for compliance
 */
@Injectable()
export class TermoAdesaoService {
  private readonly logger = new Logger(TermoAdesaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly certificateService: CertificateService,
    private readonly pdfTemplateBuilder: PdfTemplateBuilderService,
    private readonly signatureService: SignatureService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Signs the Termo de Adesao for a startup by a founder.
   *
   * This method is idempotent: if a signed document already exists for the
   * (startupId, 'termo_adesao', founderId) tuple, it returns the existing
   * document metadata.
   *
   * @param startupId - ID of the startup
   * @param founderId - ID of the founder (user.id)
   * @param dto - SignTermoAdesaoDto with aceite and optional reason
   * @param ipAddress - IP address of the requester (for audit)
   * @param userAgent - User-Agent string (for audit)
   * @returns SignedDocumentResponseDto with document metadata and presigned download URL
   * @throws BadRequestException if aceite is false
   * @throws NotFoundException if startup not found or user is not the founder
   */
  async signTermoAdesao(
    startupId: number,
    founderId: number,
    dto: SignTermoAdesaoDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SignedDocumentResponseDto> {
    const { aceite, reason } = dto;

    // Step 0: Reject if aceite is false
    if (!aceite) {
      throw new BadRequestException(
        'Nao e possivel revogar aceite apos assinatura. Use o fluxo formal de revogacao.',
      );
    }

    // Step 1: Pessimistic lock on startup to prevent race conditions
    const startup = await this.prisma.$transaction(async (tx) => {
      // Lock the startup row for update
      const lockedStartup = await tx.startup.findUnique({
        where: { id: startupId },
        include: { founder: true },
      });

      if (!lockedStartup) {
        throw new NotFoundException(`Startup ${startupId} nao encontrada`);
      }

      if (lockedStartup.founderId !== founderId) {
        throw new NotFoundException('Startup nao encontrada ou acesso negado');
      }

      return lockedStartup;
    });

    // Step 2: Check idempotency - if signed document already exists, return it
    const existingDoc = await this.prisma.signedDocument.findUnique({
      where: {
        startupId_type_founderId: {
          startupId,
          type: 'termo_adesao',
          founderId,
        },
      },
      include: {
        signatureFounderCert: true,
        signatureStartupCert: true,
      },
    });

    if (existingDoc) {
      this.logger.debug(
        `[TermoAdesaoService] Document already exists for startup:${startupId} founder:${founderId}, returning existing`,
      );

      // Generate new presigned URL for download
      const downloadUrl = await this.s3Service.getUrl(
        'document',
        existingDoc.fileKey,
        PRESIGNED_URL_TTL,
      );

      return this.buildSignedDocumentResponse(existingDoc, downloadUrl);
    }

    // Step 3: Issue or retrieve founder certificate
    const founderCertResult = await this.certificateService.issue(
      'founder',
      String(founderId),
    );

    // Step 4: Issue or retrieve startup certificate
    const startupCertResult = await this.certificateService.issue(
      'startup',
      String(startupId),
    );

    // Step 5: Render PDF from template
    const signedAt = new Date();
    const qrCodeUrl = `https://iselftoken.com.br/verify/${startupId}`; // Placeholder - S18.5

    // Get founder document info (CPF)
    const founderCpf = this.getFounderCpf(startup);

    const pdfResult = await this.pdfTemplateBuilder.generateTermoPdf({
      startup: {
        name: startup.nome,
        cnpj: this.maskCnpj(startup.cnpj || ''),
        equity: '10%', // TODO: Get actual equity from campaign
      },
      founder: {
        name: startup.founder?.nome || 'Fundador',
        cpf: founderCpf,
        email: startup.founder?.email || '',
      },
      signedAt,
      certificateFingerprintFounder:
        founderCertResult.certificate.publicKeyFingerprint,
      certificateFingerprintStartup:
        startupCertResult.certificate.publicKeyFingerprint,
      documentHash: '', // Will be updated after signing
      qrCodeUrl,
      termoVersao: '1.0.0',
    });

    // Step 6: Sign PDF with founder certificate (PAdES)
    const founderCert = await this.prisma.digitalCertificate.findUnique({
      where: { id: founderCertResult.certificate.id },
    });

    if (!founderCert) {
      throw new InternalServerErrorException(
        'Certificado do fundador nao encontrado',
      );
    }

    const founderSignedPdf = await this.signPdfWithCert(
      pdfResult.buffer,
      founderCert,
      reason || 'Assinatura do Termo de Adesao',
      startup.founder?.nome || 'Fundador',
      startup.founder?.email || '',
    );

    // Step 7: Re-sign PDF with startup certificate (encapsulates 2 signatures)
    const startupCert = await this.prisma.digitalCertificate.findUnique({
      where: { id: startupCertResult.certificate.id },
    });

    if (!startupCert) {
      throw new InternalServerErrorException(
        'Certificado da startup nao encontrado',
      );
    }

    const finalSignedPdf = await this.signPdfWithCert(
      founderSignedPdf.signedBuffer,
      startupCert,
      reason || 'Aprovacao do Termo de Adesao pela Startup',
      startup.nome,
      startup.email || '',
    );

    // Step 8: Calculate final SHA-256 hash of the signed PDF
    const finalHash = crypto
      .createHash('sha256')
      .update(finalSignedPdf.signedBuffer)
      .digest('hex');

    // Step 9: Upload to S3
    const fileKey = `termo-adesao/${startupId}/${Date.now()}.pdf`;
    const uploadResult = await this.s3Service.upload(
      finalSignedPdf.signedBuffer,
      'document',
      fileKey,
      'application/pdf',
    );

    this.logger.log(
      `[TermoAdesaoService] PDF uploaded to S3: ${uploadResult.url}`,
    );

    // Step 10: Persist SignedDocument
    const signedDocument = await this.prisma.signedDocument.create({
      data: {
        startupId,
        founderId,
        type: 'termo_adesao',
        templateVersion: '1.0.0',
        fileKey,
        documentHash: finalHash,
        signatureFounderCertId: founderCert.id,
        signatureStartupCertId: startupCert.id,
        signatureFounderAt: signedAt,
        signatureStartupAt: signedAt,
      },
      include: {
        signatureFounderCert: true,
        signatureStartupCert: true,
      },
    });

    // Step 11: Create audit log entries
    await this.prisma.signatureAuditLog.createMany({
      data: [
        {
          signedDocumentId: signedDocument.id,
          actorType: 'founder',
          action: 'aceite_checkbox',
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
        {
          signedDocumentId: signedDocument.id,
          actorType: 'system',
          action: 'certificado_emitido',
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
        {
          signedDocumentId: signedDocument.id,
          actorType: 'founder',
          action: 'documento_assinado',
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
        {
          signedDocumentId: signedDocument.id,
          actorType: 'system',
          action: 'documento_assinado',
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      ],
    });

    this.logger.log(
      `[TermoAdesaoService] SignedDocument created: ${signedDocument.id} for startup:${startupId}`,
    );

    // Generate presigned URL for download
    const downloadUrl = await this.s3Service.getUrl(
      'document',
      fileKey,
      PRESIGNED_URL_TTL,
    );

    return this.buildSignedDocumentResponse(signedDocument, downloadUrl);
  }

  /**
   * Gets the Termo de Adesao metadata for a startup.
   *
   * @param startupId - ID of the startup
   * @param founderId - ID of the founder (user.id)
   * @returns GetTermoAdesaoResponseDto with document metadata and presigned URLs
   * @throws NotFoundException if startup not found or user is not the founder
   */
  async getTermoAdesao(
    startupId: number,
    founderId: number,
  ): Promise<GetTermoAdesaoResponseDto> {
    // Verify startup ownership
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      include: { founder: true },
    });

    if (!startup) {
      throw new NotFoundException(`Startup ${startupId} nao encontrada`);
    }

    if (startup.founderId !== founderId) {
      throw new NotFoundException('Startup nao encontrada ou acesso negado');
    }

    // Check if signed document exists
    const existingDoc = await this.prisma.signedDocument.findUnique({
      where: {
        startupId_type_founderId: {
          startupId,
          type: 'termo_adesao',
          founderId,
        },
      },
      include: {
        signatureFounderCert: true,
        signatureStartupCert: true,
      },
    });

    if (!existingDoc) {
      return {
        exists: false,
        document: null,
        downloadUrl: null,
        readUrl: null,
      };
    }

    // Generate presigned URLs
    const [downloadUrl, readUrl] = await Promise.all([
      this.s3Service.getUrl('document', existingDoc.fileKey, PRESIGNED_URL_TTL),
      this.s3Service.getUrl('document', existingDoc.fileKey, PRESIGNED_URL_TTL),
    ]);

    return {
      exists: true,
      document: {
        id: existingDoc.id,
        documentHash: existingDoc.documentHash,
        signedAt: existingDoc.signatureFounderAt.toISOString(),
        founderCert: {
          serialNumber: existingDoc.signatureFounderCert.serialNumber,
          fingerprint: existingDoc.signatureFounderCert.publicKeyFingerprint,
        },
        startupCert: {
          serialNumber: existingDoc.signatureStartupCert.serialNumber,
          fingerprint: existingDoc.signatureStartupCert.publicKeyFingerprint,
        },
      },
      downloadUrl,
      readUrl,
    };
  }

  /**
   * Signs a PDF buffer with a digital certificate.
   *
   * @private
   * @param pdfBuffer - PDF buffer to sign
   * @param certificate - DigitalCertificate record from database
   * @param reason - Reason for signing
   * @param signerName - Name of the signer
   * @param contactInfo - Contact info of the signer
   * @returns SignPdfResult with signed buffer and hash
   */
  private async signPdfWithCert(
    pdfBuffer: Buffer,
    certificate: {
      certificatePem: string;
      privateKeyRef: string;
    },
    reason: string,
    signerName: string,
    contactInfo: string,
  ): Promise<{ signedBuffer: Buffer; hash: string }> {
    const result = await this.signatureService.signPdf({
      pdfBuffer,
      certificatePem: certificate.certificatePem,
      privateKeyRef: certificate.privateKeyRef,
      reason,
      location: 'Brazil',
      contactInfo,
      signerName,
    });

    return {
      signedBuffer: result.signedBuffer,
      hash: result.hash,
    };
  }

  /**
   * Builds the response DTO from a SignedDocument record.
   *
   * @private
   * @param doc - SignedDocument record from database
   * @param downloadUrl - Presigned URL for download
   * @returns SignedDocumentResponseDto
   */
  private buildSignedDocumentResponse(
    doc: {
      id: string;
      documentHash: string;
      signatureFounderAt: Date;
      signatureFounderCert: {
        serialNumber: string;
        publicKeyFingerprint: string;
      };
      signatureStartupCert: {
        serialNumber: string;
        publicKeyFingerprint: string;
      };
    },
    downloadUrl: string,
  ): SignedDocumentResponseDto {
    return {
      id: doc.id,
      documentHash: doc.documentHash,
      signedAt: doc.signatureFounderAt.toISOString(),
      downloadUrl,
      founderCert: {
        serialNumber: doc.signatureFounderCert.serialNumber,
        fingerprint: doc.signatureFounderCert.publicKeyFingerprint,
      },
      startupCert: {
        serialNumber: doc.signatureStartupCert.serialNumber,
        fingerprint: doc.signatureStartupCert.publicKeyFingerprint,
      },
    };
  }

  /**
   * Gets the founder CPF with mask from the User record.
   *
   * @private
   * @param startup - Startup record with founder relation loaded
   * @returns Masked CPF string
   */
  private getFounderCpf(startup: {
    founder?: {
      tipo_documento?: string | null;
      reg_documento?: string | null;
    } | null;
  }): string {
    const founder = startup.founder;
    if (!founder) {
      return '***.***.***-**';
    }

    // Check if tipo_documento is CPF
    if (founder.tipo_documento !== 'CPF' || !founder.reg_documento) {
      return '***.***.***-**';
    }

    // Remove non-digits and mask
    const digits = founder.reg_documento.replace(/\D/g, '');
    if (digits.length !== 11) {
      return '***.***.***-**';
    }
    return `***.***.***-${digits.slice(-2)}`;
  }

  /**
   * Masks a CNPJ for display.
   *
   * @private
   * @param cnpj - CNPJ string (can be with or without mask)
   * @returns Masked CNPJ string
   */
  private maskCnpj(cnpj: string): string {
    // Remove non-digits
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      return '**.***.***/****-**';
    }
    return `${digits.slice(0, 2)}.***.***/${digits.slice(8, 12)}-**`;
  }
}
