import { Module } from '@nestjs/common';
import { SignatureService } from './signature.service';
import { PkiModule } from '../common/pki/pki.module';

/**
 * Module for digital signature operations (PAdES).
 *
 * @description Provides services for signing PDF documents with PAdES Basic B-B
 * digital signatures using X.509 certificates from the internal CA.
 */
@Module({
  imports: [PkiModule],
  providers: [SignatureService],
  exports: [SignatureService],
})
export class SignatureModule {}
