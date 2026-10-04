import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Resultado do saldo calculado para um usuário.
 */
export interface UserBalance {
  /** Soma dos pagamentos com status PAID (entradas). */
  totalConfirmed: number;
  /** Soma dos pagamentos com status REFUNDED (saídas/estornos). */
  totalRefunded: number;
  /** Saldo líquido: totalConfirmed - totalRefunded. */
  netBalance: number;
  /** Timestamp ISO da geração deste saldo. */
  asOf: string;
}

/**
 * Serviço de saldo do usuário.
 *
 * Calcula o saldo líquido como:
 * - totalConfirmed = soma de todos os Payments com status PAID
 * - totalRefunded  = soma de todos os Payments com status REFUNDED
 * - netBalance     = totalConfirmed - totalRefunded
 *
 * O resultado é cacheado no Redis por 5 minutos (300s) usando a key
 * `balance:user:{userId}`.
 */
@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutos

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Retorna o saldo do usuário com cache Redis de 5min.
   *
   * @param userId ID do usuário logado
   * @returns UserBalance com totalConfirmed, totalRefunded, netBalance e asOf
   */
  async getUserBalance(userId: number): Promise<UserBalance> {
    const cacheKey = `balance:user:${userId}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`[Balance] Cache hit for user=${userId}`);
      return JSON.parse(cached) as UserBalance;
    }

    this.logger.debug(`[Balance] Cache miss for user=${userId}, querying DB`);

    const [confirmed, refunded] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { userId, status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { userId, status: 'REFUNDED' },
        _sum: { amount: true },
      }),
    ]);

    const totalConfirmed = Number(confirmed._sum.amount ?? 0);
    const totalRefunded = Number(refunded._sum.amount ?? 0);
    const netBalance = totalConfirmed - totalRefunded;

    const result: UserBalance = {
      totalConfirmed: Math.round(totalConfirmed * 100) / 100,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
      asOf: new Date().toISOString(),
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(result),
      'EX',
      this.CACHE_TTL_SECONDS,
    );

    return result;
  }
}
