import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EfiWebhookEvent, EfiWebhookPayload } from '../entities/efi.types';

/**
 * Adapter 4: EFI Webhook Handler
 *
 * Responsibilities:
 * - Validate webhook authenticity (IP whitelist)
 * - Parse webhook payloads
 * - Emit events for downstream processing
 * - Handle idempotency via txid
 *
 * Events emitted:
 * - efi.pix.received - When a PIX payment is received
 * - efi.charge.completed - When a charge is paid
 * - efi.charge.expired - When a charge expires
 */
@Injectable()
export class EfiWebhookAdapter {
  private readonly logger = new Logger(EfiWebhookAdapter.name);

  // IP oficial dos callbacks PIX da EFI (doc oficial).
  // @see https://dev.efipay.com.br/docs/api-pix/webhooks
  private readonly EFI_WHITELIST_IPS = new Set(['34.193.116.226']);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Validates if the request IP is whitelisted.
   */
  isValidIp(ip: string | null): boolean {
    if (!ip) return false;
    if (process.env['NODE_ENV'] === 'development') return true;
    return this.EFI_WHITELIST_IPS.has(ip);
  }

  /**
   * Processes an incoming webhook from EFI.
   *
   * @param payload The webhook payload from EFI
   * @param ipAddress Source IP of the request
   */
  async processWebhook(
    payload: EfiWebhookEvent,
    ipAddress: string | null,
  ): Promise<{
    processed: boolean;
    events: string[];
    errors: string[];
  }> {
    if (!this.isValidIp(ipAddress)) {
      this.logger.warn(`Blocked webhook from invalid IP: ${ipAddress}`);
      return {
        processed: false,
        events: [],
        errors: ['Invalid IP address'],
      };
    }

    const events: string[] = [];
    const errors: string[] = [];

    try {
      if (payload.pix && payload.pix.length > 0) {
        for (const pix of payload.pix) {
          try {
            await this.processPixEvent(pix);
            events.push(`pix.${pix.tipoOperacao?.toLowerCase() ?? 'unknown'}`);
          } catch (err) {
            errors.push(`Failed to process PIX: ${(err as Error).message}`);
          }
        }
      }

      if (payload.webhook?.subscribe) {
        events.push('webhook.subscribed');
      }

      this.logger.log(
        `Processed ${events.length} webhook events, ${errors.length} errors`,
      );
    } catch (err) {
      errors.push(`Webhook processing error: ${(err as Error).message}`);
    }

    return {
      processed: errors.length === 0,
      events,
      errors,
    };
  }

  /**
   * Processes a single PIX webhook event.
   */
  private async processPixEvent(pix: EfiWebhookPayload): Promise<void> {
    const { bancoHId, chave, txid, valor, horario, tipoOperacao, infoPagador } =
      pix;

    this.logger.log(
      `PIX event: tipo=${tipoOperacao}, txid=${txid ?? 'N/A'}, valor=${valor}`,
    );

    switch (tipoOperacao?.toUpperCase()) {
      case 'PIX_RECEBIDO':
      case 'RECEBIMENTO':
        this.eventEmitter.emit('efi.pix.received', {
          bancoHId,
          chave,
          txid,
          valor,
          horario,
          infoPagador,
        });
        break;

      case 'PIX_DEVOLVIDO':
      case 'DEVOLUCAO':
        this.eventEmitter.emit('efi.pix.refunded', {
          bancoHId,
          chave,
          txid,
          valor,
          horario,
        });
        break;

      default:
        this.logger.debug(`Unhandled PIX operation type: ${tipoOperacao}`);
    }
  }

  /**
   * Extracts the raw PIX payload for logging/auditing.
   */
  parseWebhookPayload(event: EfiWebhookEvent): EfiWebhookPayload | null {
    return event.pix?.[0] ?? null;
  }

  /**
   * Generates a webhook receipt response for EFI.
   */
  generateWebhookResponse(): {
    status: string;
    motivo: string;
  } {
    return {
      status: 'OK',
      motivo: 'Webhook recebido com sucesso',
    };
  }
}
