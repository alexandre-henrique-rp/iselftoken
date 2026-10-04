import { Module, forwardRef } from '@nestjs/common';
import { AffiliateModule } from 'src/api/affiliate/affiliate.module';
import { InvestmentsModule } from 'src/api/investments/investments.module';
import { RedisModule } from 'src/auth/session/redis.module';
import { AuditModule } from 'src/common/audit/audit.module';
import { SystemConfigModule } from 'src/common/system-config/system-config.module';
import { DlqMonitorConsumer } from 'src/messaging/dlq-monitor.consumer';
import { EfiWebhookConsumer } from 'src/messaging/efi-webhook.consumer';
import { PaymentEffectsConsumer } from 'src/messaging/payment-effects.consumer';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BalanceController } from './controller/balance.controller';
import { InstallmentConfigController } from './controller/installment-config.controller';
import { ManualApproveController } from './controller/manual-approve.controller';
import { RefundController } from './controller/refund.controller';
import { StatementController } from './controller/statement.controller';
import { TransferController } from './controller/transfer.controller';
import { CouponSettlementService } from './coupons/coupon-settlement.service';
import { EfiModule } from './efi/efi.module';
import { FundTransferCronService } from './fund-transfer-cron.service';
import { FundTransferService } from './fund-transfer.service';
import { InstallmentConfigPermissionGuard } from './guards/installment-config-permission.guard';
import { TwoFactorGuard } from './guards/two-factor.guard';
import { PaymentController } from './payment.controller';
import { PaymentCronService } from './payment.cron';
import { PaymentService } from './payment.service';
import { RefundService } from './refund.service';
import { BalanceService } from './service/balance.service';
import { InstallmentCalculatorService } from './service/installment-calculator.service';
import { InstallmentConfigService } from './service/installment-config.service';
import { ManualApproveService } from './service/manual-approve.service';
import { StatementService } from './service/statement.service';
import { TransferService } from './service/transfer.service';
import { SplitModule } from './split/split.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AffiliateModule,
    InvestmentsModule,
    forwardRef(() => EfiModule),
    SplitModule,
    AuditModule,
    SystemConfigModule,
  ],
  controllers: [
    PaymentController,
    InstallmentConfigController,
    RefundController,
    ManualApproveController,
    BalanceController,
    StatementController,
    TransferController,
  ],
  providers: [
    PaymentService,
    CouponSettlementService,
    PaymentCronService,
    RefundService,
    FundTransferService,
    FundTransferCronService,
    InstallmentCalculatorService,
    InstallmentConfigService,
    InstallmentConfigPermissionGuard,
    TwoFactorGuard,
    ManualApproveService,
    BalanceService,
    StatementService,
    TransferService,
    PaymentEffectsConsumer,
    EfiWebhookConsumer,
    DlqMonitorConsumer,
  ],
  exports: [
    PaymentService,
    CouponSettlementService,
    RefundService,
    FundTransferService,
    FundTransferCronService,
    InstallmentCalculatorService,
    InstallmentConfigService,
  ],
})
export class PaymentModule {}
