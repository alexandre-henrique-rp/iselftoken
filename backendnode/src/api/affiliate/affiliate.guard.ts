import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/** Slug do plano pago exigido para atuar como afiliado (ver prisma/seed.ts). */
export const AFFILIATE_PLAN_SLUG = 'plano-afiliado';

/** Papeis cujo cadastro ja foi aprovado e portanto podem se candidatar. */
const ELIGIBLE_ROLES = ['FOUNDER', 'INVESTOR'];

/**
 * Exige que o usuario seja um fundador ou investidor aprovado E tenha
 * assinatura ACTIVE e nao expirada do plano-afiliado.
 *
 * Usar sempre depois de `AuthGuard`, que popula `request.user`.
 */
@Injectable()
export class AffiliateGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Não autenticado');
    }

    if (!ELIGIBLE_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Apenas fundadores e investidores aprovados podem atuar como afiliados',
      );
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        plan: { slug: AFFILIATE_PLAN_SLUG },
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'É necessário ter assinatura ativa do plano AFILIADO',
      );
    }

    return true;
  }
}
