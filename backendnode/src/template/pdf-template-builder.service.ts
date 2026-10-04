import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import {
  TERMO_ADESAO_TEMPLATE,
  TermoAdesaoData,
} from './termo-adesao.template';
import Handlebars from 'handlebars';

/**
 * Result of PDF generation.
 */
export interface GenerateTermoPdfResult {
  /** PDF buffer */
  buffer: Buffer;
  /** SHA-256 hash of the PDF content */
  hash: string;
  /** Page count */
  pageCount: number;
}

/**
 * Service for generating PDF documents from templates.
 *
 * @description Generates the Termo de Adesao PDF with legal text,
 * visual signature seal, and QR code placeholder.
 */
@Injectable()
export class PdfTemplateBuilderService {
  private readonly logger = new Logger(PdfTemplateBuilderService.name);

  /**
   * Generates a PDF document from the Termo de Adesao template.
   *
   * @param data - Data to fill the template
   * @returns PDF buffer and metadata
   * @throws {Error} If PDF generation fails
   *
   * @example
   * const result = await pdfTemplateBuilderService.generateTermoPdf({
   *   startup: { name: 'Tech Startup', cnpj: '12.345.678/0001-90', equity: '10%' },
   *   founder: { name: 'Joao Silva', cpf: '***.123.456-**', email: 'joao@startup.com' },
   *   signedAt: new Date(),
   *   certificateFingerprintFounder: 'abc123...',
   *   certificateFingerprintStartup: 'def456...',
   *   documentHash: 'hash...',
   *   qrCodeUrl: 'https://example.com/verify/123',
   *   termoVersao: '1.0'
   * });
   */
  async generateTermoPdf(
    data: TermoAdesaoData,
  ): Promise<GenerateTermoPdfResult> {
    this.logger.debug(
      '[PdfTemplateBuilderService] Generating Termo de Adesao PDF',
    );

    // Compile and render the Handlebars template
    const template = Handlebars.compile(TERMO_ADESAO_TEMPLATE);
    const htmlContent = template({
      ...data,
      signedAt: data.signedAt,
    });

    // Generate PDF
    const pdfBuffer = await this.renderPdf(htmlContent, data);

    // Calculate hash of the PDF
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    this.logger.log('[PdfTemplateBuilderService] PDF generated successfully', {
      size: pdfBuffer.length,
      hash: hash.substring(0, 16) + '...',
    });

    return {
      buffer: pdfBuffer,
      hash,
      pageCount: 0, // PDFKit doesn't provide easy page count without opening
    };
  }

  /**
   * Renders HTML content to PDF using PDFKit.
   *
   * @private
   * @param htmlContent - Rendered HTML content
   * @param data - Original data for seal generation
   * @returns PDF buffer
   */
  private async renderPdf(
    htmlContent: string,
    data: TermoAdesaoData,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: 'Termo de Adesao Digital',
            Author: 'Iselftoken',
            Subject: 'Termo de Adesao ao Sistema de Crowdfunding de Equity',
            Creator: 'Iselftoken Platform',
          },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add content
        this.addContent(doc, htmlContent);

        // Add signature seal on last page
        this.addSignatureSeal(doc, data);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Adds the main content to the PDF.
   *
   * @private
   * @param doc - PDFDocument instance
   * @param content - HTML content to render as plain text
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private addContent(doc: any, content: string): void {
    // Set document font
    doc.font('Helvetica').fontSize(11);

    // Split content into lines and add them
    const lines = content.split('\n');

    for (const line of lines) {
      // Check if we need a new page
      if (doc.y > 700) {
        this.addFooter(doc);
        doc.addPage();
      }

      // Handle headers
      if (line.match(/^[A-Z\s]+$/)) {
        doc.fontSize(14).font('Helvetica-Bold').text(line.trim(), {
          align: 'center',
        });
        doc.font('Helvetica').fontSize(11);
      } else if (line.match(/^\d+\./)) {
        // Section headers
        doc.font('Helvetica-Bold').text(line.trim());
      } else if (line.trim() === '---') {
        // Separator
        doc.moveDown();
      } else if (line.trim()) {
        doc.text(line.trim(), {
          align: 'justify',
          indent: 20,
        });
      } else {
        doc.moveDown();
      }
    }
  }

  /**
   * Adds footer to each page.
   *
   * @private
   * @param doc - PDFDocument instance
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private addFooter(doc: any): void {
    const pageHeight = doc.page.height;
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666666')
      .text(
        'Documento gerado eletronicamente - assinatura digital ICP nao qualificada (Lei 14.063/2020)',
        50,
        pageHeight - 50,
        { align: 'center', width: doc.page.width - 100 },
      );
  }

  /**
   * Adds the visual signature seal to the last page.
   *
   * @private
   * @param doc - PDFDocument instance
   * @param data - Template data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async addSignatureSeal(
    doc: any,
    data: TermoAdesaoData,
  ): Promise<void> {
    // Ensure we're on a new page for the seal
    doc.addPage();

    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;

    // Box background
    const boxY = 150;
    const boxHeight = 380;

    doc.fillColor('#f5f5f5').rect(margin, boxY, contentWidth, boxHeight).fill();

    doc.fillColor('#333333');

    // Title
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Documento Assinado Digitalmente', 0, boxY + 20, {
        align: 'center',
        width: pageWidth,
      });

    // Divider line
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(margin + 50, boxY + 50)
      .lineTo(pageWidth - margin - 50, boxY + 50)
      .stroke();

    // Founder signature info
    const founderLine1 = `Signatario: ${data.founder.name}`;
    const founderLine2 = `CPF: ${data.founder.cpf}`;
    const founderLine3 = `Assinado em: ${this.formatDatePtBr(data.signedAt)}`;

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(founderLine1, margin + 30, boxY + 70, { width: contentWidth - 60 })
      .text(founderLine2, margin + 30, boxY + 90, { width: contentWidth - 60 })
      .text(founderLine3, margin + 30, boxY + 110, {
        width: contentWidth - 60,
      });

    // Divider
    doc
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .moveTo(margin + 50, boxY + 155)
      .lineTo(pageWidth - margin - 50, boxY + 155)
      .stroke();

    // Startup signature info
    const startupLine1 = `Razao Social: ${data.startup.name}`;
    const startupLine2 = `CNPJ: ${data.startup.cnpj}`;
    const startupLine3 = `Equity: ${data.startup.equity}`;

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(startupLine1, margin + 30, boxY + 170, { width: contentWidth - 60 })
      .text(startupLine2, margin + 30, boxY + 190, { width: contentWidth - 60 })
      .text(startupLine3, margin + 30, boxY + 210, {
        width: contentWidth - 60,
      });

    // Divider
    doc
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .moveTo(margin + 50, boxY + 255)
      .lineTo(pageWidth - margin - 50, boxY + 255)
      .stroke();

    // Timestamp
    doc
      .fontSize(10)
      .text(
        `Timestamp ISO-8601: ${data.signedAt.toISOString()}`,
        margin + 30,
        boxY + 310,
        {
          width: contentWidth - 60,
        },
      );

    // QR Code placeholder
    doc
      .fontSize(10)
      .text('QR Code para verificacao:', margin + 30, boxY + 330, {
        width: contentWidth - 60,
      });

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(data.qrCodeUrl, {
        width: 80,
        margin: 1,
      });
      const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      doc.image(qrCodeBuffer, pageWidth - margin - 100, boxY + 320, {
        width: 80,
      });
    } catch {
      // If QR code generation fails, show placeholder text
      doc
        .fillColor('#cccccc')
        .rect(pageWidth - margin - 100, boxY + 320, 80, 80)
        .fill()
        .fillColor('#666666')
        .fontSize(8)
        .text('QR Code', pageWidth - margin - 100, boxY + 355, {
          width: 80,
          align: 'center',
        });
    }

    // Footer text
    doc
      .fillColor('#666666')
      .fontSize(8)
      .text(
        'Este documento foi assinado digitalmente e sua integridade pode ser verificada na pagina de verificacao publica.',
        margin,
        boxY + boxHeight + 20,
        { align: 'center', width: contentWidth },
      );
  }

  /**
   * Formats a date in Brazilian format.
   *
   * @private
   * @param date - Date to format
   * @returns Formatted date string
   */
  private formatDatePtBr(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}

export default PdfTemplateBuilderService;
