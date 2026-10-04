import { Injectable, Logger } from '@nestjs/common';
import { EfiBaseClient } from '../efi-base.client';
import { EfiSdkClient } from '../efi-sdk.client';
import { EfiConfig } from '../entities/efi.types';

/**
 * Adapter 1: EFI Configuration & Credentials Management
 *
 * Responsibilities:
 * - Load and validate EFI credentials from environment
 * - Manage OAuth2 token lifecycle
 * - Provide configuration to other adapters
 * - Configure/query the PIX webhook (pixConfigWebhook)
 */
@Injectable()
export class EfiConfigAdapter {
  private readonly logger = new Logger(EfiConfigAdapter.name);

  constructor(
    private readonly baseClient: EfiBaseClient,
    private readonly sdkClient: EfiSdkClient,
  ) {}

  get config(): EfiConfig {
    return this.baseClient.config;
  }

  get isEnabled(): boolean {
    return !this.baseClient.isMock && !!this.config.clientId;
  }

  get isMock(): boolean {
    return this.baseClient.isMock;
  }

  /**
   * Validates that required EFI credentials are configured.
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.baseUrl) {
      errors.push('EFI_BASE_URL is required');
    }
    if (!this.config.clientId && !this.config.auth) {
      errors.push('EFI_CLIENT_ID or EFI_AUTH is required');
    }
    if (!this.config.pixKey) {
      errors.push('EFI_PIX_KEY is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Monta a URL do webhook cadastrada na EFI, incluindo:
   * - `?hmac=<segredo>` — identificação de origem validada pelo guard;
   * - `&ignorar=` — impede a EFI de acrescentar `/pix` ao path da URL.
   *
   * @param baseWebhookUrl URL pública do webhook (ex: https://api.iselftoken.com/payment/efi/webhook)
   */
  buildWebhookUrl(baseWebhookUrl: string): string {
    const hmac = process.env['EFI_WEBHOOK_HMAC_SECRET'] ?? '';
    const url = new URL(baseWebhookUrl);
    if (hmac) {
      url.searchParams.set('hmac', hmac);
    }
    // ignorar= deve ficar sem valor; URLSearchParams serializa como "ignorar="
    url.searchParams.set('ignorar', '');
    return url.toString();
  }

  /**
   * Cadastra o webhook PIX na EFI para uma chave (pixConfigWebhook).
   *
   * A EFI envia uma notificação de teste ao cadastrar. Como usamos `?ignorar=`,
   * o path `/pix` não é acrescentado e o callback chega na própria URL.
   *
   * @param pixKey Chave PIX recebedora (default: EFI_PIX_KEY)
   * @param baseWebhookUrl URL pública base do webhook
   */
  async configureWebhook(
    baseWebhookUrl: string,
    pixKey?: string,
  ): Promise<{ configured: boolean; webhookUrl: string }> {
    const chave = pixKey ?? this.sdkClient.pixKey;
    if (!chave) {
      throw new Error('Chave PIX ausente para configurar webhook EFI');
    }

    const webhookUrl = this.buildWebhookUrl(baseWebhookUrl);

    if (this.sdkClient.isMock) {
      this.logger.log('[MOCK] configureWebhook — sem chamada real à EFI');
      return { configured: true, webhookUrl };
    }

    const efipay = this.sdkClient.getClient();
    // O header skip-mTLS-checking permite cadastrar o webhook sem exigir o
    // certificado no cadastro; a validação mTLS real ocorre nos callbacks.
    await efipay.pixConfigWebhook(
      { chave },
      { webhookUrl },
      { 'x-skip-mtls-checking': 'true' },
    );

    this.logger.log('Webhook PIX EFI configurado com sucesso');
    return { configured: true, webhookUrl };
  }

  /**
   * Logs configuration status (without sensitive data).
   */
  logConfigStatus(): void {
    const { valid, errors } = this.validateConfig();
    if (valid) {
      this.logger.log(
        `EFI Config: enabled=${this.isEnabled}, mode=${this.baseClient.mode}, baseUrl=${this.config.baseUrl}`,
      );
    } else {
      this.logger.warn(`EFI Config invalid: ${errors.join(', ')}`);
    }
  }
}
