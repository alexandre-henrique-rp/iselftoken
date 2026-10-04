import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class CookiesService {
  private readonly SESSION_COOKIE = 'session_id';
  private readonly TWO_FA_COOKIE = '2fa_token';
  private readonly MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  setSessionCookie(res: Response, sessionId: string): void {
    res.cookie(this.SESSION_COOKIE, sessionId, {
      httpOnly: true,
      // H4 — sameSite=strict (era 'lax') para evitar CSRF via cross-site
      // navigation. Trade-off: links externos que precisam do cookie (ex.:
      // affiliate redirect) precisam de token em query. Aceitável.
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: this.MAX_AGE_MS,
    });
  }

  setSessionCookieWithTTL(
    res: Response,
    sessionId: string,
    ttlSeconds: number,
  ): void {
    res.cookie(this.SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ttlSeconds * 1000,
    });
  }

  clearSessionCookie(res: Response): void {
    res.clearCookie(this.SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  setTwoFaCookie(res: Response, token: string, ttlSeconds?: number): void {
    res.cookie(this.TWO_FA_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ttlSeconds ? ttlSeconds * 1000 : this.MAX_AGE_MS,
    });
  }

  clearTwoFaCookie(res: Response): void {
    res.clearCookie(this.TWO_FA_COOKIE, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  getTwoFaToken(req: Request): string | undefined {
    return req.cookies?.[this.TWO_FA_COOKIE];
  }

  getSessionId(req: Request): string | undefined {
    return req.cookies?.[this.SESSION_COOKIE];
  }
}
