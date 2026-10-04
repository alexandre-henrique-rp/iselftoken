import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminGuard } from 'src/auth/admin.guard';
import {
  HistoryService,
  HistoryFilters,
  HistoryEvent,
} from './history.service';

/**
 * Histórico/auditoria unificado de todas as transações e decisões — visão
 * global admin/compliance. Agrega as tabelas tipadas num único timeline.
 */
@ApiTags('Histórico (Admin)')
@ApiCookieAuth()
@Controller('admin/history')
@UseGuards(AuthGuard, AdminGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Histórico de transações (paginado, com filtros)' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'startupId', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'fromTime', required: false, description: 'HH:mm' })
  @ApiQuery({ name: 'toTime', required: false, description: 'HH:mm' })
  @ApiQuery({ name: 'actorName', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  list(@Query() query: HistoryFilters) {
    return this.historyService.list(query);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Exporta o histórico filtrado em CSV' })
  async export(
    @Query() query: HistoryFilters,
    @Res() res: Response,
  ): Promise<void> {
    const events = await this.historyService.listAllForExport(query);
    // @Res() manual: escreve o CSV cru direto, sem passar pelo interceptor
    // global que embrulharia a string num ResponseDto.
    res
      .status(200)
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="historico-transacoes.csv"',
      })
      .send(this.toCsv(events));
  }

  private toCsv(events: HistoryEvent[]): string {
    const headers = [
      'data',
      'categoria',
      'tipo',
      'acao',
      'status',
      'valor',
      'papel',
      'ator',
      'ator_email',
      'startup',
      'descricao',
    ];
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const linhas = events.map((e) =>
      [
        e.timestamp,
        e.category,
        e.type,
        e.action,
        e.status ?? '',
        e.amount ?? '',
        e.actorRole,
        e.actor?.nome ?? '',
        e.actor?.email ?? '',
        e.startup?.nome ?? '',
        e.description,
      ]
        .map(esc)
        .join(','),
    );
    // BOM p/ Excel abrir com acentos corretos.
    return '﻿' + [headers.join(','), ...linhas].join('\r\n');
  }
}
