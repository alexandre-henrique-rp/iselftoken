import { Module } from '@nestjs/common';
import { StorageProviderModule } from 'src/common/storage/storage-provider.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TokenCertificateService } from './token-certificate.service';
import { TokenReservationService } from './token-reservation.service';
import { TokensController, TokensPublicController } from './tokens.controller';
import { TokensService } from './tokens.service';
/**
 * Módulo dos tokens do investidor: carteira, certificado PDF e verificação
 * pública. Provê TokensService + TokenCertificateService para outros módulos
 * (InvestmentsModule os consome na emissão/confirmação).
 */
@Module({
  imports: [PrismaModule, StorageProviderModule],
  controllers: [TokensController, TokensPublicController],
  providers: [TokensService, TokenReservationService, TokenCertificateService],
  exports: [TokensService, TokenReservationService, TokenCertificateService],
})
export class TokensModule {}
