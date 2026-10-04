import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IKeyStorageService } from './key-storage.interface';

/**
 * Implementacao VaultTransit do KeyStorageService.
 *
 * Esta implementacao usa o HashiCorp Vault Transit Engine para armazenar
 * e operar sobre chaves criptograficas. A chave privada JAMAIS sai do Vault.
 *
 * **IMPORTANTE:** O Vault Transit Engine nao exporta chaves privadas.
 * A interface IKeyStorageService e adaptada:
 * - store(): importa a chave publica no Vault (a chave privada permanece local
 *   para operacoes de签发证书; o Vault usa handle/name para referenciar)
 * - retrieve(): lanca erro porque Vault nao devolve chave privada
 * - sign(data, algorithm): delega para POST /transit/sign/{key_name}
 *
 * **Sandbox:** Se VAULT_ADDR/VAULT_TOKEN indisponivel, todas as operacoes
 * lancam erro critico (nao ha fallback automatico - usar
 * KeyStorageServiceFactory que ja faz o fallback).
 *
 * @see KeyStorageServiceFactory para criacao com fallback automatico
 */
export class VaultTransitKeyStorageService implements IKeyStorageService {
  private readonly logger: Logger;

  constructor(
    private readonly vaultAddr: string,
    private readonly vaultToken: string,
    logger: Logger,
  ) {
    this.logger = logger || new Logger(VaultTransitKeyStorageService.name);
    this.vaultAddr = vaultAddr.replace(/\/$/, '');
  }

  private vaultUrl(path: string): string {
    return `${this.vaultAddr}/v1/transit/${path.replace(/^\//, '')}`;
  }

  private async vaultRequest<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = this.vaultUrl(path);
    const response = await fetch(url, {
      method,
      headers: {
        'X-Vault-Token': this.vaultToken,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Vault request failed: ${method} ${url} -> ${response.status} ${text}`,
      );
    }

    const json = (await response.json()) as { data: T };
    return json.data;
  }

  /**
   * Armazena uma chave publica no Vault Transit.
   *
   * O Vault Transit Engine opera com chaves geradas internamente.
   * Para bootstrapping da Root CA, importamos a chave publica
   * e usamos sign via Vault.
   *
   * @param key - Nome/label da chave (ex: 'iselftoken/pki/root/private')
   * @param _privateKeyPem - Chave privada (IGNORADA - Vault nunca recebe a chave privada)
   * @returns O path da chave
   *
   * @throws Error se Vault estiver indisponivel
   */
  async store(key: string, _privateKeyPem: string): Promise<string> {
    this.logger.debug(`[VaultPKI] Store: ${key}`);

    const keyType = 'rsa-2048';
    const keyName = key.replace(/[^a-zA-Z0-9_/-]/g, '_');

    try {
      // Tenta criar a chave no Vault (idempotente - ja existe = 204)
      const response = await fetch(this.vaultUrl(`keys/${keyName}`), {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: keyType, exportable: false }),
      });
      if (!response.ok && response.status !== 204) {
        const text = await response.text().catch(() => '');
        throw new Error(`Vault create key failed: ${response.status} ${text}`);
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes('Vault create key failed')
      ) {
        this.logger.error(
          `[VaultPKI] Falha ao criar chave ${keyName}: ${err.message}`,
        );
        throw err;
      }
      this.logger.error(`[VaultPKI] Falha ao criar chave ${keyName}: ${err}`);
      throw err;
    }

    this.logger.log(
      `[VaultPKI] Chave '${keyName}' criada/disponibilizada no Vault`,
    );
    return key;
  }

  /**
   * Recupera metadados da chave publica no Vault.
   *
   * @param key - Nome/label da chave
   * @returns Metadados da chave (tipo, key_info)
   *
   * @throws Error VaultTransit nao exporta chave privada.
   *             Use sign() para operacoes de assinatura.
   */
  async retrieve(key: string): Promise<string> {
    const keyName = key.replace(/[^a-zA-Z0-9_/-]/g, '_');
    this.logger.debug(`[VaultPKI] Retrieve metadata: ${keyName}`);

    try {
      const data = await this.vaultRequest<{
        type: string;
        public_key?: string;
        name: string;
      }>(`GET`, `keys/${keyName}`);

      // Vault Transit nao retorna a chave privada - retorna metadados publicos
      // Retornamos info sobre a chave para permitir validacao
      const info: Record<string, string> = {
        name: data.name || keyName,
        type: data.type,
        exported: 'false',
        note: 'VaultTransit nao exporta chave privada. Use sign() para operacoes.',
      };

      return JSON.stringify(info);
    } catch (err) {
      this.logger.error(
        `[VaultPKI] Falha ao recuperar chave ${keyName}: ${err}`,
      );
      throw err;
    }
  }

  /**
   * Remove uma chave do Vault Transit.
   *
   * @param key - Nome/label da chave
   * @throws Error se chave nao existir ou Vault falhar
   */
  async delete(key: string): Promise<void> {
    const keyName = key.replace(/[^a-zA-Z0-9_/-]/g, '_');
    this.logger.debug(`[VaultPKI] Delete: ${keyName}`);

    try {
      await this.vaultRequest('DELETE', `keys/${keyName}`);
      this.logger.log(`[VaultPKI] Chave '${keyName}' removida do Vault`);
    } catch (err) {
      this.logger.error(`[VaultPKI] Falha ao remover chave ${keyName}: ${err}`);
      throw err;
    }
  }

  /**
   * Verifica se uma chave existe no Vault Transit.
   *
   * @param key - Nome/label da chave
   * @returns true se a chave existe
   */
  async exists(key: string): Promise<boolean> {
    const keyName = key.replace(/[^a-zA-Z0-9_/-]/g, '_');

    try {
      await this.vaultRequest('GET', `keys/${keyName}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Assina dados usando a chave no Vault Transit.
   *
   * Este metodo NAO faz parte da interface IKeyStorageService,
   * mas e necessario para o bootstrap da CA que precisa assinar
   * certificados com a chave da Root CA.
   *
   * @param key - Nome/label da chave (ex: 'iselftoken/pki/root/private')
   * @param dataHashBase64 - Hash SHA-256 dos dados em base64
   * @param algorithm - Algoritmo de assinatura (pkcs1v15, rsapss)
   * @returns Assinatura em base64
   *
   * @throws Error se a chave nao existir ou assinatura falhar
   */
  async sign(
    key: string,
    dataHashBase64: string,
    algorithm: 'pkcs1v15' | 'pss' = 'pkcs1v15',
  ): Promise<string> {
    const keyName = key.replace(/[^a-zA-Z0-9_/-]/g, '_');
    this.logger.debug(`[VaultPKI] Sign with key: ${keyName}`);

    try {
      const response = await fetch(this.vaultUrl(`sign/${keyName}`), {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: dataHashBase64,
          signature_algorithm: algorithm === 'pss' ? 'rsassa-pss' : 'pkcs1v15',
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Vault sign failed: ${response.status} ${text}`);
      }

      const json = (await response.json()) as { data: { signature: string } };
      return json.data.signature;
    } catch (err) {
      this.logger.error(
        `[VaultPKI] Falha ao assinar com chave ${keyName}: ${err}`,
      );
      throw err;
    }
  }

  /**
   * Retorna o endereco do Vault configurado.
   *
   * @returns URL do Vault
   */
  getVaultAddr(): string {
    return this.vaultAddr;
  }

  /**
   * Verifica se o Vault esta saudavel.
   *
   * @returns true se Vault responde
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.vaultAddr}/v1/sys/health`, {
        method: 'GET',
        headers: { 'X-Vault-Token': this.vaultToken },
        signal: AbortSignal.timeout(3000),
      });
      return response.ok || response.status === 429;
    } catch {
      return false;
    }
  }
}
