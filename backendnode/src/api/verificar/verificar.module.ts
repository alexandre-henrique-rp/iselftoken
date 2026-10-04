import { Module } from '@nestjs/common';
import { VerificarController } from './verificar.controller';
import { VerificarService } from './verificar.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../s3/s3.module';
import { PkiModule } from '../../common/pki/pki.module';

/**
 * Module for public document verification.
 *
 * @description Provides public endpoints for verifying signed documents:
 * - GET /verificar/:documentId - Validate document authenticity (public, rate-limited)
 * - GET /verificar/:documentId/download - Redirect to presigned S3 URL (public, rate-limited)
 *
 * Security features:
 * - No authentication required (public endpoint)
 * - Rate limiting: 100 requests/IP/minute via ThrottlerGuard
 * - Cache headers: public, max-age=300 (5 minutes)
 * - Sensitive data masking: CPF, CNPJ, IPs, user-agents never exposed
 *
 * Dependencies:
 * - PrismaModule (database access)
 * - S3Module (file storage)
 * - PkiModule (certificate validation)
 */
@Module({
  imports: [PrismaModule, S3Module, PkiModule],
  controllers: [VerificarController],
  providers: [VerificarService],
  exports: [VerificarService],
})
export class VerificarModule {}
