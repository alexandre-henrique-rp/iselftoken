import { ForbiddenException, Injectable } from '@nestjs/common';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Validador de Plano Fundador (Domain Layer)
 *
 * Responsabilidade:
 * - Validar se usuário possui plano fundador ativo
 * - Verificar se a assinatura não está expirada
 * - Atualizar status de assinaturas expiradas
 *
 * Dependências:
 * - PrismaService: Acesso ao banco de dados para consultar e atualizar assinaturas
 */
@Injectable()
export class ValidateFundador {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida se o usuário possui plano fundador ativo e válido
   * @name validateFundadorPlan
   * @description Verifica se o usuário tem assinatura ativa do plano fundador e não expirada.
   *              ADMIN users bypassam a verificação de plano.
   *
   * @param user PayloadEntity com dados do usuário autenticado
   * @returns boolean true se tem plano fundador válido, false caso contrário
   */
  async validateFundadorPlan(user: PayloadEntity): Promise<boolean> {
    // ADMIN bypass: admins podem acessar recursos de founder sem plano
    if (this.isAdmin(user)) {
      return true;
    }

    // Busca assinaturas do usuário no banco (user do JWT não tem subscriptions)
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId: user.id },
      include: { plan: true },
    });

    const fundadorSubscriptions = subscriptions.filter((sub: any) =>
      sub.plan?.slug?.toLowerCase().includes('fundador'),
    );

    if (!fundadorSubscriptions || fundadorSubscriptions.length === 0) {
      return false;
    }

    // Verifica cada assinatura do plano fundador
    for (const subscription of fundadorSubscriptions) {
      const isExpired = subscription.expiresAt
        ? new Date(subscription.expiresAt) < new Date()
        : true;

      if (subscription.status === 'ACTIVE' && isExpired) {
        // Atualiza status para EXPIRED se estiver vencido
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });
      }

      // Retorna true se encontrar alguma assinatura ativa e não expirada
      if (subscription.status === 'ACTIVE' && !isExpired) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verifica se o usuário tem role ADMIN (bypass de validação de plano)
   */
  private isAdmin(user: PayloadEntity): boolean {
    return user.role === 'ADMIN';
  }

  /**
   * Valida se o usuário possui plano fundador e lança exceção se não tiver
   * @name validateOrThrow
   * @description Similar ao validateFundadorPlan, mas lança ForbiddenException se inválido.
   *              ADMIN users bypassam a verificação de plano.
   *
   * @param user PayloadEntity com dados do usuário autenticado
   * @throws ForbiddenException Se o usuário não possui plano fundador ativo e não é ADMIN
   */
  async validateOrThrow(user: PayloadEntity): Promise<void> {
    // ADMIN bypass: admins podem acessar recursos de founder sem plano
    if (this.isAdmin(user)) {
      return;
    }

    const hasValidPlan = await this.validateFundadorPlan(user);

    if (!hasValidPlan) {
      throw new ForbiddenException(
        'Acesso negado. Você precisa de um plano Fundador ativo para acessar este recurso.',
      );
    }
  }
}
