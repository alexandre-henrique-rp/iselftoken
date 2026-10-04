import { Global, Module } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Módulo global de feature flags.
 * Lê variáveis de ambiente e expõe como serviço injetável.
 *
 * @example
 * // Em qualquer serviço:
 * constructor(private readonly ff: FeatureFlagsService) {}
 *
 * if (this.ff.efiEnabled) {
 *   // usar EFI
 * }
 */
@Global()
@Module({
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
