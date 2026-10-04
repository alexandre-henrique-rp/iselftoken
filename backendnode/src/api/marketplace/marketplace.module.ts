import { Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { S3Module } from 'src/s3/s3.module';
import { RedisModule } from 'src/auth/session/redis.module';
import { CuratedPicksController } from './curated-picks.controller';
import { EarlyAccessController } from './early-access.controller';
import { EarlyAccessService } from './early-access.service';
import { InternalAdminController } from './internal-admin.controller';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceInfoController } from './marketplace-info.controller';
import { MarketplaceService } from './marketplace.service';
import { PinChangeListener } from './pin-change.listener';
import { PinController } from './pin.controller';
import { PinService } from './pin.service';
import { ScoreCalculatorService } from './score-calculator.service';
import { ScoreEventListeners } from './score-event.listeners';
import { ScoreRecalcCron } from './score-recalc.cron';
import { ScheduledPublishCron } from './scheduled-publish.cron';

@Module({
  imports: [PrismaModule, S3Module, RedisModule, EmailModule],
  controllers: [
    CuratedPicksController,
    EarlyAccessController,
    InternalAdminController,
    MarketplaceController,
    MarketplaceInfoController,
    PinController,
  ],
  providers: [
    EarlyAccessService,
    MarketplaceService,
    PinService,
    ScoreCalculatorService,
    PinChangeListener,
    ScoreEventListeners,
    ScoreRecalcCron,
    ScheduledPublishCron,
  ],
  exports: [
    EarlyAccessService,
    MarketplaceService,
    PinService,
    ScoreCalculatorService,
  ],
})
export class MarketplaceModule {}
