import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { FounderDocumentRequestsController } from './founder-document-requests.controller';
import { FounderDocumentRequestsService } from './founder-document-requests.service';

@Module({
  imports: [NotificationsModule],
  controllers: [FounderDocumentRequestsController],
  providers: [FounderDocumentRequestsService],
  exports: [FounderDocumentRequestsService],
})
export class FounderDocumentRequestsModule {}
