import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRE_FRESH_2FA_KEY = 'requireFresh2fa';

@Injectable()
export class TwoFactorGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireFresh = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_FRESH_2FA_KEY,
      [context.getHandler(), context.getClass()],
    );
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('not_authenticated');
    }

    const af2VerifiedAt = user.af2VerifiedAt
      ? new Date(user.af2VerifiedAt)
      : null;

    if (!af2VerifiedAt) {
      throw new UnauthorizedException({
        code: 'af2_required',
        message: 'Operação requer 2FA recente',
      });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    if (requireFresh && af2VerifiedAt < fiveMinutesAgo) {
      throw new UnauthorizedException({
        code: 'af2_expired',
        message: '2FA expirou (>5min). Refaça o verify-code.',
      });
    }

    return true;
  }
}
