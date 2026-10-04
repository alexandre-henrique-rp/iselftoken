/**
 * SystemConfigService — fonte única de configurações dinâmicas.
 *
 * Backed by:
 * - Redis: cache de 1h (CONFIG_CACHE_TTL_MS) com chave `financial_configs`
 * - Prisma: tabela `SystemConfig` (key/value Decimal)
 *
 * Invalidação:
 * - `setConfig()` faz `DEL financial_configs` IMEDIATAMENTE após o upsert.
 * - `invalidateCache()` pode ser chamado manualmente (ex: tests, recovery).
 *
 * Tipagem:
 * - `getFinancialConfigs()` retorna TODAS as chaves tipadas (FinancialConfigs).
 * - `get<K>(key)` retorna o tipo específico da chave K (number).
 *
 * Ver ADR-008 em src/api/campaigns/decisions/ADR-008-financial-model.md.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  FINANCIAL_CONFIG_KEYS,
  FinancialConfigs,
} from './interfaces/financial-configs.interface';

const CACHE_KEY = 'financial_configs';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hora

/** Tipo do row retornado pelo Prisma (Decimal vira string via .toString()). */
type SystemConfigRow = {
  key: string;
  value: { toString(): string };
};

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    const ttlFromEnv = this.configService.get<string>('CONFIG_CACHE_TTL_MS');
    const parsed = ttlFromEnv ? Number(ttlFromEnv) : NaN;
    this.ttlMs =
      Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MS;
  }

  /**
   * Retorna o snapshot completo de configs financeiras.
   * Tenta Redis primeiro; em caso de miss, lê DB e popula cache com TTL.
   *
   * @returns objeto tipado com todas as chaves financeiras
   */
  async getFinancialConfigs(): Promise<FinancialConfigs> {
    // 1) Tenta cache
    const cached = await this.safeGetCache();
    if (cached) {
      this.logger.debug(`[SystemConfig] cache HIT: ${CACHE_KEY}`);
      return cached;
    }

    // 2) Miss — lê DB
    this.logger.debug(`[SystemConfig] cache MISS: ${CACHE_KEY}`);
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { in: [...FINANCIAL_CONFIG_KEYS] } },
    });

    const configs = this.rowsToConfigs(rows);

    // 3) Popula cache (best-effort — não falha se Redis estiver fora)
    await this.safeSetCache(configs);

    return configs;
  }

  /**
   * Helper para ler 1 chave específica (tipada).
   * Lança NotFoundException se a chave não existir no DB.
   *
   * @param key - chave da configuração
   * @returns valor numérico da chave
   */
  async get<K extends keyof FinancialConfigs>(
    key: K,
  ): Promise<FinancialConfigs[K]> {
    const { configs, foundKeys } = await this.loadConfigsWithPresence();
    if (!foundKeys.has(key)) {
      throw new NotFoundException(
        `Chave de configuração não encontrada: ${key}`,
      );
    }
    return configs[key];
  }

  /**
   * Atualiza (ou cria) uma chave de configuração e invalida cache IMEDIATAMENTE.
   * Quem pode chamar: ADMIN/FINANCEIRO (validado em controller via guard).
   *
   * @param key - chave a atualizar
   * @param value - novo valor numérico
   * @param userId - id do usuário que fez a alteração (audit-only)
   * @returns row atualizado
   */
  async setConfig<K extends keyof FinancialConfigs>(
    key: K,
    value: FinancialConfigs[K],
    userId: number,
  ): Promise<{ key: string; value: number; updatedBy: number | null }> {
    const updated = await this.prisma.systemConfig.upsert({
      where: { key },
      update: { value: value as unknown as number, updatedBy: userId },
      create: { key, value: value as unknown as number, updatedBy: userId },
    });

    // Invalidação IMEDIATA — não esperamos o TTL expirar.
    await this.invalidateCache();

    return {
      key: updated.key,
      value: Number(updated.value.toString()),
      updatedBy: updated.updatedBy,
    };
  }

  /**
   * Invalida a entrada de cache de configs financeiras.
   * Útil para testes e recovery manual.
   */
  async invalidateCache(): Promise<void> {
    try {
      await this.redis.del(CACHE_KEY);
      this.logger.debug(`[SystemConfig] cache INVALIDATED: ${CACHE_KEY}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[SystemConfig] falha ao invalidar cache: ${msg}`);
    }
  }

  // ============ helpers internos ============

  /**
   * Carrega configs (cache or DB) e retorna também o conjunto de chaves
   * efetivamente encontradas — usado pelo `get<K>` para distinguir
   * "chave ausente" de "chave com valor 0".
   */
  private async loadConfigsWithPresence(): Promise<{
    configs: FinancialConfigs;
    foundKeys: Set<keyof FinancialConfigs>;
  }> {
    // Tenta cache primeiro
    const cached = await this.safeGetCache();
    if (cached) {
      return {
        configs: cached,
        foundKeys: new Set(
          Object.keys(cached) as Array<keyof FinancialConfigs>,
        ),
      };
    }

    // Miss — lê DB
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { in: [...FINANCIAL_CONFIG_KEYS] } },
    });

    const { configs, foundKeys } = this.rowsToConfigsWithPresence(rows);
    await this.safeSetCache(configs);

    return { configs, foundKeys };
  }

  /** Converte rows do Prisma em objeto tipado + tracking de presença. */
  private rowsToConfigsWithPresence(rows: SystemConfigRow[]): {
    configs: FinancialConfigs;
    foundKeys: Set<keyof FinancialConfigs>;
  } {
    const map = new Map<string, number>();
    const foundKeys = new Set<keyof FinancialConfigs>();
    for (const row of rows) {
      map.set(row.key, Number(row.value.toString()));
      if ((FINANCIAL_CONFIG_KEYS as ReadonlyArray<string>).includes(row.key)) {
        foundKeys.add(row.key as keyof FinancialConfigs);
      }
    }

    const result = {} as FinancialConfigs;
    for (const key of FINANCIAL_CONFIG_KEYS) {
      result[key] = map.has(key) ? (map.get(key) as number) : 0;
    }
    return { configs: result, foundKeys };
  }
  private rowsToConfigs(rows: SystemConfigRow[]): FinancialConfigs {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.key, Number(row.value.toString()));
    }

    // Garante que TODAS as chaves existam (mesmo que zero).
    const result = {} as FinancialConfigs;
    for (const key of FINANCIAL_CONFIG_KEYS) {
      result[key] = map.has(key) ? (map.get(key) as number) : 0;
    }
    return result;
  }

  /** GET no Redis com fallback silencioso. */
  private async safeGetCache(): Promise<FinancialConfigs | null> {
    try {
      const raw = await this.redis.get(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as FinancialConfigs;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[SystemConfig] falha ao ler cache: ${msg}`);
      return null;
    }
  }

  /** SETEX no Redis com TTL configurável. Falha silenciosa. */
  private async safeSetCache(configs: FinancialConfigs): Promise<void> {
    try {
      const ttlSeconds = Math.floor(this.ttlMs / 1000);
      await this.redis.setex(CACHE_KEY, ttlSeconds, JSON.stringify(configs));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[SystemConfig] falha ao popular cache: ${msg}`);
    }
  }
}
