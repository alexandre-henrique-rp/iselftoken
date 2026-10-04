/**
 * @description Mock do EFI Bank para testes E2E (sem chamadas reais).
 * Simula os endpoints principais: /oauth/token, /v2/cob, webhook.
 * Modo: intercepta fetch real via supertest, nao conecta à API EFI.
 */
import * as crypto from 'crypto';

export interface MockCharge {
  txid: string;
  status: 'ATIVA' | 'CONCLUIDA' | 'NAO_REALIZADA' | 'EXPIRA';
  valor: string;
  pixCopiaECola: string;
  qrCode: string;
  expiresAt: Date;
  location: string;
}

export interface MockWebhookPayload {
  txid: string;
  eventType: 'pix.received' | 'card.paid' | 'card.failed';
  endToEndId?: string;
  valor?: string;
}

export class EfiMockServer {
  private oauthTokens = new Map<string, { token: string; expiresAt: number }>();
  private charges = new Map<string, MockCharge>();
  private webhooks: MockWebhookPayload[] = [];

  constructor(
    private webhookUrl = 'http://localhost:7077/payment/efi/webhook',
    private hmacSecret = process.env.EFI_WEBHOOK_HMAC_SECRET ||
      'test-hmac-secret',
  ) {}

  /**
   * POST /oauth/token — simula auth EFI.
   */
  handleAuth(_req: any): {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
  } {
    const token = `mock_token_${crypto.randomUUID()}`;
    this.oauthTokens.set(token, { token, expiresAt: Date.now() + 3600 * 1000 });
    return {
      access_token: token,
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'cob.write cob.read pix.write pix.read',
    };
  }

  /**
   * POST /v2/cob — criar cobrança PIX.
   */
  handleCreateCharge(req: {
    calendario?: { expiracao?: number };
    valor: { original: string };
    chave?: string;
    txid?: string;
  }): MockCharge {
    const txid = req.txid || `MOCK${Date.now()}`;
    const expiracao = req.calendario?.expiracao || 3600;
    const emvFake =
      '00020101021226970014br.gov.bcb.pix0136' +
      crypto.randomUUID().replace(/-/g, '').slice(0, 26);
    const base64Fake = Buffer.from(`{"txid":"${txid}"}`).toString('base64');

    const charge: MockCharge = {
      txid,
      status: 'ATIVA',
      valor: req.valor.original,
      pixCopiaECola: emvFake,
      qrCode: `data:image/png;base64,${base64Fake}`,
      expiresAt: new Date(Date.now() + expiracao * 1000),
      location: `https://pix.gerencianet.com.br/${txid}`,
    };
    this.charges.set(txid, charge);
    return charge;
  }

  /**
   * PUT /v2/cob/{txid} — atualiza cobranca existente.
   */
  handleUpdateCharge(
    txid: string,
    req: { status?: string },
  ): MockCharge | null {
    const charge = this.charges.get(txid);
    if (!charge) return null;
    if (req.status) {
      charge.status = req.status as MockCharge['status'];
    }
    return charge;
  }

  /**
   * GET /v2/cob/{txid} — consulta cobranca.
   */
  handleGetCharge(txid: string): MockCharge | null {
    return this.charges.get(txid) || null;
  }

  /**
   * Dispara webhook simulado para o backend real.
   * @param txid Charge ID
   * @param eventType Tipo do evento
   */
  async simulateWebhook(
    txid: string,
    eventType: MockWebhookPayload['eventType'],
  ): Promise<void> {
    const charge = this.charges.get(txid);
    if (!charge) throw new Error(`Charge not found: ${txid}`);

    if (eventType === 'pix.received') {
      charge.status = 'CONCLUIDA';
    }

    const payload: MockWebhookPayload = {
      txid,
      eventType,
      endToEndId: `E${Date.now()}${Math.floor(Math.random() * 9999)
        .toString()
        .padStart(4, '0')}`,
      valor: charge.valor,
    };

    this.webhooks.push(payload);

    const timestamp = String(Date.now());
    const signature = this.signBody({ ...payload, timestamp });

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'X-Efi-Signature': signature,
        'X-Efi-Timestamp': timestamp,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Retorna todos os webhooks disparados nesta instancia.
   */
  getWebhooks(): MockWebhookPayload[] {
    return [...this.webhooks];
  }

  /**
   * Limpa estado (útil entre testes).
   */
  reset(): void {
    this.oauthTokens.clear();
    this.charges.clear();
    this.webhooks = [];
  }

  private signBody(body: Record<string, unknown>): string {
    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(JSON.stringify(body))
      .digest('hex');
  }
}

/** Instancia singleton para reuse entre tests. */
export const efiMockServer = new EfiMockServer();
