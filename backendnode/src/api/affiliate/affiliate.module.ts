import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { AffiliateService } from './affiliate.service';
import { AffiliateCommissionService } from './affiliate-commission.service';
import { AffiliateGuard } from './affiliate.guard';
import {
  AffiliateController,
  AdminAffiliateController,
  FounderAffiliateController,
} from './affiliate.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    AffiliateController,
    FounderAffiliateController,
    AdminAffiliateController,
  ],
  providers: [AffiliateService, AffiliateCommissionService, AffiliateGuard],
  // AffiliateCommissionService e consumido por InvestmentsModule (apuracao na
  // confirmacao) e pelo repasse de fundos (desconto das comissoes).
  exports: [AffiliateCommissionService],
})
export class AffiliateModule {}
