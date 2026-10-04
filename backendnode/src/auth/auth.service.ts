import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as Sentry from '@sentry/nestjs';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { Role } from 'src/api/users/dto/update-user.dto';
import { AuditService } from 'src/common/audit/audit.service';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RequestCodeDto } from './dto/request-code.dto';
import {
  LoginAlertService,
  PendingLoginAlert,
} from './services/login-alert.service';
import { LoginLockoutService } from './services/login-lockout.service';
import {
  TrustedClientContext,
  TrustedClientContextResolver,
  classifyClientIp,
} from './services/trusted-client-context.service';
import {
  pickPublicSessionPayload,
  publicSessionProfileSelect,
} from './session/public-payload';
import { SessionService } from './session/session.service';

/**
 * Sanity check defensivo de IPv4/IPv6 — usado em `extractIpUa`
 * para revalidar `clientIp` mesmo após o DTO (@IsIP). Não confiar
 * apenas no ValidationPipe porque o service pode ser chamado em
 * testes, jobs ou via outra porta que pula o pipe.
 *
 * IPv6 permissivo: aceita forma completa (8 grupos) ou contraída
 * (com `::`). Restringe caracteres a hex + `:` para evitar lixo /
 * injection; validação completa exigiria lib dedicada e não muda o
 * risco real (fingerprint do LoginAlertService usa SHA-256).
 */
const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;

function isValidIpString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v.length === 0 || v.length > 45) return false;
  if (IPV4_RE.test(v)) return true;
  if (v.includes(':') && IPV6_RE.test(v)) return true;
  return false;
}

/**
 * Trunca coordenada para 2 casas decimais (~1.1km de precisao).
 * Reduz granularidade do PII sensivel (LGPD art. 5, II — localizacao).
 * Granularidade suficiente para "pais/regiao" no audit sem revelar
 * endereco ou bloco. Logamos apenas a forma truncada.
 */
function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

const ACCESS_ALERT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

type NormalizedClientIpMetadata = {
  hostname: string | null;
  ip: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  local: string | null;
  provedor: string | null;
  timezone: string | null;
  capturedAt: Date | null;
};

function normalizeClientIpMetadata(
  metadata?: Record<string, unknown>,
): NormalizedClientIpMetadata {
  const text = (key: string, maxLength = 255): string | null => {
    const value = metadata?.[key];
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized ? normalized.slice(0, maxLength) : null;
  };
  const rawIp = text('ip', 45);
  const rawCapturedAt = metadata?.['horário'];
  const capturedAt =
    typeof rawCapturedAt === 'string' || typeof rawCapturedAt === 'number'
      ? new Date(rawCapturedAt)
      : null;

  return {
    hostname: text('hostname'),
    ip: isValidIpString(rawIp) ? rawIp.trim() : null,
    cidade: text('cidade'),
    estado: text('estado'),
    pais: text('pais'),
    local: text('local'),
    provedor: text('provedor'),
    timezone: text('timezone', 128),
    capturedAt:
      capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt : null,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
    private readonly lockoutService: LoginLockoutService,
    private readonly loginAlertService: LoginAlertService,
    private readonly auditService: AuditService,
    @Optional() private readonly contextResolver?: TrustedClientContextResolver,
  ) {}

  private readonly userSelectWithRelations = {
    // Campos básicos do usuário (exceto senha)
    id: true,
    publicId: true,
    email: true,
    nome: true,
    role: true,
    telefone: true,
    data_nascimento: true,
    genero: true,
    endereco: true,
    numero: true,
    complemento: true,
    bairro: true,
    cidade: true,
    uf: true,
    cep: true,
    pais: true,
    bandeira: true,
    paisCountry: {
      select: {
        id: true,
        name: true,
        iso3: true,
        emoji: true,
      },
    },
    termosAceitos: true,
    politicaAceita: true,
    tipo_documento: true,
    reg_documento: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    // Relacionamentos
    wallet: true,
    payments: true,
    subscriptions: {
      include: {
        plan: true,
      },
    },
    startups: true,
    investments: true,
    tokens: true,
    tokenHistory: true,
    auditLogs: true,
    avatar: true,
    comprovante: true,
    documento: true,
    biofacial: true,
  };

  /**
   * Select mínimo para popular a sessão pública.
   * Usado em `create` e `createDevAdmin`. Em `login` mantemos o select cheio
   * para não alterar contratos com testes E2E (a projeção
   * `pickPublicSessionPayload` é quem decide o que entra no Redis).
   *
   * Regra: este select deve conter EXATAMENTE os campos que
   * `pickPublicSessionPayload` lê. Adicionar campo no payload? Adicione
   * aqui também.
   */
  private readonly publicSessionSelect = {
    id: true,
    publicId: true,
    email: true,
    nome: true,
    role: true,
    ...publicSessionProfileSelect,
    pais: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    wallet: {
      select: { id: true, updatedAt: true },
    },
    subscriptions: {
      select: {
        id: true,
        userId: true,
        planId: true,
        status: true,
        startedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        plan: {
          select: {
            id: true,
            nome: true,
            slug: true,
            descricao: true,
            preco: true,
            periodoMeses: true,
            periodo: true,
          },
        },
      },
    },
    startups: { select: { id: true } },
  };

  async login(data: LoginAuthDto, req?: Request) {
    return Sentry.startSpan({ op: 'auth.login', name: 'Login' }, async () => {
      try {
        // QA MED-01 — defesa em profundidade. DTO ja valida email via
        // @IsEmail() mas servico pode ser chamado direto (testes, jobs)
        // sem passar pelo ValidationPipe.
        if (!data?.email || typeof data.email !== 'string') {
          throw new HttpException(
            ResponseDto.error('Email obrigatorio.', 400),
            400,
          );
        }
        const lowerEmail = data.email.toLowerCase().trim();
        const ipUa = this.extractIpUa(req);

        // Fase A.2 — checa lockout ANTES de qualquer consulta ao DB
        // (caminho barato + defesa em profundidade ao ThrottlerGuard).
        const lockTTL = await this.lockoutService.getLockTTL(lowerEmail);
        if (lockTTL > 0) {
          await this.auditService.log({
            userId: null,
            action: 'LOGIN_FAIL',
            entity: 'User',
            // A-QA#8 (audit LGPD): hash do email em vez do email puro.
            // Email continua em newValue (necessario para UX/investigacao),
            // mas entityId (coluna separada) guarda um identificador opaco.
            entityId: this.hashEmailForAudit(lowerEmail),
            ip: ipUa.trustedIp ?? undefined,
            newValue: {
              email: lowerEmail,
              reason: 'ACCOUNT_LOCKED',
              lockSecondsRemaining: lockTTL,
            },
          });
          const minutes = Math.ceil(lockTTL / 60);
          throw new HttpException(
            ResponseDto.error(
              `Conta bloqueada por excesso de tentativas. Tente novamente em ${minutes} minuto(s).`,
              429,
              { code: 'ACCOUNT_LOCKED', lockSeconds: lockTTL },
            ),
            429,
          );
        }

        const user = await this.prisma.user.findUnique({
          where: { email: lowerEmail },
          select: {
            ...this.userSelectWithRelations,
            senha: true,
            requirePasswordReset: true, // H2 — flag de forcar troca de senha
          },
        });

        // M1+M2 — bcrypt com dummy hash quando user e null ou !senha.
        // Equaliza timing de resposta (anti-enumeração: nao da pra saber
        // se user existe/senha-null por latência).
        const DUMMY_HASH =
          '$2b$10$CwTycUXWue0Thq9StjUM0uJ8VhE0pEMQ9X8pQvF9Y5qYhB6hR0eG';
        const compareWithDummy = async () => {
          // bcrypt.compare e constant-time por si so; a ideia e GARANTIR
          // que SEMPRE chama bcrypt em todos os branches.
          try {
            await bcrypt.compare(
              data.senha ?? 'dummy',
              user?.senha ?? DUMMY_HASH,
            );
          } catch {
            // ignore — dummy hash pode falhar em formatos invalidos
          }
        };

        // Helper para registrar falha + aplicar lockout se threshold atingido.
        // C2: so conta quando user existe (anti-DoS — atacante nao pode
        // lockar contas alheias sem saber a senha).
        const recordFail = async (reason: string, userExists: boolean) => {
          const lockout = await this.lockoutService.incrementFailures(
            lowerEmail,
            userExists,
          );
          await this.auditService.log({
            userId: user?.id ?? null,
            action: lockout.locked ? 'LOGIN_FAIL_LOCKED' : 'LOGIN_FAIL',
            entity: 'User',
            // A-QA#8 (audit LGPD): entityId opaco quando user nao existe.
            entityId: user?.publicId ?? this.hashEmailForAudit(lowerEmail),
            ip: ipUa.trustedIp ?? undefined,
            newValue: {
              email: lowerEmail,
              reason,
              failedAttempts: lockout.failedAttempts,
              lockSeverity: lockout.severity,
              lockSeconds: lockout.lockSeconds,
              skippedLockout: lockout.skipped,
            },
          });
          if (lockout.locked) {
            const minutes = Math.ceil(lockout.lockSeconds / 60);
            throw new HttpException(
              ResponseDto.error(
                `Conta bloqueada por excesso de tentativas. Tente novamente em ${minutes} minuto(s).`,
                429,
                {
                  code: 'ACCOUNT_LOCKED',
                  severity: lockout.severity,
                  lockSeconds: lockout.lockSeconds,
                },
              ),
              429,
            );
          }
        };

        if (!user) {
          await compareWithDummy();
          await recordFail('USER_NOT_FOUND', false);
          // Mensagem genérica: não revela se o email existe (anti-enumeração)
          throw new HttpException(
            ResponseDto.error(
              'Credenciais inválidas, email ou senha incorreto',
              401,
            ),
            401,
          );
        }

        // M1+M2 — sempre chama bcrypt (mesmo se senha for null) para
        // equalizar timing. Remove a 2a chamada redundante abaixo.
        if (!user.isActive) {
          await compareWithDummy();
          await recordFail('USER_INACTIVE', true);
          // Mensagem específica: usuário existe e está suspenso.
          throw new HttpException(
            ResponseDto.error(
              'Conta suspensa. Entre em contato com o suporte para reativar.',
              401,
              { code: 'ACCOUNT_SUSPENDED' },
            ),
            401,
          );
        }

        if (!user.senha) {
          await compareWithDummy();
          await recordFail('NO_PASSWORD_SET', true);
          throw new HttpException(
            ResponseDto.error(
              'Credenciais inválidas, email ou senha incorreto',
              401,
              { message: 'senha incorreta' },
            ),
            401,
          );
        }

        const isPasswordValid = await this.validatePassword(data.senha, user);

        if (!isPasswordValid) {
          await recordFail('INVALID_PASSWORD', true);
          Sentry.setTag('auth.login.failure', 'invalid_password');
          throw new HttpException(
            ResponseDto.error(
              'Credenciais inválidas, email ou senha incorreto',
              401,
              { message: 'senha incorreta' },
            ),
            401,
          );
        }

        // H2 — flag de troca de senha obrigatória (dismiss-session setou).
        // Bloqueia o login com 403 ate o user trocar a senha.
        if (user.requirePasswordReset) {
          await this.auditService.log({
            userId: user.id,
            action: 'LOGIN_BLOCKED_PASSWORD_RESET',
            entity: 'User',
            entityId: user.publicId,
            ip: ipUa.trustedIp ?? undefined,
            newValue: { email: lowerEmail },
          });
          throw new HttpException(
            ResponseDto.error(
              'Por seguranca, voce precisa redefinir sua senha antes de continuar.',
              403,
              {
                code: 'PASSWORD_RESET_REQUIRED',
                requirePasswordReset: true,
                sessionId: null,
              },
            ),
            403,
          );
        }

        // === LOGIN OK ===

        // Fase A.2 — limpa contadores de falha
        await this.lockoutService.clearOnSuccess(lowerEmail);

        // Fase A.1 — audit log de sucesso
        await this.auditService.log({
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          entity: 'User',
          entityId: user.publicId,
          ip: ipUa.trustedIp ?? undefined,
          newValue: {
            email: lowerEmail,
            userAgent: ipUa.userAgent,
            sessionId: '(criada abaixo)',
          },
        });

        const sessionId = crypto.randomUUID();

        // Projeção enxuta: grava no Redis apenas os campos do payload público
        // (id, publicId, email, nome, role, pais, isActive, createdAt,
        // updatedAt, wallet, subscriptions, startups). Sem senha, sem relações
        // pesadas (payments, investments, tokens, auditLogs, kyc files).
        // Campos de controle (lastAccessAt, af2Verified) são adicionados pelo
        // próprio SessionService quando necessário.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { senha: _senha, ...userWithoutPassword } = user;
        const sessionData = pickPublicSessionPayload(userWithoutPassword);
        await this.sessionService.createSession(sessionId, sessionData);

        // O acesso só é persistido depois da confirmação do 2FA, em
        // recordAuthenticatedAccess(), com o metadata capturado no navegador.
        // O AuditLog LOGIN_SUCCESS acima continua preservando a auditoria da
        // autenticação de credenciais sem criar um AccessLog prematuro.

        // O alerta definitivo só é processado após o segundo fator.
        // Redis recebe apenas contexto técnico mínimo e temporário.
        if (this.sessionService.storePendingLoginAlert) {
          await this.sessionService.storePendingLoginAlert(sessionId, {
            eventKey: crypto.randomUUID(),
            userId: user.id,
            context: ipUa.context,
            userAgent: ipUa.userAgent,
          });
        }

        const code = this.generateVerificationCode();
        await this.sessionService.storeVerificationCode(sessionId, code, 300);

        const emailResult = await this.emailService.sendVerificationCodeEmail(
          user.email,
          user.nome,
          code,
          'Autenticar seu acesso',
          data.urlRedirect,
        );

        if (emailResult?.success === false) {
          await this.sessionService.deleteVerificationCode(sessionId);
          await this.sessionService.deleteSession(sessionId);
          this.logger.error(
            '[AUTH] Falha ao enviar código 2FA pelo serviço SMTP',
          );
          throw new HttpException(
            ResponseDto.error(
              'Não foi possível enviar o código de verificação. Tente novamente.',
              HttpStatus.SERVICE_UNAVAILABLE,
            ),
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }

        this.logger.log('📧 [AUTH] Envio do código 2FA solicitado');
        // TODO @dev: remover logs de código em produção — risco de segurança

        Sentry.setTag('auth.login.success', true);
        Sentry.setUser({ id: String(user.id) });

        return ResponseDto.success(
          'Código de verificação enviado para seu email',
          200,
          {
            id: user.id,
            email: user.email,
            nome: user.nome,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            sessionId,
            subscriptions: user.subscriptions,
            requiresVerification: true,
          },
        );
      } catch (error) {
        Sentry.setTag('auth.login.success', false);
        // A-QA#7 (audit): NAO vaza stack/message interno ao cliente.
        // Erros HTTP sao repassados com sua mensagem; erros internos
        // recebem mensagem generica + 500. Stack trace fica no Sentry.
        Sentry.captureException(error);
        if (error instanceof HttpException) {
          throw error;
        }
        throw new HttpException(
          ResponseDto.error(
            'Erro ao realizar login',
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
  }

  /**
   * Helper privado: extrai IP + User-Agent do request Express.
   *
   * IMPORTANTE (security review 2026-09-10):
   *  - `trustedIp` vem SEMPRE de `req.ip` (Express normaliza com trust proxy).
   *    E o unico IP que deve entrar em fingerprint SHA-256, AuditLog.ip e
   *    AccessLog.ip. NUNCA aceitar o IP do body como trusted (spoof trivial).
   *  - O campo `clientIp` do body é não confiável e nunca substitui o IP
   *    público de `req.ip` quando este está disponível. Ele só pode ser usado
   *    como fallback observacional quando o servidor recebe loopback, rede
   *    privada ou IP ausente, após validação e classificação como PUBLIC.
   *  - O `clientIpMetadata` também é tratado como metadata não confiável; seus
   *    campos são normalizados antes de persistir e não participam de
   *    autenticação, autorização ou fingerprint de segurança.
   *
   * M5 — userAgent sanitizado (XSS no dashboard admin + chave Redis).
   */
  private extractIpUa(req?: Request): {
    trustedIp: string | null;
    userAgent: string | null;
    context: TrustedClientContext;
  } {
    const context =
      this.contextResolver?.resolve(req) ??
      new TrustedClientContextResolver().resolve(req);
    const rawUa = req ? (req as any)?.headers?.['user-agent'] || null : null;
    const userAgent = rawUa
      ? rawUa
          .toString()
          .replace(/[^\x20-\x7E]/g, '')
          .slice(0, 256) || null
      : null;
    return { trustedIp: context.ip, userAgent, context };
  }

  private async fireLoginAlert(pending: PendingLoginAlert): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: pending.userId },
      select: { id: true, email: true, nome: true },
    });
    if (!user) return;
    const decision = await this.loginAlertService.checkAndAlert({
      userId: pending.userId,
      ip: pending.context.ip,
      userAgent: pending.userAgent,
      context: pending.context,
    });

    await this.auditService.log({
      userId: pending.userId,
      action: decision.alerted ? 'LOGIN_NEW_DEVICE' : 'LOGIN_KNOWN_DEVICE',
      entity: 'User',
      entityId: String(pending.userId),
      ip: pending.context.ip ?? undefined,
      newValue: {
        reason: decision.reason,
        fingerprint: decision.fingerprint,
        ipClass: pending.context.ipClass,
        locationSource: decision.location.source,
        locationPrecision: decision.location.precision,
        deviceType: decision.device.deviceType,
      },
    });

    if (!decision.alerted) {
      await this.loginAlertService.markDeviceAsKnown(
        pending.userId,
        decision.fingerprint,
      );
      await this.loginAlertService.recordLastKnownCountry();
      return;
    }

    const alert = await this.loginAlertService.createPendingAlert({
      eventKey: pending.eventKey,
      userId: pending.userId,
      decision,
    });
    try {
      const result = await this.emailService.sendNewLoginAlertEmail({
        to: user.email,
        nome: user.nome,
        ip: pending.context.ip,
        ipClass: pending.context.ipClass,
        deviceLabel: decision.device.label,
        location: decision.location,
        timestamp: new Date(),
        reason: decision.reason,
        actionToken: alert.actionToken,
      });
      await this.loginAlertService.markDelivery(alert.alertId, {
        success: result.success,
        messageId: result.messageId,
        error: result.success ? undefined : result.message,
      });
      if (result.success) {
        await this.loginAlertService.markDeviceAsKnown(
          pending.userId,
          decision.fingerprint,
        );
        await this.loginAlertService.recordLastKnownCountry();
      }
    } catch (error) {
      await this.loginAlertService.markDelivery(alert.alertId, {
        success: false,
        error: error instanceof Error ? error.message : 'Falha no envio',
      });
      this.logger.warn(
        `Falha no alerta de login userId=${pending.userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * A-QA#8 (audit LGPD): gera hash SHA-256 truncado do email para usar
   * como entityId opaco no AuditLog quando user nao existe. Email real
   * continua em newValue (necessario para correlacao), mas entityId
   * (coluna visivel em queries) nao expoe PII diretamente.
   */
  private hashEmailForAudit(email: string): string {
    return `anon:${crypto
      .createHash('sha256')
      .update(email)
      .digest('hex')
      .slice(0, 16)}`;
  }

  private createEmailDeliveryException(): HttpException {
    return new HttpException(
      ResponseDto.error(
        'Não foi possível enviar o código de verificação. Tente novamente.',
        HttpStatus.SERVICE_UNAVAILABLE,
      ),
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private async clearVerificationCode(
    sessionId: string | undefined,
    operation: string,
  ): Promise<void> {
    if (!sessionId) return;

    try {
      await this.sessionService.deleteVerificationCode(sessionId);
    } catch {
      this.logger.error(
        `[AUTH] Falha ao limpar código 2FA | operation=${operation} | status=cleanup_failed`,
      );
    }
  }

  async newcode(
    data: { email: string; urlRedirect?: string },
    sessionId?: string,
  ) {
    let codeStored = false;

    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        throw new HttpException(
          ResponseDto.error('Usuário não encontrado', 404),
          404,
        );
      }

      const code = this.generateVerificationCode();

      if (sessionId) {
        await this.sessionService.deleteVerificationCode(sessionId);
        await this.sessionService.storeVerificationCode(sessionId, code);
        codeStored = true;
      }

      const emailResult = await this.emailService.sendVerificationCodeEmail(
        user.email,
        user.nome,
        code,
        'validar seu email',
      );

      if (emailResult?.success === false) {
        this.logger.error(
          '[AUTH] Falha ao reenviar código 2FA | operation=newcode | status=failed',
        );
        throw this.createEmailDeliveryException();
      }

      this.logger.log(
        '[AUTH] Reenvio do código 2FA aceito pelo serviço de email | operation=newcode | status=success',
      );

      return ResponseDto.success('Novo código enviado com sucesso', 200);
    } catch (error) {
      if (codeStored) {
        await this.clearVerificationCode(sessionId, 'newcode');
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        '[AUTH] Erro no reenvio do código 2FA | operation=newcode | status=failed',
      );
      throw new HttpException(
        ResponseDto.error(
          'Não foi possível reenviar o código. Tente novamente.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private generateVerificationCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  async recordAuthenticatedAccess(
    sessionId: string,
    req?: Request,
    clientIp?: string,
    clientIpMetadata?: Record<string, unknown>,
  ) {
    const session = (await this.sessionService.getSession(sessionId)) as {
      id?: number;
      af2Verified?: boolean;
    } | null;

    if (!session?.id || session.af2Verified !== true) {
      throw new HttpException(
        ResponseDto.error('Sessão não autorizada', HttpStatus.UNAUTHORIZED),
        HttpStatus.UNAUTHORIZED,
      );
    }

    const claimed = await this.sessionService.claimAccessRecord(sessionId);
    if (!claimed) {
      return ResponseDto.success('Acesso já registrado', 200, {
        recorded: false,
        alertSent: false,
      });
    }

    const previousAccess = await this.prisma.accessLog.findFirst({
      where: { userId: session.id, type: 'AF2_VERIFIED' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const serverIpUa = this.extractIpUa(req);
    const normalizedMetadata = normalizeClientIpMetadata(clientIpMetadata);
    const browserIp = isValidIpString(clientIp)
      ? clientIp.trim()
      : normalizedMetadata.ip;
    const clientIpClass = classifyClientIp(browserIp);
    const useBrowserIpFallback =
      ['LOOPBACK', 'PRIVATE', 'MISSING'].includes(serverIpUa.context.ipClass) &&
      clientIpClass === 'PUBLIC';
    const ipUa = useBrowserIpFallback
      ? {
          trustedIp: browserIp as string,
          userAgent: serverIpUa.userAgent,
          context: {
            ...serverIpUa.context,
            ip: browserIp as string,
            ipClass: clientIpClass,
            proxyChainTrusted: false,
          },
        }
      : serverIpUa;
    const now = new Date();

    await this.prisma.accessLog.create({
      data: {
        userId: session.id,
        type: 'AF2_VERIFIED',
        ip: ipUa.trustedIp,
        ipHostname: normalizedMetadata.hostname,
        ipCity: normalizedMetadata.cidade,
        ipRegion: normalizedMetadata.estado,
        ipCountry: normalizedMetadata.pais,
        ipLocation: normalizedMetadata.local,
        ipOrganization: normalizedMetadata.provedor,
        ipTimezone: normalizedMetadata.timezone,
        ipCapturedAt: normalizedMetadata.capturedAt,
        createdAt: now,
      },
    });

    const accessAfter24Hours = Boolean(
      previousAccess &&
      now.getTime() - new Date(previousAccess.createdAt).getTime() >
        ACCESS_ALERT_THRESHOLD_MS,
    );

    let alertSent = false;
    if (accessAfter24Hours) {
      const user = await this.prisma.user.findUnique({
        where: { id: session.id },
        select: { email: true, nome: true },
      });

      if (user) {
        try {
          const result = await this.emailService.sendAccessWarningEmail({
            to: user.email,
            nome: user.nome,
            ip: ipUa.trustedIp,
            ipClass: ipUa.context.ipClass,
            timestamp: now,
            metadata: normalizedMetadata,
          });
          alertSent = result.success;
        } catch (error) {
          this.logger.warn(
            `Falha ao enviar aviso de acesso userId=${session.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    return ResponseDto.success('Acesso registrado', 200, {
      recorded: true,
      alertSent,
    });
  }

  async verifyCode(sessionId: string, code: string) {
    const isValid = await this.sessionService.verifyCode(sessionId, code);

    if (!isValid) {
      throw new HttpException(
        ResponseDto.error('Código inválido ou expirado', 401),
        401,
      );
    }

    await this.sessionService.verify2FA(sessionId);

    const pending = this.sessionService.consumePendingLoginAlert
      ? await this.sessionService.consumePendingLoginAlert<PendingLoginAlert>(
          sessionId,
        )
      : null;
    if (pending) {
      this.fireLoginAlert(pending).catch((error) => {
        this.logger.warn(
          `Falha ao processar alerta pós-2FA: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }

    return ResponseDto.success('Código verificado com sucesso', 200, {
      af2Verified: true,
    });
  }

  async requestCode(data: RequestCodeDto, sessionId: string) {
    let codeStored = false;

    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        throw new HttpException(
          ResponseDto.error('Usuário não encontrado', 404),
          404,
        );
      }

      const code = this.generateVerificationCode();

      await this.sessionService.deleteVerificationCode(sessionId);
      await this.sessionService.storeVerificationCode(sessionId, code);
      codeStored = true;

      const emailResult = await this.emailService.sendVerificationCodeEmail(
        user.email,
        user.nome,
        code,
        'Autenticar seu acesso',
        data.urlRedirect,
      );

      if (emailResult?.success === false) {
        this.logger.error(
          '[AUTH] Falha ao reenviar código 2FA | operation=request_code | status=failed',
        );
        throw this.createEmailDeliveryException();
      }

      this.logger.log(
        '[AUTH] Reenvio do código 2FA aceito pelo serviço de email | operation=request_code | status=success',
      );

      return ResponseDto.success('Código enviado com sucesso', 200);
    } catch (error) {
      if (codeStored) {
        await this.clearVerificationCode(sessionId, 'request_code');
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        '[AUTH] Erro no reenvio do código 2FA | operation=request_code | status=failed',
      );
      throw new HttpException(
        ResponseDto.error(
          'Não foi possível reenviar o código. Tente novamente.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(data: CreateAuthDto) {
    return Sentry.startSpan(
      { op: 'auth.register', name: 'User Registration' },
      async () => {
        try {
          const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email },
          });

          if (existingUser) {
            Sentry.setTag('auth.register.failure', 'email_exists');
            throw new HttpException(
              ResponseDto.error('Email já cadastrado', 400),
              400,
            );
          }

          if (data.senha != data.senhaConfirmacao) {
            Sentry.setTag('auth.register.failure', 'passwords_mismatch');
            throw new HttpException(
              ResponseDto.error('Senhas não coincidem', 400),
              400,
            );
          }

          const hashedPassword = await bcrypt.hash(data.senha, 10);

          // Validar complexidade da senha
          const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
          if (!passwordRegex.test(data.senha)) {
            Sentry.setTag('auth.register.failure', 'weak_password');
            throw new HttpException(
              ResponseDto.error(
                'Senha deve ter 8+ caracteres, letra maiúscula e número',
                400,
              ),
              400,
            );
          }

          // Criacao atomica: user + wallet via transaction
          // Se wallet falhar, user NAO fica orfao (rollback automatico)
          const result = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
              data: {
                email: data.email,
                nome: data.nome,
                senha: hashedPassword,
                telefone: data.telefone,
                termosAceitos: data.termosAceitos,
                politicaAceita: data.politicaAceita,
                role: (data.role as Role) || 'USER',
              },
              select: {
                id: true,
                email: true,
                nome: true,
                role: true,
                isActive: true,
                createdAt: true,
              },
            });

            if (!user.id) {
              throw new HttpException(
                ResponseDto.error('Erro ao criar usuário', 500),
                500,
              );
            }

            // Wallet criada atomicamente junto com user — SEM lazy creation
            const wallet = await tx.wallet.create({
              data: {
                userId: user.id,
                balance: 0,
                blocked: 0,
                currency: 'BRL',
              },
              select: {
                id: true,
                balance: true,
                blocked: true,
                currency: true,
              },
            });

            return { user, wallet };
          });

          const { user, wallet } = result;

          this.logger.log(
            `Wallet criada para user ${user.id} (walletId=${wallet.id})`,
          );

          const sessionId = crypto.randomUUID();

          // Buscar dados do usuário com relações MÍNIMAS para popular a
          // sessão pública. Evita carregar payments/investments/tokens/
          // auditLogs/kyc que não serão serializados (a projeção
          // `pickPublicSessionPayload` já os descarta).
          const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: this.publicSessionSelect,
          });

          if (fullUser) {
            await this.sessionService.createSession(
              sessionId,
              pickPublicSessionPayload(fullUser),
            );
          }

          await this.emailService.sendWelcomeEmail(user.email, {
            nome: user.nome,
            email: user.email,
          });

          // O código é definido exclusivamente pelo servidor; qualquer valor
          // enviado pelo cliente é ignorado para impedir códigos previsíveis.
          const verificationCode = this.generateVerificationCode();

          await this.emailService.sendVerificationCodeEmail(
            user.email,
            user.nome,
            verificationCode,
            'validar seu email',
            data.urlRedirect,
          );

          // Armazena o código no Redis para validação da sessão.
          await this.sessionService.storeVerificationCode(
            sessionId,
            verificationCode,
            300,
          );

          this.logger.log(
            '📧 [AUTH] Código de verificação de cadastro solicitado',
          );
          // TODO @dev: remover logs de código em produção — risco de segurança

          Sentry.setTag('auth.register.success', true);
          Sentry.setUser({ id: String(user.id) });

          return ResponseDto.success('Usuário criado com sucesso', 201, {
            ...user,
            sessionId,
          });
        } catch (error) {
          Sentry.setTag('auth.register.success', false);
          this.logger.error(
            '[AUTH] Falha no cadastro | operation=register | status=failed',
          );
          throw new HttpException(
            ResponseDto.error('Erro ao criar usuário', 500),
            500,
          );
        }
      },
    );
  }

  async validatePassword(password: string, user: any): Promise<boolean> {
    const isHashValidate = await bcrypt.compare(password, user.senha);
    return isHashValidate;
  }

  async getMe(user: { id: string }) {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id: Number(user.id) },
        select: {
          id: true,
          email: true,
          nome: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!userData) {
        throw new HttpException(
          ResponseDto.error('Usuário não encontrado', 404),
          404,
        );
      }

      return ResponseDto.success('Usuário encontrado', 200, userData);
    } catch (error) {
      throw new HttpException(
        ResponseDto.error('Erro ao buscar usuário', 500, error),
        500,
      );
    }
  }

  async forgotPassword(data: ForgotPasswordDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true, email: true, nome: true, isActive: true },
      });

      if (!user) {
        throw new HttpException(
          ResponseDto.error('e-mail não foi localizado.', 404),
          404,
        );
      }

      if (!user.isActive) {
        throw new HttpException(ResponseDto.error('Usuário inativo', 401), 401);
      }

      // HOTFIX VULN-001: Gerar token JWT de uso único para reset de senha
      const resetToken = this.jwtService.sign(
        { userId: user.id, purpose: 'password_reset' },
        { expiresIn: '15m' },
      );

      // Salvar hash do token no banco para validação e controle de uso único
      const tokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Invalidar tokens anteriores não utilizados para este usuário
      await this.prisma.emailValidation.updateMany({
        where: {
          userId: user.id,
          type: 'PASSWORD_RESET',
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });

      await this.prisma.emailValidation.create({
        data: {
          email: user.email,
          token: tokenHash,
          userId: user.id,
          type: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
        },
      });

      // Enviar email de recuperação com LINK de redefinição (nunca código).
      // O reset é baseado exclusivamente em link tokenizado de uso único; não
      // expomos o token nem qualquer preview no corpo do email.
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      await this.emailService.sendForgotPasswordEmail(user.email, {
        nome: user.nome,
        resetUrl,
        expiresInMinutes: 15,
      });

      this.logger.log('📧 [AUTH] Solicitação de redefinição de senha enviada');

      Sentry.setTag('auth.forgot_password.success', true);
      Sentry.setUser({ id: String(user.id) });

      // NÃO expor userId na resposta (era a vulnerabilidade original)
      return ResponseDto.success(
        'Se o email existir, um link de redefinição de senha foi enviado. O link expira em 15 minutos.',
        200,
      );
    } catch (error) {
      Sentry.setTag('auth.forgot_password.success', false);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        ResponseDto.error('Erro ao processar recuperação de senha', 500, error),
        500,
      );
    }
  }

  async changePassword(token: string, data: ChangePasswordDto) {
    try {
      // HOTFIX VULN-001: Validar token JWT antes de permitir mudança de senha

      // 1. Verificar e decodificar o token JWT
      let payload: { userId: number; purpose: string };
      try {
        payload = this.jwtService.verify(token);
      } catch {
        throw new HttpException(
          ResponseDto.error('Token inválido ou expirado', 400),
          400,
        );
      }

      // 2. Verificar se o token é para reset de senha
      if (payload.purpose !== 'password_reset') {
        throw new HttpException(
          ResponseDto.error('Token inválido para esta operação', 400),
          400,
        );
      }

      // 3. Verificar se o token existe no banco e não foi usado (single-use)
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const validation = await this.prisma.emailValidation.findUnique({
        where: { token: tokenHash },
      });

      if (!validation) {
        throw new HttpException(ResponseDto.error('Token inválido', 400), 400);
      }

      // 4. Verificar se o token já foi utilizado
      if (validation.usedAt) {
        throw new HttpException(
          ResponseDto.error(
            'Token já utilizado. Solicite um novo link de redefinição.',
            400,
          ),
          400,
        );
      }

      // 5. Verificar se o token não expirou
      if (validation.expiresAt < new Date()) {
        throw new HttpException(
          ResponseDto.error(
            'Token expirado. Solicite um novo link de redefinição.',
            400,
          ),
          400,
        );
      }

      // 6. Validar que o userId do token corresponde ao esperado
      const userId = payload.userId;
      if (validation.userId !== userId) {
        throw new HttpException(ResponseDto.error('Token inválido', 400), 400);
      }

      // 7. Verificar senhas
      if (data.senha !== data.confirmarSenha) {
        throw new HttpException(
          ResponseDto.error('As senhas não coincidem', 400),
          400,
        );
      }

      // 8. Validar complexidade da senha
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(data.senha)) {
        throw new HttpException(
          ResponseDto.error(
            'Senha deve ter 8+ caracteres, letra maiúscula e número',
            400,
          ),
          400,
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isActive: true },
      });

      if (!user) {
        throw new HttpException(
          ResponseDto.error('Usuário não encontrado', 404),
          404,
        );
      }

      if (!user.isActive) {
        throw new HttpException(ResponseDto.error('Usuário inativo', 401), 401);
      }

      const hashedPassword = await bcrypt.hash(data.senha, 10);

      // 9. Atualizar senha e marcar token como usado (atomicamente)
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: {
            senha: hashedPassword,
            // CRIT #1 (3a auditoria): limpa flag de force-reset setada por
            // dismiss-session. Sem isso, user fica em loop infinito de
            // 403 PASSWORD_RESET_REQUIRED.
            requirePasswordReset: false,
          },
        }),
        this.prisma.emailValidation.update({
          where: { token: tokenHash },
          data: { usedAt: new Date() },
        }),
      ]);

      Sentry.setTag('auth.reset_password.success', true);
      Sentry.setUser({ id: String(user.id) });

      return ResponseDto.success('Senha alterada com sucesso', 200, {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      Sentry.setTag('auth.reset_password.success', false);
      throw new HttpException(
        ResponseDto.error('Erro ao alterar senha', 500, error),
        500,
      );
    }
  }

  async requestValidationToken(email: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });

    if (existingUser) {
      throw new HttpException(
        ResponseDto.error('Email já cadastrado', 400),
        400,
      );
    }

    const token = this.jwtService.sign({ email }, { expiresIn: '1h' });

    await this.prisma.emailValidation.create({
      data: {
        email,
        token,
        type: 'REGISTRATION',
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    await this.emailService.sendValidationEmail(email, token, 'REGISTRATION');

    return ResponseDto.success('Email de validação enviado', 200, { email });
  }

  async validateEmailToken(token: string) {
    let payload: { email: string; userId?: number; type?: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new HttpException(
        ResponseDto.error('Token inválido ou expirado', 400),
        400,
      );
    }

    const validation = await this.prisma.emailValidation.findUnique({
      where: { token },
    });

    if (!validation) {
      throw new HttpException(ResponseDto.error('Token inválido', 400), 400);
    }

    if (validation.usedAt) {
      throw new HttpException(
        ResponseDto.error('Token já utilizado', 400),
        400,
      );
    }

    if (validation.type === 'REGISTRATION') {
      return ResponseDto.success('Token válido para registro', 200, {
        email: payload.email,
        type: 'REGISTRATION',
      });
    }

    if (validation.type === 'UPDATE') {
      if (validation.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: validation.userId },
        });

        if (user) {
          const oldEmails = (user.oldEmails as string[]) || [];
          const novoEmail = payload.email;

          await this.prisma.user.update({
            where: { id: validation.userId },
            data: {
              oldEmails: [...oldEmails, user.email],
              email: novoEmail,
            },
          });
        }
      }

      await this.prisma.emailValidation.update({
        where: { token },
        data: { usedAt: new Date() },
      });

      return ResponseDto.success('Email atualizado com sucesso', 200);
    }

    throw new HttpException(
      ResponseDto.error('Tipo de token inválido', 400),
      400,
    );
  }

  /**
   * DEV-ONLY: Cria user ADMIN (bypass de subscription) para testes E2E.
   * Gateado por NODE_ENV !== 'production'.
   */
  async createDevAdmin(data: {
    email: string;
    nome: string;
    senha: string;
    telefone: string;
  }) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException('DEV-only endpoint', 403);
    }
    const hashed = await bcrypt.hash(data.senha, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        nome: data.nome,
        senha: hashed,
        telefone: data.telefone,
        termosAceitos: true,
        politicaAceita: true,
        role: 'ADMIN',
      },
    });
    // Criar wallet (atomicamente)
    await this.prisma.wallet.create({
      data: { userId: user.id, balance: 0, blocked: 0, currency: 'BRL' },
    });
    // Criar sessao
    const sessionId = crypto.randomUUID();
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: this.publicSessionSelect,
    });
    if (fullUser) {
      await this.sessionService.createSession(
        sessionId,
        pickPublicSessionPayload(fullUser),
      );
    }
    return ResponseDto.success('Admin dev criado', 201, {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });
  }

  private async moveEmailToOld(userId: number, currentEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException(
        ResponseDto.error('Usuário não encontrado', 404),
        404,
      );
    }

    const oldEmails = (user.oldEmails as string[]) || [];
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        oldEmails: [...oldEmails, currentEmail],
      },
    });
  }

  /**
   * Recupera o codigo 2FA atual para a sessao (dev-only).
   * Usado por testes E2E Playwright para capturar o codigo gerado.
   */
  async getCurrentTwoFactorCode(sessionId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException('DEV-only', 403);
    }
    if (!sessionId) {
      throw new HttpException('Sessao nao fornecida', 401);
    }
    const code = await this.sessionService.getVerificationCode(sessionId);
    if (!code) {
      return ResponseDto.error('Codigo nao encontrado ou expirado', 404);
    }
    return ResponseDto.success('Codigo retornado', 200, { code });
  }
}
