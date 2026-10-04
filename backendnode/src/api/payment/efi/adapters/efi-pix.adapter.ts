import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EfiBaseClient } from '../efi-base.client';
import { EfiSdkClient } from '../efi-sdk.client';
import { EfiPixResponse, EfiPixStatus } from '../entities/efi.types';

/**
 * Adapter 3: EFI PIX Direct API (via SDK oficial `sdk-node-apis-efi`)
 *
 * Responsibilities:
 * - Create immediate PIX transactions (pixCreateImmediateCharge)
 * - Generate the QR Code image + copy-paste payload (pixGenerateQRCode)
 * - Query PIX transaction status (pixDetailCharge)
 * - Handle PIX refunds (devolution)
 *
 * O SDK cuida do mTLS (.p12), do OAuth e do endpoint correto (homologação
 * vs produção). Ver `EfiSdkClient`.
 *
 * API Docs: https://dev.efipay.com.br/docs/api-pix
 */
@Injectable()
export class EfiPixAdapter {
  private readonly logger = new Logger(EfiPixAdapter.name);

  constructor(
    private readonly baseClient: EfiBaseClient,
    private readonly sdkClient: EfiSdkClient,
  ) {}

  /**
   * Cria uma cobrança PIX imediata e já gera o QR Code + copia-e-cola.
   *
   * Fluxo EFI:
   *   1. `pixCreateImmediateCharge` → cria a cobrança, retorna txid + loc.id.
   *   2. `pixGenerateQRCode({ id: loc.id })` → retorna `qrcode` (copia-e-cola)
   *      e `imagemQrcode` (data URI base64 da imagem).
   *
   * @param params PIX transaction parameters
   * @returns EfiPixResponse com txid, pixCopiaECola e qrCodeImage
   */
  async createPix(params: {
    amount: string;
    payerName: string;
    payerCpf?: string;
    payerCnpj?: string;
    payerEmail?: string;
    expirationSeconds?: number;
    infoPagar?: string;
  }): Promise<EfiPixResponse> {
    const {
      amount,
      payerName,
      payerCpf,
      payerCnpj,
      payerEmail,
      expirationSeconds = 3600, // 1 hour default
      infoPagar,
    } = params;

    if (this.sdkClient.isMock) {
      return this.mockPixResponse(amount);
    }

    const efipay = this.sdkClient.getClient();

    // Sanitiza documento: EFI aceita apenas dígitos em cpf/cnpj.
    const cpf = payerCpf?.replace(/\D/g, '');
    const cnpj = payerCnpj?.replace(/\D/g, '');

    // Guard obrigatório (BACEN/LGPD): PIX exige identificação do pagador.
    // Sem cpf/cnpj, a EFI recusa a cobrança inteira com erro 3500010
    // apontando .body.devedor.cpf / .body.devedor.cnpj — devolvemos 422
    // com mensagem PT-BR antes de bater no gateway para UX clara.
    if (!cpf && !cnpj) {
      throw new UnprocessableEntityException({
        code: 'pix_payer_doc_required',
        message:
          'Para pagar por PIX é obrigatório ter CPF ou CNPJ cadastrado no perfil.',
      });
    }

    const body = {
      calendario: { expiracao: expirationSeconds },
      valor: { original: amount },
      chave: this.sdkClient.pixKey,
      devedor: {
        nome: payerName,
        ...(cnpj ? { cnpj } : cpf ? { cpf } : {}),
        ...(payerEmail && { email: payerEmail }),
      },
      ...(infoPagar && { solicitacaoPagador: infoPagar }),
    };

    // 1. Cria a cobrança imediata.
    const cob: any = await efipay.pixCreateImmediateCharge(body as any);

    const locId: number | undefined = cob?.loc?.id;
    let pixCopiaECola: string | undefined = cob?.pixCopiaECola;
    let qrCodeImage: string | undefined;

    // 2. Gera o QR Code (imagem base64 + copia-e-cola) a partir do loc.id.
    if (locId != null) {
      try {
        const qr: any = await efipay.pixGenerateQRCode({ id: locId });
        qrCodeImage = qr?.imagemQrcode;
        pixCopiaECola = qr?.qrcode ?? pixCopiaECola;
      } catch (error) {
        this.logger.warn(
          `Cobrança ${cob?.txid} criada, mas falhou ao gerar QR Code (loc=${locId}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `PIX criado txid=${cob?.txid} status=${cob?.status} qr=${qrCodeImage ? 'ok' : 'ausente'}`,
    );

    return {
      txid: cob?.txid,
      status: (cob?.status as EfiPixStatus) ?? 'ATIVA',
      calendario: {
        criacao: cob?.calendario?.criacao,
        expiracao: cob?.calendario?.expiracao ?? expirationSeconds,
      },
      valor: { original: cob?.valor?.original ?? amount },
      chave: cob?.chave ?? this.sdkClient.pixKey,
      location: cob?.loc?.location,
      locId,
      pixCopiaECola,
      qrCodeImage,
    };
  }

  /**
   * Consulta uma cobrança PIX pelo txid (pixDetailCharge).
   */
  async getPix(txid: string): Promise<EfiPixResponse> {
    if (this.sdkClient.isMock) {
      return this.mockPixResponse('99.99');
    }

    const efipay = this.sdkClient.getClient();
    const cob: any = await efipay.pixDetailCharge({ txid });

    return {
      txid: cob?.txid ?? txid,
      status: (cob?.status as EfiPixStatus) ?? 'ATIVA',
      calendario: {
        criacao: cob?.calendario?.criacao,
        expiracao: cob?.calendario?.expiracao ?? 3600,
      },
      valor: { original: cob?.valor?.original ?? '0.00' },
      chave: cob?.chave,
      location: cob?.loc?.location,
      locId: cob?.loc?.id,
      pixCopiaECola: cob?.pixCopiaECola,
      pix: cob?.pix,
    };
  }

  /**
   * Cancela uma cobrança PIX imediata ainda ativa.
   *
   * A EFI representa a remoção pelo recebedor com um PATCH na cobrança,
   * usando o status REMOVIDA_PELO_USUARIO_RECEBEDOR. Este método é usado
   * antes de substituir a cobrança quando o valor do pagamento muda.
   */
  async cancelPix(txid: string): Promise<{
    txid: string;
    status: EfiPixStatus;
  }> {
    if (this.sdkClient.isMock) {
      return {
        txid,
        status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR',
      };
    }

    const efipay = this.sdkClient.getClient();
    const cob: any = await efipay.pixUpdateCharge(
      { txid },
      { status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR' },
    );

    return {
      txid: cob?.txid ?? txid,
      status:
        (cob?.status as EfiPixStatus) ?? 'REMOVIDA_PELO_USUARIO_RECEBEDOR',
    };
  }

  /**
   * Retrieves PIX transactions received within a date range.
   */
  async listReceivedPix(params: {
    startDate: string; // ISO date
    endDate: string; // ISO date
    page?: number;
    pageSize?: number;
  }): Promise<{
    parametros: { inicio: string; fim: string };
    pix: Array<{
      txid: string;
      valor: string;
      horario: string;
      endToEndId: string;
    }>;
  }> {
    if (this.baseClient.isMock) {
      return {
        parametros: {
          inicio: params.startDate,
          fim: params.endDate,
        },
        pix: [],
      };
    }

    const { startDate, endDate, page = 1, pageSize = 100 } = params;
    const query = new URLSearchParams({
      inicio: startDate,
      fim: endDate,
      pagina: String(page),
      elementos: String(pageSize),
    });

    return this.baseClient.request<{
      parametros: { inicio: string; fim: string };
      pix: Array<{
        txid: string;
        valor: string;
        horario: string;
        endToEndId: string;
      }>;
    }>(`/v2/pix?${query.toString()}`);
  }

  /**
   * Requests a PIX refund (devolução).
   *
   * @param e2eId End-to-end ID from the original PIX transaction
   * @param amount Amount to refund (partial or full)
   */
  async refundPix(params: {
    e2eId: string;
    amount: string;
    refundType?: 'partial' | 'full';
  }): Promise<{
    id: string;
    status: string;
    valor: string;
  }> {
    const { e2eId, amount } = params;

    if (this.baseClient.isMock) {
      return {
        id: `dev_${Date.now()}`,
        status: 'ACEITA',
        valor: amount,
      };
    }

    const devolutionId = this.baseClient.generateTxid();

    return this.baseClient.request(
      `/v2/pix/${e2eId}/devolucao/${devolutionId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          valor: amount,
        }),
      },
    );
  }

  /**
   * Gets refund status.
   */
  async getRefundStatus(
    e2eId: string,
    devolutionId: string,
  ): Promise<{
    id: string;
    status: string;
    valor: string;
  }> {
    if (this.baseClient.isMock) {
      return {
        id: devolutionId,
        status: 'COMPLETA',
        valor: '99.99',
      };
    }

    return this.baseClient.request(
      `/v2/pix/${e2eId}/devolucao/${devolutionId}`,
    );
  }

  private mockPixResponse(amount: string): EfiPixResponse {
    const txid = this.baseClient.generateTxid();
    // BR Code EMV fake (formato copia-e-cola) só para dev/testes.
    const pixCopiaECola = `00020126360014BR.GOV.BCB.PIX0114${txid}520400005303986540${amount}5802BR5913ISELFTOKEN LT6009SAO PAULO62070503***6304MOCK`;
    // PNG 1x1 transparente base64 como placeholder de imagem de QR.
    const qrCodeImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
    return {
      txid,
      status: 'ATIVA',
      calendario: {
        criacao: new Date().toISOString(),
        expiracao: 3600,
      },
      valor: {
        original: amount,
      },
      chave: this.baseClient.config.pixKey,
      location: `https://pix.example.com/${txid}`,
      locId: Math.floor(Math.random() * 100000),
      pixCopiaECola,
      qrCodeImage,
    };
  }

  // ============================================================
  // B12: Repasse de fundos (Transferência bancária PIX)
  // ============================================================

  /**
   * @description Transfere fundos via PIX direto (B12 - repasse de fundos).
   * @param input Dados da transferência
   * @returns txId EFI + status
   */
  async transferBancario(input: {
    amount: number;
    destinationAccount: {
      bankCode: string;
      agency: string;
      account: string;
      accountType: 'CHECKING' | 'SAVINGS';
      holderName: string;
      holderDocument: string;
    };
    description?: string;
    type?: 'PIX' | 'TED';
  }): Promise<{
    txId: string;
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
    estimatedCompletion?: Date;
  }> {
    if (this.baseClient.isMock) {
      this.logger.log(
        `[MOCK] EFI transferBancario: amount=${input.amount} to=${input.destinationAccount.holderName}`,
      );
      return {
        txId: `EFI-MOCK-TRANSFER-${Date.now()}`,
        status: 'PROCESSING',
        estimatedCompletion: new Date(Date.now() + 30_000),
      };
    }

    // Implementação real — POST /v2/transferencias via baseClient
    // Por ora, throw se tentar real mode sem implementação completa
    throw new Error(
      'EFI real transferBancario not yet implemented — use EFI_MODE=mock or wait for follow-up',
    );
  }
}
