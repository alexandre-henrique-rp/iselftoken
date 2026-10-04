import { Module } from '@nestjs/common';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
import { EmailRenderService } from './email-render.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService, EmailRenderService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
