import { Inject, Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { IObjectStorageProvider } from 'src/common/storage/object-storage.interface';
import { OBJECT_STORAGE_PROVIDER } from 'src/common/storage/storage-provider.module';
import { PrismaService } from 'src/prisma/prisma.service';

/** Bucket onde os certificados PDF ficam guardados. */
const CERT_BUCKET = 'document' as const;
/** Validade da presigned URL de download (7 dias). */
const PRESIGNED_TTL = 7 * 24 * 60 * 60;

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    v,
  );

const dataPtBr = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * Emite o certificado PDF de um lote de tokens (1 certificado por
 * investimento, cobrindo as N unidades emitidas). Guarda a chave do arquivo
 * em `Token.certificate` de todas as unidades do lote. A verificação pública
 * usa o hash de qualquer token do lote.
 */
@Injectable()
export class TokenCertificateService {
  private readonly logger = new Logger(TokenCertificateService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE_PROVIDER)
    private readonly storage: IObjectStorageProvider,
  ) {}

  /**
   * Gera (ou reaproveita) o certificado do investimento. Idempotente: se os
   * tokens já têm `certificate`, devolve a chave existente sem regerar.
   */
  async generateForInvestment(
    investmentId: number,
  ): Promise<{ fileKey: string; alreadyExisted: boolean } | null> {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        user: { select: { id: true, nome: true, email: true } },
        campaign: {
          select: {
            title: true,
            tokenPrice: true,
            startup: { select: { nome: true, area_atuacao: true } },
          },
        },
      },
    });
    if (!investment) {
      this.logger.warn(
        `Investimento ${investmentId} não encontrado para certificado`,
      );
      return null;
    }

    const tokens = await this.prisma.token.findMany({
      where: { investmentId },
      orderBy: { dtAquisicao: 'asc' },
      select: { id: true, hash: true, certificate: true, dtAquisicao: true },
    });
    if (tokens.length === 0) {
      this.logger.warn(`Sem tokens emitidos para investimento ${investmentId}`);
      return null;
    }

    // Idempotência: certificado já emitido.
    const jaEmitido = tokens.find((t) => t.certificate);
    if (jaEmitido?.certificate) {
      return { fileKey: jaEmitido.certificate, alreadyExisted: true };
    }

    // O hash de referência (verificação pública) é o do primeiro token do lote.
    const refHash = tokens[0].hash;
    const emitidoEm = tokens[0].dtAquisicao ?? new Date();
    const tokenPrice = Number(investment.campaign.tokenPrice);
    const quantidade = tokens.length;

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const verifyUrl = `${frontendUrl.replace(/\/$/, '')}/verificar-token/${refHash}`;

    const pdf = await this.buildPdf({
      investorName: investment.user.nome,
      startupName: investment.campaign.startup.nome,
      startupArea: investment.campaign.startup.area_atuacao,
      campaignTitle: investment.campaign.title,
      quantidade,
      tokenPrice,
      total: tokenPrice * quantidade,
      emitidoEm,
      refHash,
      verifyUrl,
    });

    const fileKey = `token-certificates/inv-${investmentId}-${Date.now()}.pdf`;
    await this.storage.upload({
      file: pdf,
      bucket: CERT_BUCKET,
      key: fileKey,
      contentType: 'application/pdf',
    });

    await this.prisma.token.updateMany({
      where: { investmentId },
      data: { certificate: fileKey },
    });

    this.logger.log(
      `Certificado emitido para investimento ${investmentId} (${quantidade} tokens): ${fileKey}`,
    );
    return { fileKey, alreadyExisted: false };
  }

  /** Presigned URL de download do certificado a partir da fileKey guardada. */
  async getDownloadUrl(fileKey: string): Promise<string> {
    return this.storage.getPresignedUrl(CERT_BUCKET, fileKey, PRESIGNED_TTL);
  }

  /**
   * Monta o PDF do certificado com PDFKit. Layout próprio (não depende do
   * template do termo de adesão): cabeçalho, dados do investidor/startup,
   * quadro de posição, hash de referência e QR de verificação.
   */
  private async buildPdf(data: {
    investorName: string;
    startupName: string;
    startupArea: string | null;
    campaignTitle: string;
    quantidade: number;
    tokenPrice: number;
    total: number;
    emitidoEm: Date;
    refHash: string;
    verifyUrl: string;
  }): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Certificado de Tokens - iSelfToken',
        Author: 'iSelfToken',
        Subject: `Certificado de titularidade de tokens - ${data.startupName}`,
        Creator: 'iSelfToken Platform',
      },
    });

    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;
    const roxo = '#7c3aed';
    const cinza = '#555555';

    // Cabeçalho
    doc
      .fillColor(roxo)
      .font('Helvetica-Bold')
      .fontSize(26)
      .text('iSelfToken', margin, 55);
    doc
      .fillColor('#999999')
      .font('Helvetica')
      .fontSize(9)
      .text('CERTIFICADO DIGITAL DE TITULARIDADE DE TOKENS', margin, 88);
    doc
      .strokeColor(roxo)
      .lineWidth(2)
      .moveTo(margin, 108)
      .lineTo(pageWidth - margin, 108)
      .stroke();

    // Título
    doc
      .fillColor('#111111')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('Certificado de Tokens', margin, 135, {
        align: 'center',
        width: contentWidth,
      });
    doc
      .fillColor(cinza)
      .font('Helvetica')
      .fontSize(11)
      .text(
        `Este documento atesta a titularidade dos tokens abaixo, adquiridos na plataforma iSelfToken.`,
        margin,
        168,
        { align: 'center', width: contentWidth },
      );

    // Bloco de dados
    let y = 215;
    const linha = (label: string, valor: string) => {
      doc
        .fillColor('#888888')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(label.toUpperCase(), margin, y);
      doc
        .fillColor('#111111')
        .font('Helvetica')
        .fontSize(13)
        .text(valor, margin, y + 12);
      y += 44;
    };
    linha('Investidor', data.investorName);
    linha(
      'Startup',
      data.startupArea
        ? `${data.startupName}  ·  ${data.startupArea}`
        : data.startupName,
    );
    linha('Rodada / Campanha', data.campaignTitle);

    // Quadro de posição
    const boxY = y + 5;
    const boxH = 90;
    doc.fillColor('#f4f0ff').rect(margin, boxY, contentWidth, boxH).fill();
    doc
      .strokeColor(roxo)
      .lineWidth(1)
      .rect(margin, boxY, contentWidth, boxH)
      .stroke();
    const col = contentWidth / 3;
    const celula = (i: number, label: string, valor: string) => {
      const cx = margin + col * i;
      doc
        .fillColor('#888888')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(label.toUpperCase(), cx + 12, boxY + 20, { width: col - 24 });
      doc
        .fillColor(roxo)
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(valor, cx + 12, boxY + 38, { width: col - 24 });
    };
    celula(0, 'Tokens', String(data.quantidade));
    celula(1, 'Preço unitário', brl(data.tokenPrice));
    celula(2, 'Valor total', brl(data.total));

    // Rodapé de autenticação
    y = boxY + boxH + 35;
    doc
      .strokeColor('#dddddd')
      .lineWidth(0.5)
      .moveTo(margin, y)
      .lineTo(pageWidth - margin, y)
      .stroke();
    y += 15;
    doc
      .fillColor('#888888')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('CÓDIGO DE VERIFICAÇÃO (HASH DO TOKEN)', margin, y);
    doc
      .fillColor('#111111')
      .font('Courier')
      .fontSize(9)
      .text(data.refHash, margin, y + 13, { width: contentWidth - 130 });
    doc
      .fillColor('#888888')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('EMITIDO EM', margin, y + 40);
    doc
      .fillColor('#111111')
      .font('Helvetica')
      .fontSize(11)
      .text(dataPtBr(data.emitidoEm), margin, y + 53);

    // QR de verificação
    try {
      const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
        width: 110,
        margin: 1,
      });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrBuffer, pageWidth - margin - 110, y + 5, { width: 110 });
      doc
        .fillColor('#888888')
        .font('Helvetica')
        .fontSize(8)
        .text('Verifique a autenticidade', pageWidth - margin - 130, y + 118, {
          width: 150,
          align: 'center',
        });
    } catch {
      // sem QR: segue sem bloquear a emissão
    }

    // Nota legal
    doc
      .fillColor('#999999')
      .font('Helvetica')
      .fontSize(8)
      .text(
        'Documento gerado eletronicamente pela plataforma iSelfToken. A autenticidade pode ser verificada publicamente pelo código de verificação (hash) acima. Tokens de equity crowdfunding sujeitos à Resolução CVM 88/2022.',
        margin,
        doc.page.height - 90,
        { align: 'center', width: contentWidth },
      );

    doc.end();
    return done;
  }
}
