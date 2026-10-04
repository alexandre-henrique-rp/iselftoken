import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailTemplatesModule } from '../api/email-templates/email-templates.module';

@Global()
@Module({
  imports: [ConfigModule, EmailTemplatesModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
