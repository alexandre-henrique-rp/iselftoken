/**
 * Helper para resolver o plano (FREE/PRO) de um usuario.
 *
 * Consulta a Subscription ativa do usuario e mapeia para o enum
 * `UserPlan` consumido pelo QuotaService. Usado pelo UploadsController
 * antes de cada upload para validar quota por plano.
 *
 * Heuristica de tier:
 * - Plano com slug contendo "pro" => UserPlan.PRO
 * - Qualquer outro (ou sem subscription ativa) => UserPlan.FREE
 *
 * @service UserPlanHelper
 * @see PRD scripts/PRD_UPLOAD_DE_ARQUIVOS.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserPlan } from '../services/quota.service';

/**
 * TTL do cache em memoria para plano do usuario (5 minutos).
 * Reduz carga no banco quando o mesmo usuario faz multiplos uploads.
 */
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  plan: UserPlan;
  expiresAt: number;
}

@Injectable()
export class UserPlanHelper {
  private readonly logger = new Logger(UserPlanHelper.name);
  private readonly cache = new Map<number, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna o plano efetivo do usuario.
   *
   * Cache em memoria com TTL de 5min por userId para evitar N queries
   * durante uploads em rajada. Cache eh invalidado implicitamente pelo TTL.
   *
   * @param userId - ID do usuario (integer)
   * @returns Plano do usuario (FREE por padrao)
   *
   * @example
   * const plan = await helper.getPlan(42);
   * if (plan === UserPlan.PRO) { ... }
   */
  async getPlan(userId: number): Promise<UserPlan> {
    if (!Number.isFinite(userId) || userId <= 0) {
      return UserPlan.FREE;
    }

    const cached = this.cache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.plan;
    }

    let plan: UserPlan = UserPlan.FREE;
    try {
      const sub = await this.prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: { plan: { select: { slug: true } } },
      });
      if (sub && sub.plan?.slug?.toLowerCase().includes('pro')) {
        plan = UserPlan.PRO;
      }
    } catch (error) {
      // Falha no banco nao deve bloquear upload: cai pra FREE (limite mais conservador)
      this.logger.warn(
        `[UserPlanHelper] Falha ao resolver plano userId=${userId}, usando FREE: ${error instanceof Error ? error.message : String(error)}`,
      );
      plan = UserPlan.FREE;
    }

    this.cache.set(userId, { plan, expiresAt: now + PLAN_CACHE_TTL_MS });
    return plan;
  }

  /**
   * Invalida cache de um usuario especifico.
   *
   * Util apos eventos que mudam o plano (ex.: payment.confirmed, cancel).
   * O CacheService de subscriptions ja cobre esse caso via invalidacao
   * central, mas este helper expoe cleanup local como rede de seguranca.
   *
   * @param userId - ID do usuario
   */
  invalidate(userId: number): void {
    this.cache.delete(userId);
  }

  /**
   * Limpa todo o cache (uso em testes).
   */
  clear(): void {
    this.cache.clear();
  }
}
