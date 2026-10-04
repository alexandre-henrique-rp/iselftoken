import { Module } from '@nestjs/common';
import { TokensModule } from 'src/api/tokens/tokens.module';
import { AffiliateModule } from 'src/api/affiliate/affiliate.module';
import { AuditModule } from 'src/common/audit/audit.module';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';

@Module({
  imports: [TokensModule, AuditModule, AffiliateModule],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
