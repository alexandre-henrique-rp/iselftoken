import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

/**
 * Guard para validação dos webhooks PIX da EFI.
 *
 * IMPORTANTE — modelo de segurança da EFI (difere do C6):
 *
 * 1. **mTLS reverso** é validado pelo **Nginx** (TLS terminator no host), NÃO
 *    pela aplicação. O Nginx usa `ssl_verify_client on` com a cadeia pública da
 *    EFI (`certs/efi_webhook/certificate-chain-{homolog,prod}.crt`). Como o TLS
 *    termina no Nginx e o tráfego chega no container via HTTP interno, o Node
 *    NÃO enxerga `peerCertificate` — por isso não validamos mTLS aqui.
 *
 * 2. **IP whitelist**: a EFI envia os callbacks a partir de um IP fixo
 *    (`34.193.116.226`). Como o request passa pelo Nginx, o IP de origem chega
 *    em `X-Forwarded-For` / `X-Real-IP`.
 *
 * 3. **HMAC na query string**: a URL cadastrada na EFI carrega um parâmetro de
 *    identificação (`?hmac=<segredo>&ignorar=`). A EFI reenvia esse parâmetro em
 *    todos os callbacks; a aplicação valida sua presença/igualdade antes de
 *    processar. NÃO existe `X-Efi-Signature` nem `X-Efi-Timestamp` — esses eram
 *    padrão C6 e foram removidos.
 *
 * @see https://dev.efipay.com.br/docs/api-pix/webhooks
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  /** IP oficial utilizado pela EFI nos callbacks (doc oficial). */
  private readonly efiIps = new Set(['34.193.116.226']);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // Em desenvolvimento/homologação local, libera para facilitar os testes.
    if (process.env['NODE_ENV'] === 'development') {
      return true;
    }

    // 1. HMAC na query string (?hmac=...). Camada de origem da EFI.
    const expected = this.config.get<string>('EFI_WEBHOOK_HMAC_SECRET') ?? '';
    const received = this.extractHmac(req);

    if (!expected) {
      this.logger.error('EFI_WEBHOOK_HMAC_SECRET não configurado');
      throw new UnauthorizedException('Webhook HMAC não configurado');
    }

    if (!received || !this.safeEqual(received, expected)) {
      this.logger.warn('Webhook EFI rejeitado: HMAC ausente ou inválido');
      throw new UnauthorizedException('HMAC inválido');
    }

    // 2. IP whitelist (origem via Nginx). Só valida em produção.
    if (process.env['NODE_ENV'] === 'production') {
      const clientIp = this.extractClientIp(req);
      if (!clientIp || !this.efiIps.has(clientIp)) {
        this.logger.warn(`Webhook EFI rejeitado: IP não autorizado`);
        throw new UnauthorizedException('IP não autorizado');
      }
    }

    return true;
  }

  /**
   * Extrai o HMAC da query string. Aceita tanto `hmac` quanto o parâmetro
   * `req.query` já parseado pelo Express.
   */
  private extractHmac(req: {
    query?: Record<string, unknown>;
    url?: string;
    originalUrl?: string;
  }): string | null {
    const fromQuery = req.query?.['hmac'];
    if (typeof fromQuery === 'string' && fromQuery.length > 0) {
      return fromQuery;
    }

    // Fallback: parseia da URL crua (defensivo, caso o parser não popule query).
    const raw = req.originalUrl ?? req.url ?? '';
    const match = raw.match(/[?&]hmac=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /**
   * Extrai o IP do cliente considerando o proxy do Nginx.
   */
  private extractClientIp(req: {
    headers?: Record<string, unknown>;
    ip?: string;
    socket?: { remoteAddress?: string };
  }): string | null {
    const xff = req.headers?.['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      // Primeiro IP da cadeia = cliente original.
      return xff.split(',')[0]?.trim() ?? null;
    }
    const realIp = req.headers?.['x-real-ip'];
    if (typeof realIp === 'string' && realIp.length > 0) {
      return realIp.trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? null;
  }

  /**
   * Comparação em tempo constante para evitar timing attacks.
   */
  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}
