import { Module } from '@nestjs/common';
import { FeatureFlagsModule } from 'src/common/feature-flags/feature-flags.module';
import { EfiAccountAdapter } from './adapters/efi-account.adapter';
import { EfiChargeAdapter } from './adapters/efi-charge.adapter';
import { EfiConfigAdapter } from './adapters/efi-config.adapter';
import { EfiPixAdapter } from './adapters/efi-pix.adapter';
import { EfiSplitAdapter } from './adapters/efi-split.adapter';
import { EfiWebhookAdapter } from './adapters/efi-webhook.adapter';
import { EfiBaseClient } from './efi-base.client';
import { EfiSdkClient } from './efi-sdk.client';
import { EfiController } from './efi.controller';

/**
 * EFI Bank Integration Module
 *
 * Provides 6 adapters for EFI Bank PIX and payment services:
 * - EfiConfigAdapter: Configuration & credentials management
 * - EfiChargeAdapter: Credit card charges (Cobranças)
 * - EfiPixAdapter: Immediate PIX transactions
 * - EfiWebhookAdapter: Webhook handling (sync legacy path)
 * - EfiSplitAdapter: Split payment configuration
 * - EfiAccountAdapter: Digital account opening
 *
 * All adapters respect feature flags (EFI_ENABLED) and support mock mode.
 *
 * Webhook (async via RabbitMQ):
 * - EfiController publica o webhook cru na exchange `payments`
 *   (`PaymentPublisher`, global via MessagingModule).
 * - `EfiWebhookConsumer` (registrado no PaymentModule) consome a fila
 *   `payments.efi-webhook` e delega a `PaymentService`.
 * O antigo pipeline BullMQ/Redis (WebhookProducer/WebhookProcessor) foi
 * removido — Redis fica apenas como cache de sessão.
 */
@Module({
  imports: [FeatureFlagsModule],
  controllers: [EfiController],
  providers: [
    EfiBaseClient,
    EfiSdkClient,
    EfiConfigAdapter,
    EfiChargeAdapter,
    EfiPixAdapter,
    EfiWebhookAdapter,
    EfiSplitAdapter,
    EfiAccountAdapter,
  ],
  exports: [
    EfiBaseClient,
    EfiSdkClient,
    EfiConfigAdapter,
    EfiChargeAdapter,
    EfiPixAdapter,
    EfiWebhookAdapter,
    EfiSplitAdapter,
    EfiAccountAdapter,
  ],
})
export class EfiModule {}
