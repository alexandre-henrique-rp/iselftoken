import { Injectable } from '@nestjs/common';

export interface FeatureFlags {
  efiEnabled: boolean;
  efiBankMigration: boolean;
}

/**
 * Feature flags lidos das variáveis de ambiente.
 *
 *用法:
 * ```ts
 * constructor(private readonly ff: FeatureFlagsService) {}
 *
 * if (this.ff.efiEnabled) {
 *   // usar EFI
 * } else {
 *   // usar C6 (legacy)
 * }
 * ```
 */
@Injectable()
export class FeatureFlagsService {
  /** Habilita integração EFI (substitui C6) */
  get efiEnabled(): boolean {
    return process.env['EFI_ENABLED'] === 'true';
  }

  /** Habilita migração progressiva: pagamentos novos vão para EFI */
  get efiBankMigration(): boolean {
    return process.env['EFI_BANK_MIGRATION'] === 'true';
  }

  /** Retorna todos os flags como objeto (útil para debugging) */
  get all(): FeatureFlags {
    return {
      efiEnabled: this.efiEnabled,
      efiBankMigration: this.efiBankMigration,
    };
  }
}
