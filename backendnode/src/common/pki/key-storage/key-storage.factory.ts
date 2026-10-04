/**
 * Factory para KeyStorageService.
 *
 * Retorna a implementacao adequada com base na variavel de ambiente KEY_STORAGE_MODE:
 * - 'vault'    -> VaultTransitKeyStorageService (producao)
 * - 'in-memory' -> InMemoryKeyStorageService (dev/stub)
 *
 * Se KEY_STORAGE_MODE=vault mas VAULT_ADDR nao estiver configurado ou
 * o Vault estiver indisponivel, o fallback e InMemoryKeyStorageService
 * com log de warning (nao quebra o startup).
 *
 * @module key-storage.factory
 */
import { Injectable, Logger } from '@nestjs/common';
import { IKeyStorageService } from './key-storage.interface';
import { InMemoryKeyStorageService } from './in-memory-key-storage.service';
import { VaultTransitKeyStorageService } from './vault-transit-key-storage.service';

export const KEY_STORAGE_MODE = 'KEY_STORAGE_MODE';

export type KeyStorageMode = 'vault' | 'in-memory';

/**
 * Tenta detectar se o Vault esta disponivel via health check.
 *
 * @returns true se Vault responde no endpoint /v1/sys/health
 */
async function isVaultAvailable(
  vaultAddr: string,
  vaultToken: string,
): Promise<boolean> {
  try {
    const url = `${vaultAddr.replace(/\/$/, '')}/v1/sys/health`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Vault-Token': vaultToken,
      },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok || response.status === 429; // 429 = sealed but available
  } catch {
    return false;
  }
}

/**
 * Cria a implementacao correta do KeyStorageService.
 *
 * @param logger - Logger do NestJS para mensagens de diagnostico
 * @returns Implementacao de IKeyStorageService
 *
 * @example
 * const keyStorage = await createKeyStorageService(logger);
 */
export async function createKeyStorageService(
  logger: Logger,
): Promise<IKeyStorageService> {
  const mode = (process.env.KEY_STORAGE_MODE || 'in-memory') as KeyStorageMode;

  if (mode === 'vault') {
    const vaultAddr = process.env.VAULT_ADDR || '';
    const vaultToken = process.env.VAULT_TOKEN || '';

    if (!vaultAddr || !vaultToken) {
      logger.warn(
        '[PKI] KEY_STORAGE_MODE=vault mas VAULT_ADDR/VAULT_TOKEN nao definido. ' +
          'Fallback para InMemoryKeyStorageService.',
      );
      return new InMemoryKeyStorageService();
    }

    const available = await isVaultAvailable(vaultAddr, vaultToken);
    if (!available) {
      logger.warn(
        `[PKI] KEY_STORAGE_MODE=vault mas Vault indisponivel em ${vaultAddr}. ` +
          'Fallback para InMemoryKeyStorageService.',
      );
      return new InMemoryKeyStorageService();
    }

    logger.log(`[PKI] Usando VaultTransitKeyStorageService (${vaultAddr})`);
    return new VaultTransitKeyStorageService(vaultAddr, vaultToken, logger);
  }

  logger.warn(
    '[PKI] KEY_STORAGE_MODE=in-memory. USANDO STUB DE DEV. NAO USAR EM PRODUCAO.',
  );
  return new InMemoryKeyStorageService();
}
