import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SKIP_SESSION_FILTER_KEY } from '../common/decorators/skip-session-filter.decorator';
import { CookiesService } from './cookies/cookies.service';
import { applySessionFilters } from './session/session.filters';
import { SessionService } from './session/session.service';

type SessionUser = {
  id: number;
  publicId: string;
  email: string;
  nome: string;
  role: string;
  telefone: string | null;
  data_nascimento: Date | null;
  genero: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  pais: {
    id: number | null;
    iso3: string;
    nome: string;
    emoji: string;
  } | null;
  bandeira: string | null;
  termosAceitos: boolean;
  politicaAceita: boolean;
  tipo_documento: string | null;
  reg_documento: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  avatar: Record<string, unknown> | null;
  comprovante: Record<string, unknown> | null;
  documento: Record<string, unknown> | null;
  biofacial: Record<string, unknown> | null;
  wallet: Record<string, unknown> | null;
  payments: Record<string, unknown>[];
  subscriptions: Record<string, unknown>[];
  startups: Record<string, unknown>[];
  investments: Record<string, unknown>[];
  tokens: Record<string, unknown>[];
  tokenHistory: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  lastAccessAt?: string;
  af2Verified?: boolean;
  af2VerifiedAt?: string;
  /** A-Pentest#3 (audit): epoch ms de criacao da sessao, usado pelo
   * AuthGuard para invalidar sessoes criadas antes de um dismiss-session. */
  sessionCreatedAt?: number;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly cookiesService: CookiesService,
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const sessionId = this.cookiesService.getSessionId(request as Request);

    if (!sessionId) {
      throw new UnauthorizedException('Sessão não fornecida');
    }

    const user = (await this.sessionService.getSession(
      sessionId,
    )) as SessionUser | null;

    if (!user) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    // A-Pentest#3 (audit): se houve revogacao em massa (dismiss-session) apos
    // a sessao atual ter sido criada, invalida. Resolve race TOCTOU do SCAN.
    const revokedAt = await this.sessionService.getRevocationTimestamp(user.id);
    if (revokedAt !== null) {
      // MEDIUM #5 (3a auditoria): sessoes legadas (pre-deploy do fix) nao
      // tem sessionCreatedAt. Fallback para lastAccessAt como proxy — sessoes
      // antigas serao invalidadas corretamente. Sessoes novas (com
      // sessionCreatedAt) usam o valor mais preciso.
      const sessionCreatedAt =
        (user as any).sessionCreatedAt ??
        (user.lastAccessAt ? new Date(user.lastAccessAt).getTime() : null);
      if (sessionCreatedAt !== null && sessionCreatedAt < revokedAt) {
        throw new UnauthorizedException({
          error: true,
          message: 'Sessão revogada. Faça login novamente.',
          codigo: 401,
          redirect: '/login',
        });
      }
    }

    const skipFilter = this.reflector.getAllAndOverride<boolean>(
      SKIP_SESSION_FILTER_KEY,
      [context.getHandler(), context.getClass()],
    );

    const ADMIN_ROLES = ['ADMIN', 'FINANCEIRO', 'COMPLIANCE'];
    const isAdmin = ADMIN_ROLES.includes(user.role);
    const isAf2Verified = user.af2Verified === true;
    const lastAccessAt = user.lastAccessAt ? new Date(user.lastAccessAt) : null;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const hasRecentAccess = lastAccessAt && lastAccessAt > sevenDaysAgo;

    if (!skipFilter && !isAdmin && !isAf2Verified) {
      throw new UnauthorizedException({
        error: true,
        message: 'Verificação 2FA necessária',
        codigo: 401,
        data: null,
        redirect: '/2fa',
        detalhe: { message: 'Verificação 2FA necessária' },
      });
    }

    if (!skipFilter && !isAdmin && !hasRecentAccess) {
      throw new UnauthorizedException({
        error: true,
        message: 'Acesso expirado. Verificação 2FA necessária.',
        codigo: 401,
        data: null,
        redirect: '/2fa',
        detalhe: { message: 'Acesso expirado. Verificação 2FA necessária.' },
      });
    }

    if (!hasRecentAccess && isAf2Verified) {
      const now = new Date().toISOString();
      user.lastAccessAt = now;
      // Atualização CIRÚRGICA de lastAccessAt: relê a sessão atual do Redis e
      // altera só esse campo. Evita a corrida em que o guard reescreveria o
      // payload inteiro (com `subscriptions` stale do início do request) por
      // cima de um refreshUserSubscriptions concorrente — o que reverteria o
      // plano recém-ativado e causaria rebote para /pricing.
      await this.sessionService.touchLastAccess(sessionId, now);
    }

    request.user = user;

    if (!skipFilter && !isAdmin) {
      const filterResult = applySessionFilters(user);

      if (filterResult?.redirect) {
        throw new UnauthorizedException({
          error: true,
          message: 'Redirecionamento necessário',
          codigo: 401,
          data: null,
          redirect: filterResult.redirect,
          detalhe: { message: 'Redirecionamento necessário' },
        });
      }
    }

    return true;
  }
}
