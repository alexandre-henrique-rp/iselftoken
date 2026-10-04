import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { UserNotificationService } from './user-notification.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    UserNotificationService,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    UserNotificationService,
  ],
})
export class NotificationsModule {}
