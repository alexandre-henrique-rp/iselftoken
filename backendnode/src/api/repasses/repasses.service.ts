/**
 * FIN-09 — RepassesService
 *
 * Regras:
 * - Compliance delibera a QUANTIDADE de parcelas (12..60).
 * - Financeiro configura o VALOR FIXO por parcela + INTERVALO (15..60 dias).
 * - Centavos residuais sao absorvidos pela ULTIMA parcela.
 * - AuditLog em todas as transicoes.
 * - Emite eventos `installment.approved` e `installment.completed` para FIN-10.
 */
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { randomUUID } from 'node:crypto';
import { DeliberateRepasseDto } from './dto/deliberate-repasse.dto';
import { ConfigureRepasseDto } from './dto/configure-repasse.dto';
import { UpdateInstallmentDto } from './dto/update-installment.dto';

const TOLERANCE = 0.01;

@Injectable()
export class RepassesService {
  private readonly logger = new Logger(RepassesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly s3: S3Service,
  ) {}

  // ============ Compliance: deliberation ============

  async deliberate(
    campaignId: number,
    dto: DeliberateRepasseDto,
    userId: number,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true },
    });
    if (!campaign) {
      throw new NotFoundException(`Campanha ${campaignId} nao encontrada`);
    }
    if (campaign.status !== 'FUNDED') {
      throw new NotFoundException(
        `Campanha ${campaignId} nao esta FUNDED (status atual: ${campaign.status})`,
      );
    }

    const repasse = await this.prisma.repasse.upsert({
      where: { campaignId },
      update: {
        numeroParcelas: dto.numeroParcelas,
        complianceApprovedAt: new Date(),
        complianceApprovedByUserId: userId,
        complianceObservacao: dto.observacao ?? null,
        status: 'CONFIGURED',
      },
      create: {
        campaignId,
        numeroParcelas: dto.numeroParcelas,
        complianceApprovedAt: new Date(),
        complianceApprovedByUserId: userId,
        complianceObservacao: dto.observacao ?? null,
        status: 'CONFIGURED',
      },
    });

    await this.writeAudit(
      userId,
      'REPASS_DELIBERATED',
      'Repasse',
      String(repasse.id),
      { numeroParcelas: dto.numeroParcelas, observacao: dto.observacao },
    );

    return repasse;
  }

  // ============ Financeiro: configure ============

  async configure(repasseId: number, dto: ConfigureRepasseDto, userId: number) {
    const repasse = await this.prisma.repasse.findUnique({
      where: { id: repasseId },
      include: {
        installments: true,
        campaign: { select: { startupId: true } },
      },
    });
    if (!repasse) {
      throw new NotFoundException(`Repasse ${repasseId} nao encontrado`);
    }
    if (!repasse.complianceApprovedAt) {
      throw new BadRequestException(
        'Compliance deve deliberar primeiro (complianceApprovedAt e null)',
      );
    }

    const n = repasse.numeroParcelas;
    const valorParcela = Number(dto.valorParcela);
    const valorUltima = dto.valorUltimaParcela
      ? Number(dto.valorUltimaParcela)
      : null;

    // Calcula valorTotalCaptacao para validar consistencia
    const valorTotalCalculado =
      valorParcela * (n - 1) + (valorUltima ?? valorParcela);

    const totalSnap = Number(repasse.valorTotalCaptacao);
    if (Math.abs(totalSnap - valorTotalCalculado) > TOLERANCE) {
      throw new BadRequestException(
        `Inconsistencia: valorTotalCaptacao (${totalSnap}) !== valorParcela × (n-1) + valorUltimaParcela (${valorTotalCalculado})`,
      );
    }

    // Data de hoje (UTC midnight) — base para TODAS as parcelas.
    // Normalizada para UTC 00:00:00.000 para garantir consistencia entre
    // o que o founder ve em /founder/campaigns/:id/financeiro e o que o
    // admin ve em /admin/payouts, independente do timezone do servidor.
    const baseDate = new Date();
    baseDate.setUTCHours(0, 0, 0, 0);

    // Recalcula valorUltimaParcela caso nao informado absorvendo centavos
    const valorUltimaFinal = valorUltima ?? Number(valorParcela.toFixed(2));

    // Intervalo da PRIMEIRA parcela: se nao informado, usa o mesmo
    // intervaloDias (regra antiga — parcela 1 = baseDate + 1 * intervaloDias).
    // Quando o financeiro quer um ramp-up curto (ex.: 7 dias), ele passa
    // explicitamente; parcela 2+ continua usando intervaloDias entre si.
    const intervaloPrimeira = dto.primeiraParcelaDias ?? dto.intervaloDias;

    // Monta N installments com espacamento configuravel:
    //   parcela 1 = baseDate + intervaloPrimeira
    //   parcela N (N>1) = parcela(N-1) + intervaloDias
    //
    // Antes: parcela 1 = baseDate + 1 * intervaloDias (regra rigida).
    // Agora: separacao explicita — caso o financeiro queira "primeira em 7
    // dias, demais a cada 30", basta passar primeiraParcelaDias=7.
    const installmentsData = Array.from({ length: n }, (_, i) => {
      const numero = i + 1;
      const isLast = numero === n;
      const scheduledDate = new Date(baseDate);
      if (numero === 1) {
        scheduledDate.setUTCDate(
          scheduledDate.getUTCDate() + intervaloPrimeira,
        );
      } else {
        // Parcela N: a partir da parcela 1, soma (N-1) * intervaloDias.
        // Total: baseDate + intervaloPrimeira + (N-1) * intervaloDias.
        const deltaTotal = intervaloPrimeira + (numero - 1) * dto.intervaloDias;
        scheduledDate.setUTCDate(scheduledDate.getUTCDate() + deltaTotal);
      }
      // Re-normaliza para UTC midnight (defesa contra DST / server tz).
      scheduledDate.setUTCHours(0, 0, 0, 0);
      return {
        repasseId: repasse.id,
        numero,
        valor: isLast ? valorUltimaFinal : valorParcela,
        scheduledDate,
        status: 'AWAITING_REQUEST' as const,
      };
    });

    await this.prisma.$transaction(async (tx) => {
      // Limpa installments antigos (se houve reconfiguracao)
      await tx.installment.deleteMany({ where: { repasseId: repasse.id } });
      await tx.installment.createMany({ data: installmentsData });
    });

    const updated = await this.prisma.repasse.update({
      where: { id: repasse.id },
      data: {
        valorParcela,
        valorUltimaParcela: valorUltimaFinal,
        intervaloDias: dto.intervaloDias,
        primeiraParcelaDias: intervaloPrimeira,
        financeiroConfiguredAt: new Date(),
        financeiroConfiguredByUserId: userId,
        status: 'CONFIGURED',
      },
    });

    await this.writeAudit(
      userId,
      'REPASS_CONFIGURED',
      'Repasse',
      String(repasse.id),
      {
        valorParcela,
        valorUltimaParcela: valorUltimaFinal,
        intervaloDias: dto.intervaloDias,
        primeiraParcelaDias: intervaloPrimeira,
        installmentsCount: n,
      },
    );

    this.events.emit('repasse.configured', {
      repasseId: updated.id,
      startupId: repasse.campaign.startupId,
    });

    return updated;
  }

  // ============ Financeiro: approveInstallment ============

  async approveInstallment(
    installmentId: number,
    dto: UpdateInstallmentDto,
    userId: number,
  ) {
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        repasse: { select: { id: true, campaignId: true, status: true } },
      },
    });
    if (!installment) {
      throw new NotFoundException(
        `Installment ${installmentId} nao encontrado`,
      );
    }

    // Validacao de status — idempotente: re-aprovar uma parcela ja PROCESSING
    // e um no-op (atualiza valorOverride + observacaoFinanceiro). Apenas
    // COMPLETED bloqueia (a parcela ja foi paga).
    if (installment.status === 'COMPLETED') {
      throw new BadRequestException(
        `Installment ${installmentId} ja foi paga (COMPLETED). Nao pode ser aprovada novamente.`,
      );
    }

    // Validacao sequencial: parcela N-1 deve estar COMPLETED
    if (installment.numero > 1) {
      const prev = await this.prisma.installment.findFirst({
        where: {
          repasseId: installment.repasseId,
          numero: installment.numero - 1,
        },
      });
      if (!prev || prev.status !== 'COMPLETED') {
        throw new BadRequestException(
          `Parcela ${installment.numero - 1} do mesmo Repasse deve estar COMPLETED antes de aprovar a ${installment.numero}`,
        );
      }
    }

    // Busca Startup e Founder do Repasse
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: installment.repasse.campaignId },
      select: { startupId: true, startup: { select: { founderId: true } } },
    });
    if (!campaign) {
      throw new NotFoundException(
        `Campaign ${installment.repasse.campaignId} nao encontrada`,
      );
    }

    // Calcula valorOverride ou usa do Installment
    const valorFinal = dto.valorOverride
      ? Number(dto.valorOverride)
      : Number(installment.valor);

    // BankInfoSnapshot — vazio aqui (FIN-09 backend nao persiste do request do fundador;
    // quem cria a InstallmentRequest com snapshot e o FIN-10 via request endpoint).
    // Para o fluxo de APROVACAO DIRETA (sem passar por REQUESTED), criamos com snapshot vazio.
    const bankInfoSnapshot = {} as any;

    const updatedInstallment = await this.prisma.installment.update({
      where: { id: installment.id },
      data: {
        status: 'PROCESSING',
        scheduledDate: new Date(),
        valor: valorFinal,
      },
    });

    // BUG-FIX (S34): InstallmentRequest.installmentId e UNIQUE — nao podemos
    // criar outra quando o founder JA solicitou (criada via
    // /founder/startups/:id/repasse/installments/:id/request). Usamos upsert:
    //   - Se ja existe: atualiza para APPROVED preservando allocationPercents
    //     + observacao + bankInfoSnapshot do founder (dados do relatorio mensal).
    //   - Se nao existe (aprovacao direta, fluxo legado): cria com zeros.
    const now = new Date();
    const tsLimitePagamento = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const request = await this.prisma.installmentRequest.upsert({
      where: { installmentId: installment.id },
      create: {
        installmentId: installment.id,
        startupId: campaign.startupId,
        founderUserId: campaign.startup.founderId,
        allocationPercents: {
          marketing: 0,
          desenvolvimento: 0,
          infraestrutura: 0,
          pessoal: 0,
          juridico: 0,
          operacional: 0,
          reservaCaixa: 0,
        },
        allocationValues: {},
        bankInfoSnapshot,
        valorSolicitado: valorFinal,
        status: 'APPROVED',
        submittedAt: now,
        tsLimitePagamento,
        attemptNumber: 1,
        approvedAt: now,
        approvedByUserId: userId,
        valorOverride: dto.valorOverride ?? null,
        observacaoFinanceiro: dto.observacaoFinanceiro ?? null,
      },
      update: {
        // Preserva allocationPercents, allocationValues, bankInfoSnapshot,
        // observacao do founder (campos `update` nao tocam nos preservados).
        status: 'APPROVED',
        approvedAt: now,
        approvedByUserId: userId,
        valorOverride: dto.valorOverride ?? null,
        observacaoFinanceiro: dto.observacaoFinanceiro ?? null,
        // Limpa dados de rejeicao previa (se vier de um reject+approve).
        rejectedAt: null,
        rejectedByUserId: null,
        rejectionReason: null,
      },
    });

    await this.writeAudit(
      userId,
      'INSTALLMENT_REQUEST_APPROVED',
      'InstallmentRequest',
      String(request.id),
      {
        installmentId: installment.id,
        valor: valorFinal,
        installmentNumero: installment.numero,
      },
    );

    // Promove Repasse para IN_PROGRESS na primeira aprovacao
    if (installment.repasse.status === 'CONFIGURED') {
      await this.prisma.repasse.update({
        where: { id: installment.repasse.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Evento para FIN-10 (TransparencyAutoPostService)
    this.events.emit('installment.approved', {
      installmentId: installment.id,
      requestId: request.id,
      startupId: campaign.startupId,
      founderUserId: campaign.startup.founderId,
      valor: valorFinal,
      installmentNumero: installment.numero,
      repasseId: installment.repasseId,
      observacaoFinanceiro: dto.observacaoFinanceiro ?? null,
    });

    return updatedInstallment;
  }

  // ============ Financeiro: rejectInstallment ============

  async rejectInstallment(
    installmentId: number,
    motivo: string,
    userId: number,
  ) {
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        repasse: { include: { campaign: { select: { startupId: true } } } },
      },
    });
    if (!installment) {
      throw new NotFoundException(
        `Installment ${installmentId} nao encontrado`,
      );
    }
    if (installment.status !== 'REQUESTED') {
      throw new BadRequestException(
        `Installment ${installmentId} precisa estar REQUESTED (atual=${installment.status})`,
      );
    }

    const updated = await this.prisma.installment.update({
      where: { id: installment.id },
      data: {
        status: 'REJECTED',
      },
    });

    // Marca InstallmentRequest tambem (se existir)
    await this.prisma.installmentRequest.updateMany({
      where: { installmentId: installment.id },
      data: {
        status: 'REJECTED',
        rejectionReason: motivo,
        rejectedAt: new Date(),
        rejectedByUserId: userId,
      },
    });

    await this.writeAudit(
      userId,
      'INSTALLMENT_REQUEST_REJECTED',
      'Installment',
      String(installment.id),
      { motivo },
    );

    this.events.emit('installment.rejected', {
      installmentId: installment.id,
      startupId:
        installment.repasse?.campaign?.startupId ?? installment.repasseId,
      reason: motivo,
    });

    return updated;
  }

  // ============ Financeiro: markInstallmentPaid ============

  async markInstallmentPaid(
    installmentId: number,
    txidC6: string,
    endToEndId: string,
    userId: number,
  ) {
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        repasse: {
          select: {
            id: true,
            status: true,
            numeroParcelas: true,
          },
        },
        request: { select: { id: true } },
      },
    });
    if (!installment) {
      throw new NotFoundException(
        `Installment ${installmentId} nao encontrado`,
      );
    }
    if (installment.status !== 'PROCESSING') {
      throw new BadRequestException(
        `Installment ${installmentId} precisa estar PROCESSING (atual=${installment.status})`,
      );
    }

    await this.prisma.installment.update({
      where: { id: installment.id },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });

    await this.prisma.installmentRequest.update({
      where: { installmentId: installment.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        txidC6,
        endToEndId,
      },
    });

    await this.writeAudit(
      userId,
      'INSTALLMENT_REQUEST_COMPLETED',
      'InstallmentRequest',
      String(installment.request?.id ?? ''),
      { txidC6, endToEndId },
    );

    // Se for a ultima parcela, marca Repasse como COMPLETED
    const isLast = installment.numero === installment.repasse.numeroParcelas;
    if (isLast) {
      await this.prisma.repasse.update({
        where: { id: installment.repasse.id },
        data: { status: 'COMPLETED' },
      });
      await this.writeAudit(
        userId,
        'REPASS_COMPLETED',
        'Repasse',
        String(installment.repasse.id),
        { lastInstallmentId: installment.id },
      );
      this.events.emit('repasse.concluded', {
        repasseId: installment.repasse.id,
        startupId: installment.repasse.id,
      });
    }

    // Evento para FIN-10 (TransparencyAutoPostService UPDATES post)
    this.events.emit('installment.completed', {
      installmentId: installment.id,
      requestId: installment.request?.id ?? null,
      startupId: installment.repasse.id,
      repassId: installment.repasse.id,
    });

    return installment;
  }

  /**
   * Marca a parcela como paga anexando um comprovante (PDF/JPG/PNG) enviado
   * pelo Financeiro/Admin. Faz upload no bucket 'document', grava
   * Installment.comprovanteUrl + txId e delega ao markInstallmentPaid para a
   * transição de status e efeitos (transparência, etc).
   * O comprovante fica disponível no relatório da transparência.
   */
  async markInstallmentPaidWithComprovante(
    installmentId: number,
    file: Express.Multer.File | undefined,
    txId: string | undefined,
    userId: number,
  ) {
    if (!file) {
      throw new BadRequestException('Comprovante (arquivo) é obrigatório.');
    }
    const accepted = new Set([
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ]);
    if (!accepted.has(file.mimetype)) {
      throw new BadRequestException(
        `Tipo não suportado (${file.mimetype}). Aceitos: PDF, JPG, PNG.`,
      );
    }
    const MAX = 25 * 1024 * 1024;
    if (file.size > MAX) {
      throw new BadRequestException('Comprovante excede 25 MB.');
    }

    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      select: { id: true, status: true, repasseId: true },
    });
    if (!installment) {
      throw new NotFoundException(
        `Installment ${installmentId} nao encontrado`,
      );
    }
    if (installment.status !== 'PROCESSING') {
      throw new BadRequestException(
        `Parcela precisa estar aprovada/PROCESSING para marcar como paga (atual=${installment.status}).`,
      );
    }

    const ext =
      file.mimetype === 'application/pdf'
        ? 'pdf'
        : file.mimetype === 'image/png'
          ? 'png'
          : 'jpg';
    const key = `repasse-${installment.repasseId}/comprovante-${installment.id}-${randomUUID()}.${ext}`;
    const uploaded = await this.s3.upload(
      file.buffer,
      'document',
      key,
      file.mimetype,
    );

    // Grava o comprovante + txId na parcela ANTES de concluir.
    await this.prisma.installment.update({
      where: { id: installment.id },
      data: { comprovanteUrl: uploaded.key, txId: txId ?? null },
    });

    // Delega a transição de status/efeitos (reusa a lógica existente). O
    // markInstallmentPaid exige txidC6/endToEndId como strings — usamos o txId
    // informado (ou o key do comprovante como referência) para rastreio.
    const ref = txId?.trim() || uploaded.key;
    return this.markInstallmentPaid(installment.id, ref, ref, userId);
  }

  // ============ Compliance: cancel ============

  async cancel(repasseId: number, motivo: string, userId: number) {
    const repasse = await this.prisma.repasse.findUnique({
      where: { id: repasseId },
      include: { installments: true },
    });
    if (!repasse) {
      throw new NotFoundException(`Repasse ${repasseId} nao encontrado`);
    }
    if (repasse.status === 'CANCELLED') {
      throw new BadRequestException(`Repasse ${repasseId} ja esta CANCELLED`);
    }

    await this.prisma.repasse.update({
      where: { id: repasse.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledMotivo: motivo,
      },
    });

    // Marca installments pendentes como REJECTED
    const pending = repasse.installments.filter(
      (i) => i.status !== 'COMPLETED' && i.status !== 'REJECTED',
    );
    for (const inst of pending) {
      await this.prisma.installment.update({
        where: { id: inst.id },
        data: { status: 'REJECTED' },
      });
    }

    await this.writeAudit(
      userId,
      'REPASS_CANCELLED',
      'Repasse',
      String(repasse.id),
      { motivo, pendingCancelled: pending.length },
    );

    return { ...repasse, status: 'CANCELLED' };
  }

  // ============ helper ============

  private async writeAudit(
    userId: number | null,
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
        newValue: payload as any,
      },
    });
  }
}
