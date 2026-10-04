import { Module } from '@nestjs/common';
import { StartupService } from './service/startup.service';
import { StartupCrudService } from './service/startup-crud.service';
import { StartupQueryService } from './service/startup-query.service';
import { StartupRoundService } from './service/startup-round.service';
import { StartupDraftService } from './service/startup-draft.service';
import { StartupController } from './startup.controller';
import { ValidateFundador } from './service/validate.fundador';
import { StartupExtrasController } from './startup-extras.controller';
import { StartupExtrasService } from './service/startup-extras.service';
import { AuthModule } from 'src/auth/auth.module';
import { PaymentModule } from 'src/api/payment/payment.module';
import { InvestmentsModule } from 'src/api/investments/investments.module';
import { DashboardSummaryService } from './service/dashboard-summary.service';
import { EnrichmentService } from './service/enrichment.service';
import { NextActionService } from './service/next-action.service';
import { DataChangeRequestService } from './service/data-change-request.service';
import { DataChangeRequestController } from './data-change-request.controller';
import { FundTransferController } from 'src/api/payment/fund-transfer.controller';
import { EmailModule } from 'src/email/email.module';
import { NotificationsModule } from 'src/api/notifications/notifications.module';
import { StartupNotificationService } from './service/startup-notification.service';

@Module({
  imports: [
    AuthModule,
    PaymentModule,
    InvestmentsModule,
    EmailModule,
    NotificationsModule,
  ],
  controllers: [
    StartupController,
    StartupExtrasController,
    DataChangeRequestController,
    FundTransferController,
  ],
  providers: [
    StartupService,
    StartupCrudService,
    StartupQueryService,
    StartupRoundService,
    StartupDraftService,
    // S1-T09 — notificações do fluxo de startup (event-driven via @OnEvent).
    StartupNotificationService,
    ValidateFundador,
    StartupExtrasService,
    DashboardSummaryService,
    EnrichmentService,
    NextActionService,
    DataChangeRequestService,
  ],
  exports: [
    StartupService,
    StartupCrudService,
    StartupQueryService,
    StartupRoundService,
    StartupDraftService,
    ValidateFundador,
    DataChangeRequestService,
  ],
})
export class StartupModule {}
