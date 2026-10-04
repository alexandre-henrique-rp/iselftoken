import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FinanceAccess } from 'src/common/decorators/finance-access.decorator';
import { FeatureFlagsService } from 'src/common/feature-flags/feature-flags.service';
import { FinanceRoleGuard } from 'src/common/guards/finance-role.guard';
import { PaymentPublisher } from 'src/messaging/payment.publisher';
import { EfiConfigAdapter } from './adapters/efi-config.adapter';
import { EfiWebhookEvent } from './entities/efi.types';
import { WebhookSignatureGuard } from './webhook-signature.guard';

/**
 * EFI Bank Webhook & Health Controller
 *
 * Endpoints:
 * - POST /payment/efi/webhook - Receives EFI webhook notifications (async via RabbitMQ)
 * - GET /payment/efi/health - Returns EFI integration status
 *
 * Webhook flow (EFI):
 * 0. Nginx (host) faz o mTLS reverso com a cadeia pública da EFI.
 * 1. WebhookSignatureGuard valida HMAC (query ?hmac=) + IP de origem.
 * 2. Controller enfileira o job no RabbitMQ (resposta ≤200ms).
 * 3. WebhookProcessor consome o job e atualiza o status do Payment.
 */
@Controller('payment/efi')
export class EfiController {
  private readonly logger = new Logger(EfiController.name);

  constructor(
    private readonly ff: FeatureFlagsService,
    private readonly paymentPublisher: PaymentPublisher,
    private readonly configAdapter: EfiConfigAdapter,
  ) {}

  /**
   * Webhook endpoint for EFI Bank notifications.
   *
   * Receives PIX payment notifications, charge status changes, etc.
   * Validação pelo WebhookSignatureGuard (HMAC na query + IP EFI).
   * Aceita tanto /payment/efi/webhook quanto /payment/efi/webhook/pix
   * (a EFI acrescenta /pix ao final da URL cadastrada).
   * Processing is async via RabbitMQ queue (≤200ms response time).
   */
  @Post(['webhook', 'webhook/pix'])
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @UseGuards(WebhookSignatureGuard)
  async handleWebhook(
    @Body() payload: EfiWebhookEvent,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<{ received: boolean; queuedAt: string }> {
    // Não logamos IP nem payload completo (LGPD: pode conter dados do pagador).
    const eventCount = payload?.pix?.length ?? 0;
    this.logger.log(`Webhook EFI recebido (eventos pix=${eventCount})`);

    // Publica no RabbitMQ para processamento assíncrono (≤200ms após o guard).
    // Mensagem persistente + fila durável com DLQ → não se perde webhook.
    const key = idempotencyKey ?? `efi-webhook-${Date.now()}-${randomUUID()}`;
    const published = await this.paymentPublisher.publishEfiWebhook({
      body: payload,
      idempotencyKey: key,
      receivedAt: new Date().toISOString(),
    });

    if (!published) {
      // Broker indisponível: responde 503 para a EFI RE-ENVIAR o webhook
      // mais tarde (a EFI reentrega em caso de não-2xx). Assim não perdemos
      // a notificação de pagamento.
      throw new HttpException(
        'Fila de processamento indisponível — reenviar',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    this.logger.log(`Webhook EFI publicado no RabbitMQ (key=${key})`);

    return {
      received: true,
      queuedAt: new Date().toISOString(),
    };
  }

  /**
   * Cadastra a URL do webhook PIX na EFI (pixConfigWebhook).
   *
   * Restrito a ADMIN/FINANCEIRO. Usa `EFI_WEBHOOK_URL` como base e acrescenta
   * `?hmac=<segredo>&ignorar=`. Idempotente do lado da EFI (recadastrar apenas
   * atualiza a URL da chave). A validação mTLS dos callbacks fica no Nginx.
   */
  @Post('webhook/configure')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, FinanceRoleGuard)
  @FinanceAccess('write')
  async configureWebhook(): Promise<{
    configured: boolean;
    webhookUrl: string;
  }> {
    const baseUrl = process.env['EFI_WEBHOOK_URL'];
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
      throw new HttpException(
        'EFI_WEBHOOK_URL ausente ou inválida (precisa ser URL pública https).',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const result = await this.configAdapter.configureWebhook(baseUrl);
    // Não logamos a URL completa (contém o hmac).
    this.logger.log('Webhook PIX EFI cadastrado via endpoint admin');
    return result;
  }

  /**
   * Health check for EFI integration.
   *
   * Returns the current status of EFI configuration and feature flags.
   */
  @Get('health')
  async getHealth(): Promise<{
    efiEnabled: boolean;
    efiMode: string;
    efiConfigured: boolean;
    configErrors: string[];
  }> {
    const configValidation = this.configAdapter.validateConfig();

    return {
      efiEnabled: this.ff.efiEnabled,
      efiMode: this.ff.efiEnabled
        ? (process.env['EFI_MODE'] ?? 'unknown')
        : 'disabled',
      efiConfigured: configValidation.valid,
      configErrors: configValidation.errors,
    };
  }
}
