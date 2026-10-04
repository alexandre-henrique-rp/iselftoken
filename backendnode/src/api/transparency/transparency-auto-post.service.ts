/**
 * TransparencyAutoPostService (FIN-10).
 *
 * Listener de eventos `installment.approved` e `installment.completed` emitidos
 * por FIN-09 RepassesService. Cria/atualiza TransparencyPost automaticamente,
 * mantendo a pagina publica de Transparencia sincronizada com o repasse.
 *
 * Idempotencia:
 * - sourceType='INSTALLMENT_REQUEST' + sourceId=<InstallmentRequest.id> (String).
 * - Unico por (sourceType, sourceId) — UNIQUE constraint no DB.
 * - Em caso de race condition (P2002 no create), o erro e silenciosamente ignorado.
 *
 * LGPD:
 * - authorPublicId derivado (igual a discussions.service.ts) — NUNCA exposto cpf/email.
 * - bankInfoSnapshot NAO e incluido no content (dado sensivel).
 * - allocationValues (R$) e allocationPercents (%) sao publicos por design.
 *
 * Rejeicao (FIN-09): NAO gera post (decisao interna).
 * Aprovacao: cria 1 post.
 * Conclusao: ATUALIZA o mesmo post (criado na aprovacao) com Status Final + TXID.
 *
 * Referencia: CASE.md §[Repasse] Auto-post na Transparencia (FIN-09).
 */
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TransparencyService } from './transparency.service';

export const SOURCE_TYPE_INSTALLMENT_REQUEST = 'INSTALLMENT_REQUEST';

export interface InstallmentApprovedPayload {
  installmentId: number;
  requestId: number;
  startupId: number;
  founderUserId: number;
  valor: number | Prisma.Decimal;
  installmentNumero?: number;
  repasseId?: number;
  observacao?: string | null;
  observacaoFinanceiro?: string | null;
  allocationPercents?: Record<string, number>;
  // FIN-11 §8.2 — Relatorio do Mes (opcional). Quando preenchidos, vao
  // compor secoes extras do auto-post (mensagem aos investidores + marco).
  usoRecurso?: string | null;
  teveLucro?: boolean | null;
  marcoAlcancado?: boolean | null;
  marcoDescricao?: string | null;
  mensagemInvestidores?: string | null;
}

export interface InstallmentCompletedPayload {
  installmentId: number;
  requestId: number | null;
  startupId: number;
  txidC6?: string;
  endToEndId?: string;
}

@Injectable()
export class TransparencyAutoPostService {
  private readonly logger = new Logger(TransparencyAutoPostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly transparencyService: TransparencyService,
  ) {}

  // ============ installment.approved ============

  @OnEvent('installment.approved')
  async handleInstallmentApproved(payload: InstallmentApprovedPayload) {
    const sourceId = String(payload.requestId);

    // 1. Idempotencia: checa se ja existe
    const existing = await this.findExistingPost(
      SOURCE_TYPE_INSTALLMENT_REQUEST,
      sourceId,
    );
    if (existing) {
      this.logger.log(
        `[AutoPost] installment.approved ja processado (requestId=${payload.requestId}, postId=${existing.id}). Skip.`,
      );
      return;
    }

    // 2. Carrega dados
    const installmentRequest = await this.prisma.installmentRequest.findUnique({
      where: { id: payload.requestId },
    });
    if (!installmentRequest) {
      this.logger.warn(
        `[AutoPost] InstallmentRequest ${payload.requestId} nao encontrado.`,
      );
      return;
    }

    const installment = await this.prisma.installment.findUnique({
      where: { id: payload.installmentId },
      include: { repasse: { select: { numeroParcelas: true } } },
    });
    if (!installment) {
      this.logger.warn(
        `[AutoPost] Installment ${payload.installmentId} nao encontrado.`,
      );
      return;
    }

    const founder = await this.prisma.user.findUnique({
      where: { id: payload.founderUserId },
      select: { id: true, nome: true },
    });

    const numero = installment.numero;
    const numeroParcelas = installment.repasse.numeroParcelas;
    const valor = Number(payload.valor);
    const period = new Date();
    const periodMonth = period.getMonth() + 1;
    const periodYear = period.getFullYear();
    const authorPublicId = this.buildAuthorPublicId(
      founder?.nome ?? 'Fundador',
      false,
    );

    const title = `Solicitacao de Repasse aprovada - Parcela ${numero}/${numeroParcelas}`;
    const content = this.buildApprovedContent({
      startupId: payload.startupId,
      numero,
      numeroParcelas,
      valor,
      allocationPercents:
        payload.allocationPercents ??
        (installmentRequest.allocationPercents as Record<string, number>),
      observacao: payload.observacao ?? installmentRequest.observacao ?? null,
      authorPublicId,
      // FIN-11 §8.2 — Relatorio do mes. Preferimos o valor do payload
      // (caso o emitente ja tenha os dados em maos); caso contrario,
      // lemos diretamente da InstallmentRequest persistida.
      mensagemInvestidores:
        payload.mensagemInvestidores ??
        installmentRequest.mensagemInvestidores ??
        null,
      usoRecurso: payload.usoRecurso ?? installmentRequest.usoRecurso ?? null,
      teveLucro: payload.teveLucro ?? installmentRequest.teveLucro ?? null,
      marcoAlcancado:
        payload.marcoAlcancado ?? installmentRequest.marcoAlcancado ?? null,
      marcoDescricao:
        payload.marcoDescricao ?? installmentRequest.marcoDescricao ?? null,
    });

    try {
      const created = await this.prisma.transparencyPost.create({
        data: {
          startupId: payload.startupId,
          authorId: payload.founderUserId,
          type: 'FINANCIAL_REPORT',
          title,
          content,
          periodMonth,
          periodYear,
          sourceType: SOURCE_TYPE_INSTALLMENT_REQUEST,
          sourceId,
        },
      });
      this.logger.log(
        `[AutoPost] installment.approved -> Created post id=${created.id} (requestId=${payload.requestId})`,
      );
    } catch (err) {
      if (this.isUniqueConstraintError(err)) {
        this.logger.log(
          `[AutoPost] Race condition tratada (UNIQUE constraint): requestId=${payload.requestId}`,
        );
        return;
      }
      throw err;
    }
  }

  // ============ installment.completed ============

  @OnEvent('installment.completed')
  async handleInstallmentCompleted(payload: InstallmentCompletedPayload) {
    if (!payload.requestId) {
      this.logger.warn(`[AutoPost] installment.completed sem requestId. Skip.`);
      return;
    }
    const sourceId = String(payload.requestId);
    const existing = await this.findExistingPost(
      SOURCE_TYPE_INSTALLMENT_REQUEST,
      sourceId,
    );

    if (existing) {
      // ATUALIZA com secao Status Final
      const installmentRequest =
        await this.prisma.installmentRequest.findUnique({
          where: { id: payload.requestId },
        });
      const txid = payload.txidC6 ?? installmentRequest?.txidC6 ?? 'N/A';
      const completedAt = installmentRequest?.completedAt ?? new Date();

      const appendedSection = `\n\n## Status Final\n\nParcela depositada em ${completedAt.toISOString().slice(0, 10)}\nTXID: ${txid}\n`;

      await this.prisma.transparencyPost.update({
        where: { id: existing.id },
        data: {
          content: existing.content + appendedSection,
        },
      });
      this.logger.log(
        `[AutoPost] installment.completed -> Updated post id=${existing.id} (requestId=${payload.requestId})`,
      );
      return;
    }

    // Fallback: APPROVED pulou direto para COMPLETED — cria post agora
    this.logger.log(
      `[AutoPost] installment.completed sem post previo. Criando fallback (requestId=${payload.requestId}).`,
    );
    await this.handleInstallmentApproved({
      installmentId: payload.installmentId,
      requestId: payload.requestId,
      startupId: payload.startupId,
      founderUserId: 0, // sem info — authorId sera 0; usaremos o autor real abaixo
      valor: 0,
    });

    // Apos criacao, atualiza com Status Final
    const newPost = await this.findExistingPost(
      SOURCE_TYPE_INSTALLMENT_REQUEST,
      sourceId,
    );
    if (newPost) {
      const installmentRequest =
        await this.prisma.installmentRequest.findUnique({
          where: { id: payload.requestId },
        });
      const txid = payload.txidC6 ?? installmentRequest?.txidC6 ?? 'N/A';
      const completedAt = installmentRequest?.completedAt ?? new Date();
      const appendedSection = `\n\n## Status Final\n\nParcela depositada em ${completedAt.toISOString().slice(0, 10)}\nTXID: ${txid}\n`;
      await this.prisma.transparencyPost.update({
        where: { id: newPost.id },
        data: { content: newPost.content + appendedSection },
      });
    }
  }

  // ============ helpers ============

  private async findExistingPost(sourceType: string, sourceId: string) {
    return this.prisma.transparencyPost.findFirst({
      where: { sourceType, sourceId, deletedAt: null },
    });
  }

  private isUniqueConstraintError(err: unknown): boolean {
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code?: string }).code;
      return code === 'P2002';
    }
    return false;
  }

  /**
   * Constroi `authorPublicId` derivado (igual a discussions.service.ts).
   * LGPD: NUNCA retorna cpf/email/telefone.
   */
  buildAuthorPublicId(nome: string, isAnonymous: boolean): string {
    const n = (nome ?? '').trim();
    if (!isAnonymous) return n || 'Anonimo';
    if (!n) return 'Anonimo';
    const tokens = n.split(/\s+/);
    if (tokens.length === 1) return tokens[0];
    const lastInitial = (tokens[tokens.length - 1] ?? '')
      .charAt(0)
      .toUpperCase();
    return lastInitial ? `${tokens[0]} ${lastInitial}.` : tokens[0];
  }

  private buildApprovedContent(params: {
    startupId: number;
    numero: number;
    numeroParcelas: number;
    valor: number;
    allocationPercents: Record<string, number>;
    observacao: string | null;
    authorPublicId: string;
    // FIN-11 §8.2 — Relatorio do Mes (opcional, compoe secoes extras)
    mensagemInvestidores?: string | null;
    usoRecurso?: string | null;
    teveLucro?: boolean | null;
    marcoAlcancado?: boolean | null;
    marcoDescricao?: string | null;
  }): string {
    const {
      startupId,
      numero,
      numeroParcelas,
      valor,
      allocationPercents,
      observacao,
      authorPublicId,
      mensagemInvestidores,
      usoRecurso,
      teveLucro,
      marcoAlcancado,
      marcoDescricao,
    } = params;
    const valorFmt = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);

    const categories = [
      'marketing',
      'desenvolvimento',
      'infraestrutura',
      'pessoal',
      'juridico',
      'operacional',
      'reservaCaixa',
    ];

    const allocationLines = categories
      .map((c) => {
        const pct = allocationPercents[c] ?? 0;
        return `- ${this.capitalize(c)}: ${pct}%`;
      })
      .join('\n');

    // Secao: Relatorio do Mes (FIN-11 §8.2). Renderizada somente quando
    // o fundador preencheu ao menos um dos campos. LGPD: nenhum dado
    // sensivel (bankInfoSnapshot, CPF/CNPJ) entra aqui.
    const reportSection = this.buildReportSection({
      mensagemInvestidores,
      usoRecurso,
      teveLucro,
      marcoAlcancado,
      marcoDescricao,
    });

    const observacaoSection = observacao
      ? `\n### Observacoes\n${observacao}\n`
      : '';

    return `## Aprovacao de Solicitacao de Repasse

**Startup:** id ${startupId}
**Parcela:** ${numero}/${numeroParcelas}
**Valor:** R$ ${valorFmt}
**Data de aprovacao:** ${new Date().toISOString().slice(0, 10)}
**Autor:** ${authorPublicId}

### Alocacao de Recursos

${allocationLines}
${reportSection}${observacaoSection}
[Link para detalhe da parcela](/startup/${startupId}/repasse/installment/${numero})
`;
  }

  /**
   * Compõe a seção "Relatório do Mês" do auto-post.
   * Retorna string vazia se o fundador não preencheu nenhum campo.
   * LGPD: nunca inclui dados pessoais, bancarios ou de identificacao.
   */
  private buildReportSection(params: {
    mensagemInvestidores?: string | null;
    usoRecurso?: string | null;
    teveLucro?: boolean | null;
    marcoAlcancado?: boolean | null;
    marcoDescricao?: string | null;
  }): string {
    const {
      mensagemInvestidores,
      usoRecurso,
      teveLucro,
      marcoAlcancado,
      marcoDescricao,
    } = params;
    const hasAny = Boolean(
      mensagemInvestidores?.trim() ||
      usoRecurso?.trim() ||
      teveLucro !== null ||
      marcoAlcancado !== null ||
      marcoDescricao?.trim(),
    );
    if (!hasAny) return '';

    const lines: string[] = ['\n### Relatorio do Mes'];

    if (mensagemInvestidores?.trim()) {
      lines.push(
        '',
        '**Mensagem aos investidores:**',
        mensagemInvestidores.trim(),
      );
    }
    if (usoRecurso?.trim()) {
      lines.push('', '**Uso do recurso:**', usoRecurso.trim());
    }
    if (teveLucro !== null && teveLucro !== undefined) {
      lines.push('', `**Teve lucro no periodo?** ${teveLucro ? 'Sim' : 'Nao'}`);
    }
    if (marcoAlcancado === true && marcoDescricao?.trim()) {
      lines.push('', '**Marco atingido:**', marcoDescricao.trim());
    }

    return lines.join('\n') + '\n';
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
