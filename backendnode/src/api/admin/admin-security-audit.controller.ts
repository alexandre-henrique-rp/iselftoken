import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminGuard } from 'src/auth/admin.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseDto } from 'src/common/dto/response.dto';

/**
 * Fase A.1 — endpoint admin para auditoria de tentativas de login.
 *
 * Filtros:
: endpoint, filters, action, email, ip, lockSeverity
 *
 * Acoes monitoradas: LOGIN_FAIL, LOGIN_FAIL_LOCKED, LOGIN_SUCCESS,
 * LOGIN_NEW_DEVICE, LOGIN_KNOWN_DEVICE.
 */
@ApiTags('Admin Security Audit')
@Controller('admin/security')
@UseGuards(AuthGuard, AdminGuard)
export class AdminSecurityAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('auth-attempts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista tentativas de login (sucesso e falha) com filtros',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    isArray: true,
    description: 'Filtra por acao (ex: LOGIN_FAIL, LOGIN_SUCCESS)',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filtra por email (parcial, case-insensitive)',
  })
  @ApiQuery({
    name: 'ip',
    required: false,
    description: 'Filtra por IP exato',
  })
  @ApiQuery({
    name: 'lockSeverity',
    required: false,
    enum: ['MEDIUM', 'HIGH', 'CRITICAL'],
    description: 'Filtra por severidade do lockout (LOGIN_FAIL_LOCKED)',
  })
  @ApiQuery({ name: 'from', required: false, type: Date })
  @ApiQuery({ name: 'to', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  async findAuthAttempts(filters: {
    action?: string[] | string;
    email?: string;
    ip?: string;
    lockSeverity?: 'MEDIUM' | 'HIGH' | 'CRITICAL';
    from?: string;
    to?: string;
    limit?: string;
    offset?: string;
  }) {
    const limit = Math.min(
      500,
      Math.max(1, parseInt(filters.limit ?? '100', 10) || 100),
    );
    const offset = Math.max(0, parseInt(filters.offset ?? '0', 10) || 0);

    const actionArr = Array.isArray(filters.action)
      ? filters.action
      : filters.action
        ? [filters.action]
        : undefined;

    const where: any = {
      entity: 'User',
      action: actionArr
        ? { startsWith: 'LOGIN' }
        : {
            in: [
              'LOGIN_FAIL',
              'LOGIN_FAIL_LOCKED',
              'LOGIN_SUCCESS',
              'LOGIN_NEW_DEVICE',
            ],
          },
    };

    if (actionArr && actionArr.length > 0) {
      where.action = { in: actionArr };
    }

    if (filters.email) {
      // H7 — JSON path queries nao funcionam em SQLite (Prisma emite SQL
      // que falha em runtime). Fallback: full-scan em newValue (string
      // contains no objeto JSON serializado). Aceitavel para volumes
      // moderados; para escala, persistir `email` como coluna propria.
      where.newValue = {
        string_contains: `"email":"${filters.email.toLowerCase()}"`,
      };
    }
    if (filters.ip) {
      where.ip = filters.ip;
    }
    if (filters.from) {
      where.createdAt = {
        ...(where.createdAt ?? {}),
        gte: new Date(filters.from),
      };
    }
    if (filters.to) {
      where.createdAt = {
        ...(where.createdAt ?? {}),
        lte: new Date(filters.to),
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return ResponseDto.success('Tentativas de login retornadas', 200, {
      attempts: rows.map((r) => ({
        id: r.id,
        action: r.action,
        userId: r.userId,
        email: (r.newValue as any)?.email ?? null,
        reason: (r.newValue as any)?.reason ?? null,
        lockSeverity: (r.newValue as any)?.lockSeverity ?? null,
        lockSeconds: (r.newValue as any)?.lockSeconds ?? null,
        geo: (r.newValue as any)?.geo ?? null,
        fingerprint: (r.newValue as any)?.fingerprint ?? null,
        isAnomalousGeo: (r.newValue as any)?.isAnomalousGeo ?? null,
        ip: r.ip,
        userAgent:
          r.newValue &&
          typeof r.newValue === 'object' &&
          'userAgent' in r.newValue
            ? (r.newValue as any).userAgent
            : null,
        createdAt: r.createdAt,
      })),
      total,
      limit,
      offset,
    });
  }

  /**
   * Resumo agregado para dashboard: contadores por ação + IPs top attackers.
   *
   * A-QA#5 (audit): usa Prisma groupBy em vez de findMany + loop JS.
   * Antes carregava TODOS os rows em memória (OOM em escala). Agora
   * agrega no DB e retorna apenas counts.
   */
  @Get('auth-attempts/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resumo agregado de tentativas (contadores + top IPs)',
  })
  @ApiQuery({ name: 'from', required: false, type: Date })
  @ApiQuery({ name: 'to', required: false, type: Date })
  async getAuthAttemptsSummary(filters: { from?: string; to?: string }) {
    const where: any = {
      entity: 'User',
      action: {
        in: [
          'LOGIN_FAIL',
          'LOGIN_FAIL_LOCKED',
          'LOGIN_SUCCESS',
          'LOGIN_NEW_DEVICE',
        ],
      },
    };
    if (filters.from)
      where.createdAt = {
        ...(where.createdAt ?? {}),
        gte: new Date(filters.from),
      };
    if (filters.to)
      where.createdAt = {
        ...(where.createdAt ?? {}),
        lte: new Date(filters.to),
      };

    // Agrupa por acao no DB (nao carrega rows em memoria)
    const [byActionRaw, total, topIpsRaw] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { _all: true },
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['ip'],
        where: { ...where, ip: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { ip: 'desc' } },
        take: 10,
      }),
    ]);

    const byAction: Record<string, number> = {};
    for (const r of byActionRaw) {
      byAction[r.action] = r._count._all;
    }

    const topIps = topIpsRaw.map((r) => ({
      ip: r.ip,
      count: r._count._all,
    }));

    return ResponseDto.success('Resumo de tentativas', 200, {
      total,
      byAction,
      topIps,
    });
  }
}
