import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CaInitService, KEY_STORAGE_SERVICE } from './ca-init.service';
import { CertificateService } from './certificate.service';
import { CertExpirationCron } from './cert-expiration.cron';
import {
  createKeyStorageService,
  KEY_STORAGE_MODE,
} from './key-storage/key-storage.factory';

/**
 * Fornecedor async que resolve o KeyStorageService correto via factory.
 * O modulo usa uma funcao factory async para determinar (Vault vs InMemory)
 * em tempo de execucao, respeitando o fallback automatico.
 */
const keyStorageProvider = {
  provide: KEY_STORAGE_SERVICE,
  useFactory: async (): Promise<ReturnType<typeof createKeyStorageService>> => {
    // Logger dummy para bootstrap - o modulo logara posteriormente
    const logger = {
      log: (msg: string) => console.log(msg),
      warn: (msg: string) => console.warn(msg),
      error: (msg: string) => console.error(msg),
      debug: (msg: string) => console.debug(msg),
    };
    return createKeyStorageService(logger as any);
  },
};

/**
 * Modulo PKI — Certificate Authority Interna.
 *
 * Fornece servicos para gerenciar a CA interna (Root + Intermediate)
 * usada para assinar certificados digitais do termo de adesao.
 *
 * Dependencies:
 * - PrismaModule (banco de dados)
 * - KeyStorageService (via factory: Vault ou InMemory)
 *
 * O KEY_STORAGE_MODE e lido de process.env:
 * - 'vault'      -> VaultTransitKeyStorageService (producao)
 * - 'in-memory'   -> InMemoryKeyStorageService (dev/stub)
 *
 * Se Vault nao estiver disponivel, o fallback automatico usa InMemory.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: KEY_STORAGE_MODE,
      useValue: process.env.KEY_STORAGE_MODE || 'in-memory',
    },
    keyStorageProvider as any,
    CaInitService,
    CertificateService,
    CertExpirationCron,
  ],
  exports: [CaInitService, CertificateService, KEY_STORAGE_SERVICE],
})
export class PkiModule {}
