import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AdminModule } from './api/admin/admin.module';
import { AffiliateModule } from './api/affiliate/affiliate.module';
import { CampaignsModule } from './api/campaigns/campaigns.module';
import { CategoriesModule } from './api/categories/categories.module';
import { PlatformConfigModule } from './api/config/config.module';
import { CountryModule } from './api/country/country.module';
import { DepoimentoModule } from './api/depoimento/depoimento.module';
import { EmailTemplatesModule } from './api/email-templates/email-templates.module';
import { FounderDocumentRequestsModule } from './api/founder/founder-document-requests.module';
import { FounderServicesModule } from './api/founder/founder-services.module';
import { TermoAdesaoModule } from './api/founder/termo-adesao/termo-adesao.module';
import { GeralModule } from './api/geral/geral.module';
import { HistoryModule } from './api/history/history.module';
import { InstallmentRequestsModule } from './api/installment-requests/installment-requests.module';
import { InvestmentsModule } from './api/investments/investments.module';
import { MarketplaceModule } from './api/marketplace/marketplace.module';
import { NotificationsModule } from './api/notifications/notifications.module';
import { CouponsModule } from './api/payment/coupons/coupons.module';
import { PaymentModule } from './api/payment/payment.module';
import { PlansModule } from './api/plans/plans.module';
import { RepassesModule } from './api/repasses/repasses.module';
import { SealsModule } from './api/seals/seals.module';
import { StartupOpinionModule } from './api/startup-opinion/startup-opinion.module';
import { StartupModule } from './api/startup/startup.module';
import { SubscriptionsModule } from './api/subscriptions/subscriptions.module';
import { TokensModule } from './api/tokens/tokens.module';
import { TransactionsModule } from './api/transactions/transactions.module';
import { TransparencyModule } from './api/transparency/transparency.module';
import { UploadsModule } from './api/uploads/uploads.module';
import { UsersModule } from './api/users/users.module';
import { V2PaymentsModule } from './api/v2/payments/v2-payments.module';
import { VerificarModule } from './api/verificar/verificar.module';
import { WalletModule } from './api/wallet/wallet.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BackupModule } from './backup/backup.module';
import { AuditModule } from './common/audit/audit.module';
import { envSchema } from './common/config';
import { HealthController } from './common/health.controller';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PkiModule } from './common/pki/pki.module';
import { SystemConfigModule } from './common/system-config/system-config.module';
import { EmailModule } from './email/email.module';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      // Fase A C1: valida JWT_SECRET >= 32 chars no boot. Sem fallback.
      // Se o .env nao tiver JWT_SECRET valido, o app crasha (fail-loud).
      validate: (config) => envSchema.parse(config),
    }),
    ScheduleModule.forRoot(),
    // EventEmitterModule: backbone do desacoplamento entre payment e
    // modulos de dominio (subscriptions/investments). Ver @PaymentsHubV2/PRD.
    // wildcard: habilita listeners `payment.*`. maxListeners default.
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    // Mensageria RabbitMQ (fluxo de pagamentos). Redis fica só como cache.
    MessagingModule,
    AuthModule,
    CategoriesModule,
    CountryModule,
    EmailModule,
    UsersModule,
    StartupModule,
    UploadsModule,
    PlansModule,
    SubscriptionsModule,
    PaymentModule,
    CouponsModule,
    CampaignsModule,
    WalletModule,
    InvestmentsModule,
    TransactionsModule,
    BackupModule,
    AdminModule,
    PrismaModule,
    S3Module,
    NotificationsModule,
    RealtimeModule,
    MarketplaceModule,
    SealsModule,
    StartupOpinionModule,
    DepoimentoModule,
    GeralModule,
    AuditModule,
    PkiModule,
    SystemConfigModule,
    TermoAdesaoModule,
    FounderDocumentRequestsModule,
    FounderServicesModule,
    VerificarModule,
    TransparencyModule,
    // Payments Hub v2 (PRD). Rotas em paralelo com /api/payment/* ate Fase 3.
    V2PaymentsModule,
    // Novos módulos migrados
    PlatformConfigModule,
    TokensModule,
    HistoryModule,
    AffiliateModule,
    // FIN-09: Repasses (Compliance delibera + Financeiro configura)
    RepassesModule,
    // FIN-10: InstallmentRequests (Fundador cria/re-submete + dashboard)
    InstallmentRequestsModule,
    // FIN-05: Email Templates admin (Painel /admin/email-templates)
    EmailTemplatesModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
