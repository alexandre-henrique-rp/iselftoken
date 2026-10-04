/**
 * InstallmentRequestService (FIN-10).
 *
 * Orquestra o fluxo do fundador:
 * 1. POST /request — cria InstallmentRequest com status REQUESTED.
 * 2. POST /resubmit — REJECTED -> REQUESTED, incrementa attemptNumber.
 * 3. GET /dashboard — retorna KPIs consolidados.
 *
 * Validacoes:
 * - Soma allocationPercents = 100 (tolerancia 0.01, via AllocationConverterService).
 * - Parcela N-1 (mesmo Repasse) deve estar COMPLETED. Parcela 1 e livre.
 * - founderId da Startup deve bater com req.user.id.
 * - bankInfoSnapshot copiado da Startup (LGPD: dado sensivel mas necessario).
 *
 * Auditoria:
 * - INSTALLMENT_REQUEST_CREATED | INSTALLMENT_REQUEST_RESUBMITTED.
 * (Aprovacao/Rejeicao/Completude sao registradas pelo FIN-09 RepassesService.)
 *
 * SLA: tsLimitePagamento = submittedAt + 5 dias uteis (SlaCalculatorService).
 *
 * Referencia: CASE.md §[Repasse] Backend.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SlaCalculatorService } from 'src/common/sla/sla-calculator.service';
import {
  AllocationConverterService,
  AllocationPercents,
} from 'src/common/allocation/allocation-converter.service';
import {
  REPASSE_JANELA_ANTECEDENCIA_DIAS,
  REPASSE_PARCELA_1_DELAY_DIAS,
} from 'src/api/payment/fund-transfer.service';
import { CreateInstallmentRequestDto } from './dto/create-installment-request.dto';
import { ResubmitInstallmentRequestDto } from './dto/resubmit-installment-request.dto';

const SLA_BUSINESS_DAYS = 5;

@Injectable()
export class InstallmentRequestService {
  private readonly logger = new Logger(InstallmentRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sla: SlaCalculatorService,
    private readonly allocation: AllocationConverterService,
    private readonly events: EventEmitter2,
  ) {}

  // ============ createOrResubmit ============

  async createOrResubmit(
    startupId: number,
    installmentId: number,
    dto: CreateInstallmentRequestDto | ResubmitInstallmentRequestDto,
    userId: number,
    isResubmit: boolean,
  ) {
    // 1. Ownership
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: {
        id: true,
        founderId: true,
        banco: true,
        agencia: true,
        conta: true,
        digito: true,
        tipo_conta: true,
        pix_key: true,
        titular: true,
        documento_titular: true,
      },
    });
    if (!startup) {
      throw new NotFoundException(`Startup ${startupId} nao encontrada`);
    }
    if (startup.founderId !== userId) {
      throw new ForbiddenException(
        'Voce nao e o fundador desta startup (LGPD/Acesso).',
      );
    }

    // 2. Installment existe
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        repasse: {
          select: {
            id: true,
            campaignId: true,
            status: true,
            numeroParcelas: true,
          },
        },
      },
    });
    if (!installment) {
      throw new NotFoundException(
        `Installment ${installmentId} nao encontrado`,
      );
    }

    // 3. Status permissivel
    const allowedStatuses = ['AWAITING_REQUEST', 'REJECTED'];
    if (!allowedStatuses.includes(installment.status)) {
      throw new BadRequestException(
        `Installment ${installmentId} nao pode receber solicitacao (status=${installment.status})`,
      );
    }

    // 4. Sequencial: parcela N-1 deve estar COMPLETED (skip para numero=1)
    if (installment.numero > 1) {
      const prev = await this.prisma.installment.findFirst({
        where: {
          repasseId: installment.repasseId,
          numero: installment.numero - 1,
        },
        select: { status: true },
      });
      if (!prev || prev.status !== 'COMPLETED') {
        throw new BadRequestException(
          `Parcela ${installment.numero - 1} do mesmo Repasse deve estar COMPLETED antes de solicitar a ${installment.numero}`,
        );
      }
    }

    // 5. Sprint S34-f - janela de solicitacao: a parcela so pode ser
    // solicitada a partir de (scheduledDate - 10 dias). Antes disso, fica
    // bloqueada para evitar fundador "adiantar" pagamento.
    //
    // Caso especial: parcela #1 tem scheduledDate = now + 7d (definido
    // em initiateTransfer). A janela abre em (scheduledDate - 10d) =
    // (now - 3d), ou seja, IMEDIATAMENTE para a parcela #1 — founder pode
    // solicitar assim que o admin configura o repasse.
    if (installment.scheduledDate) {
      const earliest = new Date(installment.scheduledDate);
      earliest.setDate(earliest.getDate() - REPASSE_JANELA_ANTECEDENCIA_DIAS);
      const now = new Date();
      if (now < earliest) {
        const dias = Math.ceil(
          (earliest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        throw new BadRequestException(
          `Parcela ${installment.numero} so pode ser solicitada a partir de ${earliest.toISOString().slice(0, 10)} (faltam ${dias} dia${dias === 1 ? '' : 's'})`,
        );
      }
    }

    // 5. Soma 100% (tolerancia 0.01)
    const percentsObj: AllocationPercents = {
      marketing: Number(dto.allocationPercents.marketing),
      desenvolvimento: Number(dto.allocationPercents.desenvolvimento),
      infraestrutura: Number(dto.allocationPercents.infraestrutura),
      pessoal: Number(dto.allocationPercents.pessoal),
      juridico: Number(dto.allocationPercents.juridico),
      operacional: Number(dto.allocationPercents.operacional),
      reservaCaixa: Number(dto.allocationPercents.reservaCaixa),
    };
    if (!this.allocation.validatePercentsSum(percentsObj)) {
      throw new BadRequestException(
        'Soma de allocationPercents deve ser exatamente 100% (tolerancia 0.01)',
      );
    }

    // 5b. Relatorio do mes (FIN-11 §8.2) — validacao cross-field:
    // marcoDescricao so faz sentido se marcoAlcancado === true.
    if (dto.marcoDescricao && dto.marcoAlcancado !== true) {
      throw new BadRequestException(
        'marcoDescricao exige marcoAlcancado=true (relatorio do mes)',
      );
    }
    if (dto.marcoAlcancado === true && !dto.marcoDescricao?.trim()) {
      throw new BadRequestException(
        'marcoAlcancado=true exige marcoDescricao preenchida',
      );
    }

    // 6. BankInfoSnapshot
    const bankInfoSnapshot = {
      banco: startup.banco,
      agencia: startup.agencia,
      conta: startup.conta,
      digito: startup.digito,
      tipo_conta: startup.tipo_conta,
      pix_key: startup.pix_key,
      titular: startup.titular,
      documento_titular: startup.documento_titular,
    };

    // 7. SLA
    const submittedAt = new Date();
    const tsLimitePagamento = this.sla.addBusinessDays(
      submittedAt,
      SLA_BUSINESS_DAYS,
    );

    // 7b. Relatorio do mes — payload compartilhado entre create e resubmit.
    // Se um campo vier vazio no resubmit, mantemos o valor anterior (NÃO
    // sobrescreve com null — protege historico). Trim + fallback null.
    const trimOpt = (v?: string): string | null => {
      const t = (v ?? '').trim();
      return t.length > 0 ? t : null;
    };

    // 8. existing
    const existing = await this.prisma.installmentRequest.findFirst({
      where: { installmentId },
    });

    if (existing) {
      if (isResubmit) {
        // RESUBMIT: incrementa attemptNumber, atualiza
        // Regra: campos do relatorio sao imutaveis entre tentativas —
        // o fundador nao precisa redigitar a cada resubmissao. So
        // atualiza allocationPercents/observacao (decisao de produto).
        const updated = await this.prisma.installmentRequest.update({
          where: { id: existing.id },
          data: {
            allocationPercents: percentsObj as unknown as Prisma.InputJsonValue,
            observacao: dto.observacao ?? null,
            bankInfoSnapshot:
              bankInfoSnapshot as unknown as Prisma.InputJsonValue,
            valorSolicitado: new Prisma.Decimal(installment.valor),
            status: 'REQUESTED',
            submittedAt,
            tsLimitePagamento,
            attemptNumber: existing.attemptNumber + 1,
            // Limpa campos de rejeicao/anteriores
            rejectedAt: null,
            rejectedByUserId: null,
            rejectionReason: null,
            // Campos do relatorio: somente atualiza se a chave foi
            // explicitamente enviada no payload. Se vier undefined,
            // mantemos o valor anterior.
            ...(dto.mensagemInvestidores !== undefined
              ? { mensagemInvestidores: trimOpt(dto.mensagemInvestidores) }
              : {}),
            ...(dto.usoRecurso !== undefined
              ? { usoRecurso: trimOpt(dto.usoRecurso) }
              : {}),
            ...(dto.teveLucro !== undefined
              ? { teveLucro: dto.teveLucro }
              : {}),
            ...(dto.marcoAlcancado !== undefined
              ? { marcoAlcancado: dto.marcoAlcancado }
              : {}),
            ...(dto.marcoDescricao !== undefined
              ? { marcoDescricao: trimOpt(dto.marcoDescricao) }
              : {}),
          },
        });

        await this.prisma.installment.update({
          where: { id: installment.id },
          data: { status: 'REQUESTED' },
        });

        await this.writeAudit(
          userId,
          'INSTALLMENT_REQUEST_RESUBMITTED',
          'InstallmentRequest',
          String(updated.id),
          {
            installmentId,
            attemptNumber: updated.attemptNumber,
          },
        );

        this.events.emit('installment.requested', {
          installmentId,
          startupId,
        });

        return updated;
      }
      // create + ja existe REQUESTED
      throw new ConflictException(
        `Ja existe solicitacao ${existing.status} para esta installment. Use /resubmit para reenviar.`,
      );
    }

    // 9. Create novo
    const created = await this.prisma.installmentRequest.create({
      data: {
        installmentId,
        startupId,
        founderUserId: userId,
        allocationPercents: percentsObj as unknown as Prisma.InputJsonValue,
        allocationValues: {} as unknown as Prisma.InputJsonValue,
        bankInfoSnapshot: bankInfoSnapshot as unknown as Prisma.InputJsonValue,
        valorSolicitado: new Prisma.Decimal(installment.valor),
        status: 'REQUESTED',
        submittedAt,
        tsLimitePagamento,
        attemptNumber: 1,
        observacao: dto.observacao ?? null,
        // Relatorio do mes (FIN-11 §8.2) — campos opcionais.
        // Sera publicado na Transparencia apenas se a solicitacao for
        // APROVADA (ver transparency-auto-post.service.ts).
        usoRecurso: trimOpt(dto.usoRecurso),
        teveLucro: dto.teveLucro ?? null,
        marcoAlcancado: dto.marcoAlcancado ?? null,
        marcoDescricao: trimOpt(dto.marcoDescricao),
        mensagemInvestidores: trimOpt(dto.mensagemInvestidores),
      },
    });

    // 10. Marca Installment
    await this.prisma.installment.update({
      where: { id: installment.id },
      data: { status: 'REQUESTED' },
    });

    // 11. Audit
    await this.writeAudit(
      userId,
      'INSTALLMENT_REQUEST_CREATED',
      'InstallmentRequest',
      String(created.id),
      {
        installmentId,
        startupId,
        attemptNumber: 1,
      },
    );

    this.events.emit('installment.requested', {
      installmentId,
      startupId,
    });

    return created;
  }

  // ============ getDashboard (por campaignId — preferido) ============

  async getDashboardByCampaign(campaignId: number, userId: number) {
    // 1. Resolver campaign + ownership em UMA query
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        startupId: true,
        startup: {
          select: { id: true, founderId: true, nome: true },
        },
      },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} nao encontrada`);
    }
    if (campaign.startup.founderId !== userId) {
      throw new ForbiddenException(
        'Voce nao e o fundador desta campaign (LGPD/Acesso).',
      );
    }

    return this.buildDashboard(campaign.startupId, campaignId, {
      id: campaign.startup.id,
      nome: campaign.startup.nome,
    });
  }

  // ============ getDashboard (por startupId — legacy) ============

  async getDashboardByStartup(startupId: number, userId: number) {
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true, founderId: true, nome: true },
    });
    if (!startup) {
      throw new NotFoundException(`Startup ${startupId} nao encontrada`);
    }
    if (startup.founderId !== userId) {
      throw new ForbiddenException(
        'Voce nao e o fundador desta startup (LGPD/Acesso).',
      );
    }

    return this.buildDashboard(startupId, null, {
      id: startup.id,
      nome: startup.nome,
    });
  }

  // ============ getDashboard (legacy alias — manter export) ============

  async getDashboard(startupId: number, userId: number) {
    return this.getDashboardByStartup(startupId, userId);
  }

  // ============ core: monta o dashboard ============

  private async buildDashboard(
    startupId: number,
    campaignIdFilter: number | null,
    startupSummary: { id: number; nome: string },
  ) {
    // Busca Repasse mais recente da startup (filtrando por campaignId se fornecido)
    const repasse = await this.prisma.repasse.findFirst({
      where: {
        campaign: {
          startupId,
          ...(campaignIdFilter ? { id: campaignIdFilter } : {}),
        },
        ...(campaignIdFilter === null ? { status: { not: 'CANCELLED' } } : {}),
      },
      include: {
        installments: {
          orderBy: { numero: 'asc' },
        },
      },
    });

    if (!repasse) {
      return {
        repasse: null,
        startup: startupSummary,
        installments: [],
        currentInstallment: null,
        kpis: {
          valorTotal: 0,
          valorPago: 0,
          valorPendente: 0,
          proximaParcela: null,
          diasRestantesSLA: null,
        },
        ultimasSolicitacoes: [],
      };
    }

    // Calcula KPIs
    const valorTotal = Number(repasse.valorTotalCaptacao);
    const valorPago = repasse.installments
      .filter((i) => i.status === 'COMPLETED')
      .reduce((acc, i) => acc + Number(i.valor), 0);
    const valorPendente = repasse.installments
      .filter((i) => ['REQUESTED', 'APPROVED', 'PROCESSING'].includes(i.status))
      .reduce((acc, i) => acc + Number(i.valor), 0);

    const proximaParcela =
      repasse.installments.find(
        (i) => !['COMPLETED', 'REJECTED'].includes(i.status),
      ) || null;

    // Current InstallmentRequest (REQUESTED/APPROVED mais recente)
    const currentInstallment = proximaParcela
      ? await this.prisma.installmentRequest.findFirst({
          where: {
            installmentId: proximaParcela.id,
            status: { in: ['REQUESTED', 'APPROVED'] },
          },
          orderBy: { submittedAt: 'desc' },
        })
      : null;

    const diasRestantesSLA =
      currentInstallment && currentInstallment.status === 'REQUESTED'
        ? this.sla.businessDaysBetween(
            new Date(),
            currentInstallment.tsLimitePagamento,
          )
        : null;

    const ultimasSolicitacoes = await this.prisma.installmentRequest.findMany({
      where: { startupId },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    });

    return {
      repasse,
      startup: startupSummary,
      installments: repasse.installments,
      currentInstallment,
      kpis: {
        valorTotal,
        valorPago,
        valorPendente,
        proximaParcela,
        diasRestantesSLA,
      },
      ultimasSolicitacoes,
    };
  }

  // ============ helpers ============

  private async writeAudit(
    userId: number,
    action: string,
    entity: string,
    entityId: string,
    payload: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        newValue: payload as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
