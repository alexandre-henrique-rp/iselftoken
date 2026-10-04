import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Redis } from 'ioredis';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly DEFAULT_TTL = 604800; // 7 days in seconds

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /** Exposes Redis client for cache usage in other services (e.g. email templates). */
  getRedisClient(): Redis {
    return this.redis;
  }

  /**
   * Garante que o registro do acesso pós-2FA seja processado uma única vez
   * por sessão, inclusive quando o cliente repetir a requisição em paralelo.
   */
  async claimAccessRecord(sessionId: string): Promise<boolean> {
    const result = await this.redis.set(
      `access_recorded:${sessionId}`,
      '1',
      'EX',
      this.DEFAULT_TTL,
      'NX',
    );
    return result === 'OK';
  }

  async createSession(
    userId: string,
    userData: object,
    ttlSeconds: number = this.DEFAULT_TTL,
  ): Promise<void> {
    return Sentry.startSpan(
      { op: 'session.create', name: 'Create Session' },
      async () => {
        try {
          const key = `session:${userId}`;
          // Garante que lastAccessAt esta setado (necessario para AuthGuard.hasRecentAccess)
          // A-Pentest#3 (audit): tambem grava sessionCreatedAt (epoch ms) para
          // o AuthGuard poder invalidar sessoes criadas antes de um dismiss.
          const nowIso = new Date().toISOString();
          const nowMs = Date.now();
          const data = JSON.stringify({
            ...userData,
            lastAccessAt: nowIso,
            sessionCreatedAt: nowMs,
          });
          await this.redis.set(key, data, 'EX', ttlSeconds);
          this.logger.log(
            '[SESSION] Sessão criada | operation=create | status=success',
          );
        } catch (error) {
          this.logger.error(
            '[SESSION] Falha ao criar sessão | operation=create | status=failed',
          );
          throw error;
        }
      },
    );
  }

  async storePendingLoginAlert(
    sessionId: string,
    data: object,
    ttlSeconds = 900,
  ): Promise<void> {
    await this.redis.set(
      `login_alert_pending:${sessionId}`,
      JSON.stringify(data),
      'EX',
      ttlSeconds,
    );
  }

  async consumePendingLoginAlert<T = object>(
    sessionId: string,
  ): Promise<T | null> {
    const key = `login_alert_pending:${sessionId}`;
    const data = await this.redis.get(key);
    if (!data) return null;
    await this.redis.del(key);
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async getSession(userId: string): Promise<object | null> {
    return Sentry.startSpan(
      { op: 'session.get', name: 'Get Session' },
      async () => {
        try {
          const key = `session:${userId}`;
          const data = await this.redis.get(key);
          if (!data) {
            return null;
          }
          return JSON.parse(data);
        } catch (error) {
          this.logger.error(
            '[SESSION] Falha ao buscar sessão | operation=get | status=failed',
          );
          throw error;
        }
      },
    );
  }

  /**
   * Busca dados do usuário em cache separado (user:{userId})
   */
  async getUserCache(userId: string): Promise<object | null> {
    try {
      const key = `user:${userId}`;
      const data = await this.redis.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Erro ao buscar cache do usuário ${userId}`, error);
      throw error;
    }
  }

  /**
   * Atualiza cache do usuário (user:{userId})
   */
  async setUserCache(userId: string, userData: object): Promise<void> {
    try {
      const key = `user:${userId}`;
      const data = JSON.stringify(userData);
      // Cache expira em 7 dias (mesmo TTL da sessão)
      await this.redis.set(key, data, 'EX', this.DEFAULT_TTL);
      this.logger.log(`Cache do usuário ${userId} atualizado`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar cache do usuário ${userId}`, error);
      throw error;
    }
  }

  /**
   * Remove cache do usuário
   */
  async deleteUserCache(userId: string): Promise<void> {
    try {
      const key = `user:${userId}`;
      await this.redis.del(key);
      this.logger.log(`Cache do usuário ${userId} removido`);
    } catch (error) {
      this.logger.error(`Erro ao remover cache do usuário ${userId}`, error);
      throw error;
    }
  }

  async updateSession(userId: string, userData: object): Promise<void> {
    return Sentry.startSpan(
      { op: 'session.update', name: 'Update Session' },
      async () => {
        try {
          const key = `session:${userId}`;
          const ttl = await this.redis.ttl(key);

          if (ttl <= 0) {
            this.logger.warn(
              '[SESSION] Sessão não encontrada ou expirada | operation=update | status=not_found',
            );
            return;
          }

          const data = JSON.stringify(userData);
          await this.redis.set(key, data, 'EX', ttl);
          this.logger.log(
            '[SESSION] Sessão atualizada | operation=update | status=success',
          );
        } catch (error) {
          this.logger.error(
            '[SESSION] Falha ao atualizar sessão | operation=update | status=failed',
          );
          throw error;
        }
      },
    );
  }

  async deleteSession(userId: string): Promise<void> {
    return Sentry.startSpan(
      { op: 'session.delete', name: 'Delete Session' },
      async () => {
        try {
          const key = `session:${userId}`;
          await this.redis.del(key);
          this.logger.log(
            '[SESSION] Sessão removida | operation=delete | status=success',
          );
        } catch (error) {
          this.logger.error(
            '[SESSION] Falha ao remover sessão | operation=delete | status=failed',
          );
          throw error;
        }
      },
    );
  }

  async refreshSession(userId: string): Promise<void> {
    return Sentry.startSpan(
      { op: 'session.refresh', name: 'Refresh Session' },
      async () => {
        try {
          const key = `session:${userId}`;
          const exists = await this.redis.exists(key);

          if (!exists) {
            this.logger.warn(
              '[SESSION] Sessão não encontrada | operation=refresh | status=not_found',
            );
            return;
          }

          await this.redis.expire(key, this.DEFAULT_TTL);
          this.logger.log(
            '[SESSION] Sessão renovada | operation=refresh | status=success',
          );
        } catch (error) {
          this.logger.error(
            '[SESSION] Falha ao renovar sessão | operation=refresh | status=failed',
          );
          throw error;
        }
      },
    );
  }

  async verify2FA(userId: string): Promise<void> {
    return Sentry.startSpan(
      { op: 'session.verify2fa', name: 'Verify 2FA' },
      async () => {
        try {
          const key = `session:${userId}`;
          const data = await this.redis.get(key);

          if (!data) {
            throw new Error('Sessão não encontrada');
          }

          const session = JSON.parse(data);
          session.af2Verified = true;
          session.af2VerifiedAt = new Date().toISOString();

          const ttl = await this.redis.ttl(key);
          await this.redis.set(key, JSON.stringify(session), 'EX', ttl);

          this.logger.log(
            '[SESSION] 2FA verificado | operation=verify_2fa | status=success',
          );
        } catch (error) {
          this.logger.error(
            '[SESSION] Falha ao verificar 2FA | operation=verify_2fa | status=failed',
          );
          throw error;
        }
      },
    );
  }

  async is2FAVerified(userId: string): Promise<boolean> {
    try {
      const key = `session:${userId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return false;
      }

      const session = JSON.parse(data);
      return session.af2Verified === true;
    } catch (error) {
      this.logger.error(
        '[SESSION] Falha ao verificar status 2FA | operation=is_2fa_verified | status=failed',
      );
      return false;
    }
  }

  /**
   * Armazena o código de verificação 2FA no Redis associado ao sessionId
   */
  async getVerificationCode(sessionId: string): Promise<string | null> {
    try {
      const key = `verification_code:${sessionId}`;
      return await this.redis.get(key);
    } catch {
      this.logger.error(
        '[SESSION] Falha ao recuperar código 2FA | operation=get_verification | status=failed',
      );
      return null;
    }
  }

  async storeVerificationCode(
    sessionId: string,
    code: string,
    ttlSeconds: number = 300, // 5 minutos padrão
  ): Promise<void> {
    try {
      const key = `verification_code:${sessionId}`;
      await this.redis.set(key, code, 'EX', ttlSeconds);
      this.logger.log(
        '[SESSION] Código 2FA armazenado | operation=store_verification | status=success',
      );
    } catch {
      this.logger.error(
        '[SESSION] Falha ao armazenar código 2FA | operation=store_verification | status=failed',
      );
      throw new Error('Falha ao armazenar código de verificação');
    }
  }

  /**
   * Verifica se o código de verificação é válido para a sessão
   */
  async verifyCode(sessionId: string, code: string): Promise<boolean> {
    try {
      const key = `verification_code:${sessionId}`;
      const storedCode = await this.redis.get(key);

      if (!storedCode) {
        this.logger.warn(
          '[SESSION] Código 2FA ausente ou expirado | operation=verify_code | status=not_found',
        );
        return false;
      }

      const isValid = storedCode === code;

      if (isValid) {
        // Deletar o código após uso válido (uso único)
        await this.redis.del(key);
        this.logger.log(
          '[SESSION] Código 2FA validado e removido | operation=verify_code | status=success',
        );
      }

      return isValid;
    } catch {
      this.logger.error(
        '[SESSION] Falha ao verificar código 2FA | operation=verify_code | status=failed',
      );
      return false;
    }
  }

  /**
   * Remove o código de verificação (para reenvio de novo código)
   */
  async deleteVerificationCode(sessionId: string): Promise<void> {
    try {
      const key = `verification_code:${sessionId}`;
      await this.redis.del(key);
      this.logger.log(
        '[SESSION] Código 2FA removido | operation=delete_verification | status=success',
      );
    } catch {
      this.logger.error(
        '[SESSION] Falha ao remover código 2FA | operation=delete_verification | status=failed',
      );
      throw new Error('Falha ao remover código de verificação');
    }
  }

  /**
   * Verifica se existe código de verificação pendente para a sessão
   */
  async hasPendingVerificationCode(sessionId: string): Promise<boolean> {
    try {
      const key = `verification_code:${sessionId}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch {
      this.logger.error(
        '[SESSION] Falha ao verificar código 2FA pendente | operation=has_pending_verification | status=failed',
      );
      return false;
    }
  }

  async getSessionTTL(sessionId: string): Promise<number> {
    try {
      const key = `session:${sessionId}`;
      const ttl = await this.redis.ttl(key);
      return ttl > 0 ? ttl : this.DEFAULT_TTL;
    } catch {
      this.logger.error(
        '[SESSION] Falha ao buscar TTL da sessão | operation=get_session_ttl | status=failed',
      );
      return this.DEFAULT_TTL;
    }
  }

  /**
   * Invalida todas as sessões ativas de um user (todas as chaves session:* que
   * contem o userId no payload). Usado quando dados do user mudam (ex.: nova startup) e
   * queremos forcar reload do payload.
   *
   * Implementacao: SCAN session:* com padrao, parsear JSON de cada uma, deletar
   * as que tiverem o id do user. Custo O(N) onde N = numero de sessoes ativas.
   * Para um founder tipico (1-3 devices) e' aceitavel.
   *
   * A-Pentest#3 (audit): alem de deletar sessoes existentes via SCAN,
   * seta um timestamp `sessions_revoked_at:{userId}` ANTES do SCAN.
   * AuthGuard checa este timestamp contra `session.createdAt` — sessoes
   * criadas durante o SCAN (TOCTOU race) sao invalidadas tambem.
   *
   * @param userId ID numerico do usuario cujo userId no payload da sessao deve bater
   * @returns numero de sessoes deletadas
   */
  async invalidateAllUserSessions(userId: number): Promise<number> {
    try {
      // 1. Seta epoch de revogacao ANTES do SCAN (TOCTOU safe).
      // HIGH #1 (3a auditoria): TTL no proprio SET — se o EXPIRE posterior
      // falhar, a chave ainda tem TTL e expira sozinha (evita user trancado
      // para sempre se Redis crash entre SET e EXPIRE).
      const revokedAtKey = `sessions_revoked_at:${userId}`;
      const revokedAt = Date.now();
      await this.redis.set(revokedAtKey, revokedAt.toString(), 'EX', 86400);

      const pattern = 'session:*';
      let cursor = '0';
      let count = 0;
      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = next;
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            try {
              const session = JSON.parse(data);
              // O payload da sessao tem o user.id no top-level (e o userId sendo string do UUID)
              if (session?.id === userId) {
                await this.redis.del(key);
                count++;
              }
            } catch {
              /* skip malformed */
            }
          }
        }
      } while (cursor !== '0');

      return count;
    } catch (error) {
      this.logger.error(`Erro ao invalidar sessoes do user ${userId}`, error);
      return 0;
    }
  }

  /**
   * A-Pentest#3 (audit): retorna o timestamp de revogacao para um user.
   * AuthGuard usa para invalidar sessoes criadas DURANTE o SCAN do dismiss.
   */
  async getRevocationTimestamp(userId: number): Promise<number | null> {
    try {
      const value = await this.redis.get(`sessions_revoked_at:${userId}`);
      return value ? parseInt(value, 10) : null;
    } catch {
      return null;
    }
  }

  // LOW #8 (3a auditoria): _legacyInvalidate dead code removido. Era copia
  // exata de invalidateAllUserSessions sem o SET revoked_at (pior versao)
  // e nunca era chamado.

  /**
   * Atualiza EM PLACE o campo `subscriptions` nas sessões ativas de um usuário,
   * preservando todo o resto do payload (af2Verified, lastAccessAt, role, etc.)
   * e o TTL restante de cada chave.
   *
   * Diferente de `invalidateAllUserSessions` (que DELETA a sessão e deslogaria
   * o usuário), este método mantém a sessão válida — apenas reflete o novo
   * estado de assinaturas. É o que o gate (`applySessionFilters`) lê para
   * liberar rotas privadas após a contratação de um plano, sem exigir novo
   * login e sem o rebote para /pricing.
   *
   * @param userId  id numérico do usuário (top-level `id` no payload)
   * @param subscriptions  novo array de assinaturas (já projetado)
   * @returns número de sessões atualizadas
   */
  /**
   * Atualização atômica de `lastAccessAt` via Lua script Redis.
   *
   * O padrário read-modify-write anterior (GET → modify → SET) tinha race
   * condition com `refreshUserSubscriptions`: se `touchLastAccess` lesse a
   * sessão antes da atualização de subscriptions e gravasse depois, ele
   * sobrescrevia as subscriptions novas com as antigas.
   *
   * O Lua script abaixo roda atomicamente no Redis (single-threaded para
   * scripts) e atualiza APENAS o campo `lastAccessAt` dentro do JSON,
   * preservando qualquer `subscriptions` atualizado concorrentemente.
   */
  private static readonly TOUCH_LUA = `
    local raw = redis.call('GET', KEYS[1])
    if not raw then return 0 end
    local ok, obj = pcall(cjson.decode, raw)
    if not ok or type(obj) ~= 'table' then return 0 end
    obj['lastAccessAt'] = ARGV[1]
    local ttl = redis.call('TTL', KEYS[1])
    if ttl <= 0 then return 0 end
    redis.call('SETEX', KEYS[1], ttl, cjson.encode(obj))
    return 1
  `;

  async touchLastAccess(
    sessionId: string,
    isoTimestamp: string,
  ): Promise<void> {
    try {
      const key = `session:${sessionId}`;
      const result = await this.redis.eval(
        SessionService.TOUCH_LUA,
        1,
        key,
        isoTimestamp,
      );
      if (result === 0) return; // sessão não existe ou TTL expirado
    } catch {
      this.logger.warn(
        '[SESSION] Falha ao atualizar lastAccessAt | operation=touch_last_access | status=failed',
      );
    }
  }

  /**
   * Atualiza somente os campos públicos de perfil em todas as sessões ativas
   * do usuário, preservando 2FA, lastAccessAt, subscriptions e o TTL.
   *
   * Usa Lua script atômico para evitar race condition com `touchLastAccess`
   * e `refreshUserSubscriptions`.
   */
  private static readonly REFRESH_PROFILE_LUA = `
    local raw = redis.call('GET', KEYS[1])
    if not raw then return 0 end
    local ok, obj = pcall(cjson.decode, raw)
    if not ok or type(obj) ~= 'table' then return 0 end
    local patch = cjson.decode(ARGV[1])
    for k, v in pairs(patch) do obj[k] = v end
    local ttl = redis.call('TTL', KEYS[1])
    if ttl <= 0 then return 0 end
    redis.call('SETEX', KEYS[1], ttl, cjson.encode(obj))
    return 1
  `;

  /**
   * Atualiza a sessão que originou a requisição sem depender de SCAN.
   * O cookie `session_id` aponta para uma chave específica; essa escrita
   * direta evita que o PATCH responda com sucesso enquanto o SSR continua
   * lendo um snapshot antigo do Redis após um F5.
   */
  async refreshUserProfileForSession(
    sessionId: string,
    userId: number,
    profile: object,
  ): Promise<boolean> {
    if (!sessionId) return false;

    const key = `session:${sessionId}`;
    try {
      const data = await this.redis.get(key);
      if (!data) {
        this.logger.warn(
          '[SESSION] Sessão atual não encontrada ao atualizar perfil | operation=refresh_profile | status=not_found',
        );
        return false;
      }

      const session = JSON.parse(data) as { id?: unknown };
      if (Number(session.id) !== userId) {
        this.logger.warn(
          '[SESSION] Sessão não pertence ao usuário informado | operation=refresh_profile | status=ownership_mismatch',
        );
        return false;
      }

      const result = await this.redis.eval(
        SessionService.REFRESH_PROFILE_LUA,
        1,
        key,
        JSON.stringify(profile),
      );
      return Number(result) === 1;
    } catch {
      this.logger.error(
        '[SESSION] Falha ao atualizar sessão atual | operation=refresh_profile | status=failed',
      );
      return false;
    }
  }

  async refreshUserProfile(
    userId: number,
    profile: object,
    excludedSessionId?: string,
  ): Promise<number> {
    try {
      const patchJson = JSON.stringify(profile);
      const pattern = 'session:*';
      const excludedKey = excludedSessionId
        ? `session:${excludedSessionId}`
        : null;
      let cursor = '0';
      let count = 0;
      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = next;
        for (const key of keys) {
          if (key === excludedKey) continue;
          try {
            const data = await this.redis.get(key);
            if (!data) continue;

            const session = JSON.parse(data);
            if (Number(session?.id) !== userId) continue;

            const result = await this.redis.eval(
              SessionService.REFRESH_PROFILE_LUA,
              1,
              key,
              patchJson,
            );
            if (Number(result) === 1) count++;
          } catch {
            /* ignora sessões legadas malformadas */
          }
        }
      } while (cursor !== '0');
      return count;
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar perfil nas sessões do user ${userId}`,
        error,
      );
      return 0;
    }
  }

  /**
   * Atualiza `subscriptions` de forma atômica em todas as sessões do usuário.
   *
   * Usa SCAN para filtrar por userId (preserva a lógica de isolamento) e
   * Lua script para cada escrita individual, evitando race condition com
   * `touchLastAccess` que pode sobrescrever subscriptions stale.
   */
  private static readonly REFRESH_SUBS_LUA = `
    local raw = redis.call('GET', KEYS[1])
    if not raw then return 0 end
    local ok, obj = pcall(cjson.decode, raw)
    if not ok or type(obj) ~= 'table' then return 0 end
    obj['subscriptions'] = cjson.decode(ARGV[1])
    local ttl = redis.call('TTL', KEYS[1])
    if ttl <= 0 then return 0 end
    redis.call('SETEX', KEYS[1], ttl, cjson.encode(obj))
    return 1
  `;

  async refreshUserSubscriptions(
    userId: number,
    subscriptions: unknown[],
  ): Promise<number> {
    try {
      const subsJson = JSON.stringify(subscriptions);
      const pattern = 'session:*';
      let cursor = '0';
      let count = 0;
      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = next;
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (!data) continue;
          try {
            const session = JSON.parse(data);
            if (session?.id !== userId) continue;
            const result = await this.redis.eval(
              SessionService.REFRESH_SUBS_LUA,
              1,
              key,
              subsJson,
            );
            if (result === 1) count++;
          } catch {
            /* skip malformed */
          }
        }
      } while (cursor !== '0');
      return count;
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar subscriptions das sessões do user ${userId}`,
        error,
      );
      return 0;
    }
  }
}
