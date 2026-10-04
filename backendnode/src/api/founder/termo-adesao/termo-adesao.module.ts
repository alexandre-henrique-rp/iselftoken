import { Module } from '@nestjs/common';
import { TermoAdesaoController } from './termo-adesao.controller';
import { TermoAdesaoService } from './termo-adesao.service';
import { AuthModule } from '../../../auth/auth.module';
import { PkiModule } from '../../../common/pki/pki.module';
import { SignatureModule } from '../../../signature/signature.module';
import { TemplateModule } from '../../../template/template.module';
import { S3Module } from '../../../s3/s3.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { StartupModule } from '../../startup/startup.module';

/**
 * Module for Termo de Adesao digital signing operations.
 *
 * @description Provides endpoints for signing and retrieving the Termo de Adesao:
 * - PATCH /founder/startups/:startupId/termo-adesao - Sign the termo
 * - GET /founder/startups/:startupId/termo-adesao - Get signed documento metadata
 *
 * Dependencies:
 * - AuthModule (authentication)
 * - PkiModule (certificate issuance)
 * - SignatureModule (PAdES signing)
 * - TemplateModule (PDF generation)
 * - S3Module (file storage)
 * - PrismaModule (database)
 * - StartupModule (ValidateFundador)
 */
@Module({
  imports: [
    AuthModule,
    PkiModule,
    SignatureModule,
    TemplateModule,
    S3Module,
    PrismaModule,
    StartupModule,
  ],
  controllers: [TermoAdesaoController],
  providers: [TermoAdesaoService],
  exports: [TermoAdesaoService],
})
export class TermoAdesaoModule {}
