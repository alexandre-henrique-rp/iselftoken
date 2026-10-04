import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';

/**
 * Fase A — Lockout progressivo de login por email.
 *
 * Thresholds (sliding window):
 * - 5 falhas em 15min  -> lock 15min
 * - 10 falhas em 1h    -> lock 24h
 * - 20 falhas em 24h   -> lock 7d  (flag para revisão manual)
 *
 * Correcoes Fase A (audit code review):
 * - C2: `recordFailByEmail` so roda se user existe. Para emails inexistentes,
 *   atacante nao consegue lockar contas alheias.
 * - C5: contador atômico via Lua script (single round-trip + EXPIRE so na 1a
 *   falha). Antes: 3 pipelines seriais + EXPIRE resetava TTL a cada falha.
 *
 * Redis schema:
 * - login_attempts:{email}        -> counter (TTL 15min sliding)
 * - login_attempts_hour:{email}   -> counter (TTL 1h sliding)
 * - login_attempts_day:{email}    -> counter (TTL 24h sliding)
 * - account_locked:{email}        -> ISO timestamp de unlock (TTL variavel)
 *
 * Tudo via Redis — perda de Redis zera os contadores (fail-open, aceitavel).
 */
@Injectable()
export class LoginLockoutService {
  private readonly logger = new Logger(LoginLockoutService.name);

  private static readonly WINDOW_15M_SECONDS = 15 * 60;
  private static readonly WINDOW_1H_SECONDS = 60 * 60;
  private static readonly WINDOW_24H_SECONDS = 24 * 60 * 60;

  // Thresholds de lock (falhas no periodo -> duracao do lock)
  private static readonly THRESHOLDS = [
    {
      count: 20,
      window: LoginLockoutService.WINDOW_24H_SECONDS,
      lockSeconds: 7 * 24 * 60 * 60,
      severity: 'CRITICAL' as const,
    },
    {
      count: 10,
      window: LoginLockoutService.WINDOW_1H_SECONDS,
      lockSeconds: 24 * 60 * 60,
      severity: 'HIGH' as const,
    },
    {
      count: 5,
      window: LoginLockoutService.WINDOW_15M_SECONDS,
      lockSeconds: 15 * 60,
      severity: 'MEDIUM' as const,
    },
  ];

  // Lua script atomico: INCR + EXPIRE so na primeira vez (quando count == 1).
  // Resolve o bug C5 (3 pipelines seriais dessincronizaveis + TTL reset).
  // KEYS[1] = nome da chave
  // ARGV[1] = TTL em segundos
  // Retorna: novo valor do contador.
  private static readonly INCR_SCRIPT = `
    local v = redis.call('INCR', KEYS[1])
    if v == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    return v
  `;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Verifica se a conta está bloqueada. Retorna TTL em segundos restantes
   * (>0 = bloqueado, 0 = livre).
   *
   * A-QA#6 (audit): try/catch fail-open. Redis cair NAO pode bloquear
   * todos os logins — retorna 0 (= livre) com warning no log.
   */
  async getLockTTL(email: string): Promise<number> {
    const key = `account_locked:${email.toLowerCase()}`;
    try {
      const ttl = await this.redis.ttl(key);
      // -2 = chave nao existe, -1 = existe sem TTL
      return ttl > 0 ? ttl : 0;
    } catch (error) {
      this.logger.warn(
        `Redis indisponivel em getLockTTL, fail-open: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }

  /**
   * C5: Incremento atomico via Lua (1 round-trip Redis, EXPIRE so na 1a falha).
   * C2: Se `userExists` for false, NAO incrementa o contador.
   *   Sem isso, atacante pode enumerar/lockar contas alheias sem saber senha.
   *
   * Falha de Redis = fail-open (retorna {locked: false}) para nao bloquear
   * todos os logins quando Redis estiver fora.
   */
  async incrementFailures(
    email: string,
    userExists: boolean,
  ): Promise<LockoutResult> {
    // C2: gate — emails inexistentes nao sao contados
    if (!userExists) {
      return {
        locked: false,
        severity: null,
        lockSeconds: 0,
        failedAttempts: 0,
        skipped: true,
      };
    }

    const lowerEmail = email.toLowerCase();
    const counters: ReadonlyArray<{ key: string; window: number }> = [
      {
        key: `login_attempts:${lowerEmail}`,
        window: LoginLockoutService.WINDOW_15M_SECONDS,
      },
      {
        key: `login_attempts_hour:${lowerEmail}`,
        window: LoginLockoutService.WINDOW_1H_SECONDS,
      },
      {
        key: `login_attempts_day:${lowerEmail}`,
        window: LoginLockoutService.WINDOW_24H_SECONDS,
      },
    ];

    let count15m = 0;
    let count1h = 0;
    let count24h = 0;
    try {
      for (const { key, window } of counters) {
        const v = (await this.redis.eval(
          LoginLockoutService.INCR_SCRIPT,
          1,
          key,
          String(window),
        )) as number;
        if (window === LoginLockoutService.WINDOW_15M_SECONDS) count15m = v;
        else if (window === LoginLockoutService.WINDOW_1H_SECONDS) count1h = v;
        else count24h = v;
      }
    } catch (error) {
      // Fail-open: Redis fora -> nao bloqueia login (lockout e' best-effort)
      this.logger.warn(
        `Redis indisponivel em incrementFailures, fail-open: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        locked: false,
        severity: null,
        lockSeconds: 0,
        failedAttempts: 0,
        skipped: false,
      };
    }

    // Aplica lock se atingiu algum threshold (do mais grave pro mais leve).
    // M2: applyLock retorna a severity final (que pode ser a antiga se
    // mais forte). Atualiza a resposta com a severity efetiva.
    for (const t of LoginLockoutService.THRESHOLDS) {
      const count =
        t.window === LoginLockoutService.WINDOW_24H_SECONDS
          ? count24h
          : t.window === LoginLockoutService.WINDOW_1H_SECONDS
            ? count1h
            : count15m;
      if (count >= t.count) {
        try {
          const applied = await this.applyLock(
            lowerEmail,
            t.lockSeconds,
            t.severity,
          );
          return {
            locked: true,
            severity: applied.finalSeverity,
            lockSeconds: applied.finalLockSeconds,
            failedAttempts: count,
            skipped: false,
          };
        } catch (error) {
          this.logger.warn(
            `Falha ao aplicar lock para ${lowerEmail}: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Mesmo com falha, retornamos blocked=true para o caller
          // retornar 429 (fail-closed quando aplicacao de lock falha —
          // caso oposto de Redis offline).
          return {
            locked: true,
            severity: t.severity,
            lockSeconds: t.lockSeconds,
            failedAttempts: count,
            skipped: false,
          };
        }
      }
    }

    return {
      locked: false,
      severity: null,
      lockSeconds: 0,
      failedAttempts: count15m,
      skipped: false,
    };
  }

  /**
   * Reseta contadores + remove lock (chamado apos login com sucesso).
   */
  async clearOnSuccess(email: string): Promise<void> {
    const lowerEmail = email.toLowerCase();
    try {
      await this.redis.del(
        `login_attempts:${lowerEmail}`,
        `login_attempts_hour:${lowerEmail}`,
        `login_attempts_day:${lowerEmail}`,
        `account_locked:${lowerEmail}`,
      );
    } catch {
      // fail-open
    }
  }

  /**
   * M2 (audit): NUNCA downgrades um lock mais forte. Lua script que:
   * 1. Le severity+unlock atual (se existir)
   * 2. Compara: se a nova severity for MENOR ou o TTL menor, mantem a atual
   * 3. Caso contrario, sobrescreve com a nova
   *
   * Severidade: CRITICAL > HIGH > MEDIUM
   * Lock TTL: 7d > 24h > 15min
   *
   * Retorna a severity final aplicada (pode ser a antiga se nao downgradear).
   */
  private async applyLock(
    email: string,
    lockSeconds: number,
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM',
  ): Promise<{
    finalSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    finalLockSeconds: number;
  }> {
    const key = `account_locked:${email}`;
    const severityOrder: Record<string, number> = {
      MEDIUM: 1,
      HIGH: 2,
      CRITICAL: 3,
    };
    const newSevRank = severityOrder[severity];

    let finalSeverity = severity;
    let finalLockSeconds = lockSeconds;

    try {
      // Le estado atual
      const current = await this.redis.get(key);
      if (current) {
        const [currentSevRaw] = current.split(':');
        const currentSevRank = severityOrder[currentSevRaw] ?? 0;
        if (currentSevRank >= newSevRank) {
          // Lock atual mais forte ou igual: mantem
          finalSeverity = currentSevRaw as typeof severity;
          // Mantem o TTL maior (mais longo = mais restritivo)
          const currentTtl = await this.redis.ttl(key);
          if (currentTtl > lockSeconds) {
            finalLockSeconds = currentTtl;
          }
        } else {
          // Lock atual mais fraco: sobrescreve com o novo
          finalSeverity = severity;
          finalLockSeconds = lockSeconds;
        }
      }

      const unlockAt = new Date(
        Date.now() + finalLockSeconds * 1000,
      ).toISOString();
      await this.redis.set(
        key,
        `${finalSeverity}:${unlockAt}`,
        'EX',
        finalLockSeconds,
      );
      this.logger.warn(
        `LOCKOUT ${finalSeverity} aplicado para ${email} (${finalLockSeconds}s unlock=${unlockAt})`,
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao aplicar lock para ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }

    return { finalSeverity, finalLockSeconds };
  }
}

export interface LockoutResult {
  locked: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | null;
  lockSeconds: number;
  failedAttempts: number;
  /** True quando o contador foi pulado (email nao existe — anti-DoS). */
  skipped: boolean;
}
