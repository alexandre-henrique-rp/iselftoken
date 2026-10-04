import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AffiliateModule } from '../affiliate/affiliate.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EfiModule } from '../payment/efi/efi.module';
import { PaymentModule } from '../payment/payment.module';
import { RepassesModule } from '../repasses/repasses.module';
import { PlansModule } from '../plans/plans.module';
import { SealsModule } from '../seals/seals.module';
import { StartupModule } from '../startup/startup.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersModule } from '../users/users.module';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { AdminComplianceDeleteController } from './admin-compliance-delete.controller';
import { AdminComplianceController } from './admin-compliance.controller';
import { AdminDashboardSummaryService } from './admin-dashboard-summary.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDocumentRequestsController } from './admin-document-requests.controller';
import { AdminDocumentRequestsService } from './admin-document-requests.service';
import { AdminFinanceiroController } from './admin-financeiro.controller';
import { AdminFinanceiroSplitController } from './admin-financeiro-split.controller';
import { AdminFinanceiroSplitService } from './admin-financeiro-split.service';
import { AdminKycController } from './admin-kyc.controller';
import {
  AdminPaymentsController,
  AdminPlansController,
  AdminStartupsController,
  AdminTransactionsController,
} from './admin-other.controller';
import { AdminSecurityAuditController } from './admin-security-audit.controller';
import { AdminServicesController } from './admin-services.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { AdminWithdrawalsController } from './admin-withdrawals.controller';
import { AdminWithdrawalsService } from './admin-withdrawals.service';
import { AdminConfigController, AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ComplianceCampaignsService } from './compliance-campaigns.service';
import { ComplianceDeleteService } from './compliance-delete.service';
import { FinanceiroReconciliationService } from './financeiro-reconciliation.service';

@Module({
  imports: [
    PrismaModule,
    AffiliateModule,
    UsersModule,
    SubscriptionsModule,
    PlansModule,
    StartupModule,
    PaymentModule,
    EfiModule,
    TransactionsModule,
    SealsModule,
    NotificationsModule,
    UploadsModule,
    RepassesModule,
  ],
  controllers: [
    AdminController,
    AdminSubscriptionsController,
    AdminPlansController,
    AdminStartupsController,
    AdminPaymentsController,
    AdminTransactionsController,
    AdminDashboardController,
    AdminWithdrawalsController,
    AdminKycController,
    AdminComplianceController,
    AdminFinanceiroController,
    AdminFinanceiroSplitController,
    AdminConfigController,
    AdminComplianceDeleteController,
    AdminAuditLogsController,
    AdminDocumentRequestsController,
    AdminSecurityAuditController,
    AdminServicesController,
  ],
  providers: [
    AdminService,
    FinanceiroReconciliationService,
    ComplianceDeleteService,
    ComplianceCampaignsService,
    AdminAuditLogsService,
    AdminDocumentRequestsService,
    AdminDashboardSummaryService,
    AdminWithdrawalsService,
    AdminFinanceiroSplitService,
  ],
  exports: [AdminService, ComplianceDeleteService, ComplianceCampaignsService],
})
export class AdminModule {}
