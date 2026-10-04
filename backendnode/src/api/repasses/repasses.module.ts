import { Module } from '@nestjs/common';
import { RepassesService } from './repasses.service';
import { RepassesController } from './repasses.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { FinanceiroGuard } from './guards/financeiro.guard';
import { ComplianceOrAdminGuard } from './guards/compliance.guard';
import { RepassesNotificationService } from './repasses-notification.service';
import { PayoutAuditService } from './payout-audit.service';
import { NotificationsModule } from 'src/api/notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [RepassesController],
  providers: [
    RepassesService,
    FinanceiroGuard,
    ComplianceOrAdminGuard,
    RepassesNotificationService,
    PayoutAuditService,
  ],
  exports: [RepassesService, PayoutAuditService],
})
export class RepassesModule {}
