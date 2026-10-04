import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EfiBaseClient } from '../efi-base.client';
import { EfiSdkClient } from '../efi-sdk.client';
import {
  EfiCardChargeResult,
  EfiCardChargeStatus,
  EfiChargeRequest,
  EfiChargeResponse,
  EfiLocationResponse,
  EfiOneStepCardInput,
} from '../entities/efi.types';

/**
 * Mascaramento de PII para logs de debug do adapter de cartão.
 *
 * LGPD + PCI-DSS: nunca logar payment_token completo, CVV, número de cartão
 * ou customer.cpf inteiro. Mostra apenas marcadores estruturais.
 */
function maskPaymentToken(token: string | undefined): string {
  if (!token) return '<empty>';
  const t = String(token).trim();
  if (t.length < 8) return `<short:${t.length}chars>`;
  return `${t.slice(0, 4)}…${t.slice(-4)} (${t.length}chars)`;
}

function maskCpf(cpf: string | undefined): string {
  if (!cpf) return '<empty>';
  const c = String(cpf).replace(/\D/g, '');
  if (c.length < 4) return `<short:${c.length}digits>`;
  return `${c.slice(0, 3)}***${c.slice(-2)}`;
}

/**
 * Adapter 2: EFI Charges API (Cobranças - Cartão de Crédito)
 *
 * Responsibilities:
 * - Create credit card charges via one-step (createOneStepCharge)
 * - Query charge status (detailCharge)
 * - Refund card charges (refundCard)
 *
 * O fluxo de cartão usa o SDK oficial (sdk-node-apis-efi) via EfiSdkClient,
 * que resolve mTLS/OAuth/endpoint. Os métodos PIX legados (createCharge/
 * createLocation) permanecem para compatibilidade, mas cartão NÃO usa /v2/cob.
 *
 * API Docs: https://dev.efipay.com.br/docs/api-cobrancas/cartao
 */
@Injectable()
export class EfiChargeAdapter {
  private readonly logger = new Logger(EfiChargeAdapter.name);

  /** Status que representam aprovação/liquidação da cobrança de cartão. */
  private static readonly APPROVED_STATUSES: ReadonlySet<EfiCardChargeStatus> =
    new Set(['approved', 'paid', 'settled']);

  constructor(
    private readonly baseClient: EfiBaseClient,
    private readonly sdkClient: EfiSdkClient,
  ) {}

  /**
   * Cria e paga uma cobrança de cartão em um passo (one-step).
   *
   * O `paymentToken` é gerado no navegador pela lib `payment-token-efi`
   * (dados do cartão nunca passam pelo backend). Aqui apenas repassamos o
   * token + itens + dados do pagador para a EFI.
   *
   * @returns Resultado normalizado com status e flag `approved`.
   */
  async createOneStepCard(
    input: EfiOneStepCardInput,
  ): Promise<EfiCardChargeResult> {
    if (this.sdkClient.isMock) {
      return this.mockCardResult(input);
    }

    // Sanity checks (defesa em profundidade — DTO já validou paymentToken).
    // A EFI retorna 3500010 "payment_token não existe" quando QUALQUER campo
    // obrigatório do nó `payment.credit_card` falha validação no servidor
    // dela (não só payment_token). Estes checks garantem erro PT-BR claro
    // ANTES de bater na EFI em casos óbvios (campo vazio/undefined).
    const trimmedToken = input.paymentToken?.trim();
    if (!trimmedToken) {
      throw new UnprocessableEntityException({
        code: 'card_payment_token_required',
        message:
          'Token do cartão ausente ou inválido. Recarregue a página e tente novamente.',
      });
    }
    if (!input.customer?.email?.trim()) {
      throw new UnprocessableEntityException({
        code: 'card_customer_email_required',
        message:
          'E-mail do pagador ausente. Complete seu perfil e tente novamente.',
      });
    }
    if (!input.customer?.name?.trim()) {
      throw new UnprocessableEntityException({
        code: 'card_customer_name_required',
        message:
          'Nome do pagador ausente. Complete seu perfil e tente novamente.',
      });
    }
    if (
      !Number.isInteger(input.installments) ||
      input.installments < 1 ||
      input.installments > 18
    ) {
      throw new UnprocessableEntityException({
        code: 'card_installments_invalid',
        message: 'Número de parcelas inválido (deve ser entre 1 e 18).',
      });
    }
    // A EFI exige `customer.cpf` em cobranças one-step (código 3500034
    // `validation_error` quando ausente), apesar do schema Zod marcar como
    // opcional. O service já tentou fallback user.reg_documento →
    // cardholderDocument — se chegamos aqui sem cpf, é caso perdido.
    if (!input.customer?.cpf?.trim()) {
      throw new UnprocessableEntityException({
        code: 'card_customer_cpf_required',
        message:
          'CPF/CNPJ do pagador ausente. Complete seu perfil ou informe o documento do titular do cartão.',
      });
    }
    // A EFI exige `customer.birth` (YYYY-MM-DD) em cobranças one-step.
    // Sem ele, retorna 3500010 "payment_token não existe" (culpa o
    // primeiro campo que valida quando qualquer obrigatório falha).
    if (!input.customer?.birth?.trim()) {
      throw new UnprocessableEntityException({
        code: 'card_customer_birth_required',
        message:
          'Data de nascimento do pagador ausente. Complete seu perfil (campo "Data de nascimento") antes de pagar com cartão.',
      });
    }
    // A EFI exige `billing_address` em cobranças one-step. Sem ele,
    // retorna 3500010. Validamos os 6 campos obrigatórios.
    const ba = input.billingAddress;
    if (
      !ba?.street?.trim() ||
      !ba?.number?.toString().trim() ||
      !ba?.neighborhood?.trim() ||
      !ba?.zipcode?.trim() ||
      !ba?.city?.trim() ||
      !ba?.state?.trim()
    ) {
      throw new UnprocessableEntityException({
        code: 'card_billing_address_required',
        message:
          'Endereço de cobrança incompleto. Complete seu perfil (rua, número, bairro, CEP, cidade e UF) antes de pagar com cartão.',
      });
    }

    const efipay = this.sdkClient.getClient();

    // Log estruturado gated por env (PAYMENT_DEBUG_CARD=true).
    // LGPD/PCI: NÃO loga payment_token completo, CVV, número de cartão.
    // Mostra marcadores estruturais (present/empty/masked) que permitem
    // identificar QUAL campo está vazio quando a EFI retorna 3500010.
    if (process.env['PAYMENT_DEBUG_CARD'] === 'true') {
      this.logger.debug(
        `[CARD-DEBUG] EFI charge input: ` +
          `payment_token=${maskPaymentToken(trimmedToken)} | ` +
          `installments=${input.installments} | ` +
          `customer.email=${input.customer.email ? 'present' : '<empty>'} | ` +
          `customer.name=${input.customer.name ? 'present' : '<empty>'} | ` +
          `customer.cpf=${maskCpf(input.customer.cpf)} | ` +
          `customer.phone_number=${input.customer.phone_number ? 'present' : '<empty>'} | ` +
          `customer.birth=${input.customer.birth ? 'present' : '<empty>'} | ` +
          `billing_address=${input.billingAddress ? 'present' : '<empty>'} | ` +
          `items=${input.items?.length ?? 0}`,
      );
    }

    const body = {
      items: input.items,
      ...(input.customId || input.notificationUrl
        ? {
            metadata: {
              ...(input.customId && { custom_id: input.customId }),
              ...(input.notificationUrl && {
                notification_url: input.notificationUrl,
              }),
            },
          }
        : {}),
      payment: {
        credit_card: {
          customer: {
            name: input.customer.name,
            email: input.customer.email,
            ...(input.customer.cpf && { cpf: input.customer.cpf }),
            ...(input.customer.phone_number && {
              phone_number: input.customer.phone_number,
            }),
            ...(input.customer.birth && { birth: input.customer.birth }),
            ...(input.customer.juridical_person && {
              juridical_person: input.customer.juridical_person,
            }),
          },
          installments: input.installments,
          payment_token: input.paymentToken,
          ...(input.billingAddress && {
            billing_address: input.billingAddress,
          }),
        },
      },
    };

    const response: any = await efipay.createOneStepCharge(body as any);
    const data = response?.data ?? response;
    const status = (data?.status ?? 'unpaid') as EfiCardChargeStatus;

    this.logger.log(
      `Cobrança cartão criada charge_id=${data?.charge_id} status=${status}`,
    );

    return {
      chargeId: Number(data?.charge_id),
      status,
      total: Number(data?.total ?? 0),
      installments: Number(data?.installments ?? input.installments),
      installmentValue:
        data?.installment_value != null
          ? Number(data.installment_value)
          : undefined,
      reason: data?.reason,
      approved: EfiChargeAdapter.APPROVED_STATUSES.has(status),
    };
  }

  /**
   * Consulta o status de uma cobrança de cartão (detailCharge).
   */
  async getCardCharge(chargeId: number): Promise<EfiCardChargeResult> {
    if (this.sdkClient.isMock) {
      return {
        chargeId,
        status: 'paid',
        total: 0,
        installments: 1,
        approved: true,
      };
    }

    const efipay = this.sdkClient.getClient();
    const response: any = await efipay.detailCharge({ id: chargeId });
    const data = response?.data ?? response;
    const status = (data?.status ?? 'unpaid') as EfiCardChargeStatus;

    return {
      chargeId: Number(data?.charge_id ?? chargeId),
      status,
      total: Number(data?.total ?? 0),
      installments: Number(data?.payment?.credit_card?.installments ?? 1),
      installmentValue: data?.payment?.credit_card?.installment_value,
      reason: data?.reason,
      approved: EfiChargeAdapter.APPROVED_STATUSES.has(status),
    };
  }

  /**
   * Estorna (total ou parcial) uma cobrança de cartão (refundCard).
   *
   * @param chargeId ID da cobrança
   * @param amount valor em centavos (omitido = estorno total)
   */
  async refundCard(
    chargeId: number,
    amount?: number,
  ): Promise<{ refunded: boolean; message?: string }> {
    if (this.sdkClient.isMock) {
      return { refunded: true, message: 'Reembolso mock' };
    }

    const efipay = this.sdkClient.getClient();
    const response: any = await efipay.refundCard(
      { id: chargeId },
      amount != null ? { amount } : ({} as any),
    );
    return {
      refunded: true,
      message: response?.data ?? 'Reembolso solicitado',
    };
  }

  private mockCardResult(input: EfiOneStepCardInput): EfiCardChargeResult {
    const total = input.items.reduce((s, i) => s + i.value * i.amount, 0);
    this.logger.log(
      `[MOCK] createOneStepCard total=${total} installments=${input.installments}`,
    );
    return {
      chargeId: Math.floor(Math.random() * 1_000_000),
      status: 'approved',
      total,
      installments: input.installments,
      installmentValue: Math.round(total / input.installments),
      approved: true,
    };
  }

  /**
   * Creates a new charge (credit card payment).
   *
   * @param amount Amount in BRL (e.g., "99.99")
   * @param expirationSeconds Time until expiration (default: 15 minutes)
   * @param payerRequest Optional message shown to payer
   */
  async createCharge(params: {
    amount: string;
    expirationSeconds?: number;
    payerRequest?: string;
    reference?: string;
  }): Promise<EfiChargeResponse> {
    const { amount, expirationSeconds = 900, payerRequest, reference } = params;

    if (this.baseClient.isMock) {
      return this.mockChargeResponse(amount);
    }

    const request: EfiChargeRequest = {
      calendario: {
        expiracao: expirationSeconds,
      },
      valor: {
        original: amount,
      },
      solicitacaoPagador: payerRequest,
      refatura: reference,
    };

    const response = await this.baseClient.request<EfiChargeResponse>(
      '/v2/cob',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    );

    this.logger.log(
      `Created charge ${response.charge_id} with status ${response.status}`,
    );
    return response;
  }

  /**
   * Retrieves a charge by ID.
   */
  async getCharge(chargeId: number): Promise<EfiChargeResponse> {
    if (this.baseClient.isMock) {
      return this.mockChargeResponse('99.99');
    }

    return this.baseClient.request<EfiChargeResponse>(`/v2/cob/${chargeId}`);
  }

  /**
   * Cancels an active charge.
   */
  async cancelCharge(chargeId: number): Promise<EfiChargeResponse> {
    if (this.baseClient.isMock) {
      return this.mockChargeResponse('99.99');
    }

    return this.baseClient.request<EfiChargeResponse>(`/v2/cob/${chargeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
  }

  /**
   * Creates a payment location (QR Code URL) for a charge.
   */
  async createLocation(chargeId: number): Promise<EfiLocationResponse> {
    if (this.baseClient.isMock) {
      return {
        id: 123,
        location: `https://pix.example.com/qr/${chargeId}`,
        tipoCob: 'cob',
        criacao: new Date().toISOString(),
      };
    }

    return this.baseClient.request<EfiLocationResponse>(
      `/v2/cob/${chargeId}/loc`,
      {
        method: 'POST',
      },
    );
  }

  /**
   * Gets location details.
   */
  async getLocation(locationId: number): Promise<EfiLocationResponse> {
    if (this.baseClient.isMock) {
      return {
        id: locationId,
        location: `https://pix.example.com/qr/${locationId}`,
        tipoCob: 'cob',
        criacao: new Date().toISOString(),
      };
    }

    return this.baseClient.request<EfiLocationResponse>(
      `/v2/loc/${locationId}`,
    );
  }

  /**
   * Generates a copy-paste code (pixCopiaECola) for a charge.
   */
  async getPixCopyPaste(chargeId: number): Promise<string> {
    const location = await this.createLocation(chargeId);
    // Format: 00020126580014br.gov.bcb.pix0136{location}5204000053039865404999.005802BR5925...6044{timestamp}
    return location.location;
  }

  private mockChargeResponse(amount: string): EfiChargeResponse {
    return {
      charge_id: Math.floor(Math.random() * 100000),
      status: 'ACTIVE',
      calendario: {
        criacao: new Date().toISOString(),
        expiracao: 900,
      },
      valor: {
        original: amount,
      },
      locs: [
        {
          id: Math.floor(Math.random() * 10000),
          location: `https://pix.example.com/qr/${Math.random().toString(36).slice(2)}`,
          tipoCob: 'cob',
        },
      ],
    };
  }
}
