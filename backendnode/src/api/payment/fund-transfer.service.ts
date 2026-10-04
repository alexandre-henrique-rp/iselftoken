import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/common/audit/audit.service';
import { AffiliateCommissionService } from 'src/api/affiliate/affiliate-commission.service';
import { EfiPixAdapter } from './efi/adapters/efi-pix.adapter';
import { FeatureFlagsService } from 'src/common/feature-flags/feature-flags.service';

/** Quantidade fixa de parcelas do repasse (definido em B12). */
export const REPASSE_PARCELAS = 3;

/** Intervalo (em dias) entre as parcelas (definido em B12). */
export const REPASSE_INTERVALO_DIAS = 30;

/**
 * Sprint S34-f — janela de antecedência para o fundador poder
 * solicitar uma parcela.
 *
 * Regra de negócio (PRD FIN-09 §4):
 *  - Após o admin configurar o repasse, a 1ª parcela fica disponível
 *    em 7 dias (REPASSE_PARCELA_1_DELAY_DIAS). Antes disso, NÃO pode
 *    ser solicitada.
 *  - Demais parcelas: liberadas 10 dias antes do `scheduledDate`
 *    (REPASSE_JANELA_ANTECEDENCIA_DIAS). Antes disso, ficam
 *    AWAITING_REQUEST com status `bloqueado`.
 *  - Se o fundador NÃO solicitou uma parcela vencida e passaram-se
 *    mais de 10 dias do `scheduledDate` (sem solicitação REQUESTED/APPROVED),
 *    o cron REAGENDA a parcela para o próximo mês (REPASSE_REAGENDAR_DIAS
 *    após o scheduled original). Evita acúmulo de parcelas vencidas.
 *  - NUNCA pagar 2+ parcelas juntas: o cron processa apenas a próxima
 *    parcela AWAITING_REQUEST e com scheduledDate <= now (após reagendamento).
 */
export const REPASSE_PARCELA_1_DELAY_DIAS = 7;
export const REPASSE_JANELA_ANTECEDENCIA_DIAS = 10;
export const REPASSE_REAGENDAR_DIAS = 30;
export const REPASSE_MIN_DIAS_APOS_HOJE = 7; // ao reagendar, garantir mín. 7 dias no futuro

/**
 * Resultado agregado do repasse: NF + parcelas + contexto da campanha.
 */
export interface RepasseStatus {
  notafiscal: {
    id: number;
    number: string;
    amount: number;
    issuedAt: Date;
    status: string;
    xmlUrl: string | null;
  } | null;
  transfers: Array<{
    id: number;
    installmentNumber: number;
    amount: number;
    scheduledDate: Date | null | null;
    status: string;
    paidAt: Date | null;
    txIdBancario: string | null;
  }>;
  totalRaised: number;
  transferStarted: boolean;
}

/**
 * Dados bancários da startup usados para transferência (PIX/TED).
 * LGPD: campos sensíveis. Não logar em plaintext, sempre mascarar.
 */
interface StartupBankAccount {
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  digito?: string | null;
  tipo_conta?: string | null;
  pix_key?: string | null;
  titular?: string | null;
  documento_titular?: string | null;
}

/**
 * Serviço de Repasse de Fundos às Startups (B12).
 *
 * Fluxo:
 * 1. `initiateTransfer(startupId, userId)` — fundador dispara manualmente
 *    após a campanha atingir `FUNDED`. Cria 1 NF + 3 FundTransfer (PENDING).
 *    Idempotente: se já existe NF para a startup, retorna o existente.
 * 2. `getTransferStatus(startupId, userId)` — consulta NF + parcelas.
 * 3. `processScheduledTransfers()` — chamado pelo cron diariamente (09:00 BRT).
 *    Busca parcelas PENDING com scheduledDate <= now e processa via EFI.
 *
 * LGPD: dados bancários são sensíveis. Não logamos conta/agência/documento
 * em plaintext — apenas IDs gerados e valores monetários.
 */
@Injectable()
export class FundTransferService {
  private readonly logger = new Logger(FundTransferService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly affiliateCommissionService: AffiliateCommissionService,
    private readonly efiPixAdapter: EfiPixAdapter,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  /**
   * Gera número sequencial de NF no formato `NF-<ANO>-<SEQUENCIAL 6 DÍGITOS>`.
   * Usa o `count` atual da tabela `nota_fiscais` no ano corrente + 1.
   *
   * @returns NF number único (ex: "NF-2026-000001")
   */
  private async generateNfNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const count = await this.prisma.notaFiscal.count({
      where: {
        issuedAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
    });

    const seq = String(count + 1).padStart(6, '0');
    return `NF-${year}-${seq}`;
  }

  /**
   * Divide o valor total em 3 parcelas iguais (2 decimais), jogando o
   * resto (centavos) na primeira parcela. Garante que a soma das 3
   * parcelas é exatamente igual ao total.
   *
   * @param totalRaised - Valor total a ser repassado (em R$)
   * @returns Array de 3 valores (parcela 1, 2, 3) já arredondados
   */
  private splitInstallments(totalRaised: number): [number, number, number] {
    const totalCents = Math.round(totalRaised * 100);
    const baseCents = Math.floor(totalCents / REPASSE_PARCELAS);
    const remainder = totalCents - baseCents * REPASSE_PARCELAS;

    const p1 = (baseCents + remainder) / 100;
    const p2 = baseCents / 100;
    const p3 = baseCents / 100;

    return [
      Number(p1.toFixed(2)),
      Number(p2.toFixed(2)),
      Number(p3.toFixed(2)),
    ];
  }

  /**
   * Valida que a startup existe e pertence ao founder. Lança exceções
   * padronizadas do NestJS.
   *
   * @param startupId - ID da startup
   * @param userId - ID do usuário autenticado
   * @returns Startup carregada com dados bancários
   */
  private async loadStartupForFounder(
    startupId: number,
    userId: number,
    userRole: string,
  ) {
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
      throw new NotFoundException(`Startup #${startupId} não encontrada`);
    }

    if (startup.founderId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Você não tem permissão para iniciar repasse nesta startup',
      );
    }

    return startup;
  }

  /**
   * Inicia o processo de repasse de fundos para uma campanha FUNDED.
   *
   * Fluxo:
   * 1. Busca a startup e valida ownership.
   * 2. Busca a campanha e valida status === 'FUNDED' e transferStarted === false.
   * 3. **Idempotente**: se já existe NF para a startup, retorna a existente (200).
   * 4. Soma investments CONFIRMED → totalRaised.
   * 5. Atualiza campaign.totalRaised.
   * 6. Gera NF com número sequencial.
   * 7. Cria 3 FundTransfer (parcela 1 = now, 2 = now+30d, 3 = now+60d).
   * 8. Marca campaign.transferStarted = true.
   * 9. AuditLog `REPASSE_INITIATED`.
   *
   * @param startupId - ID da startup
   * @param userId - ID do founder
   * @param userRole - Role do usuário (ADMIN bypassa ownership)
   * @returns RepasseStatus com NF + parcelas criadas (ou existente, idempotente)
   * @throws NotFoundException se startup/campaign não encontrada
   * @throws ForbiddenException se startup não pertence ao founder
   * @throws BadRequestException se campaign.status !== 'FUNDED' ou transferStarted
   */
  async initiateTransfer(
    startupId: number,
    userId: number,
    userRole: string = 'USER',
  ): Promise<RepasseStatus> {
    // Carrega startup só pra validar ownership — não usamos o retorno aqui,
    // mas a função lança NotFoundException/ForbiddenException se inválido.
    await this.loadStartupForFounder(startupId, userId, userRole);

    // Idempotência: se já existe NF + transferStarted, retorna existente
    const existingNf = await this.prisma.notaFiscal.findFirst({
      where: { startupId },
      orderBy: { createdAt: 'desc' },
      include: {
        fundTransfers: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    if (existingNf) {
      this.logger.log(
        `Repasse já iniciado startup=${startupId} — retornando NF existente #${existingNf.id}`,
      );
      const campaign = await this.prisma.campaign.findFirst({
        where: { startupId, transferStarted: true },
        select: { totalRaised: true, transferStarted: true },
      });
      return {
        notafiscal: {
          id: existingNf.id,
          number: existingNf.number,
          amount: Number(existingNf.amount),
          issuedAt: existingNf.issuedAt,
          status: existingNf.status,
          xmlUrl: existingNf.xmlUrl,
        },
        transfers: existingNf.fundTransfers.map((t) => ({
          id: t.id,
          installmentNumber: t.installmentNumber,
          amount: Number(t.amount),
          scheduledDate: t.scheduledDate,
          status: t.status,
          paidAt: t.paidAt,
          txIdBancario: t.txIdBancario,
        })),
        totalRaised: Number(campaign?.totalRaised ?? existingNf.amount),
        transferStarted: campaign?.transferStarted ?? true,
      };
    }

    // Busca campanha FUNDED da startup
    const campaign = await this.prisma.campaign.findFirst({
      where: { startupId, status: 'FUNDED' },
      select: {
        id: true,
        status: true,
        totalRaised: true,
        transferStarted: true,
      },
    });

    if (!campaign) {
      throw new BadRequestException(
        'Não existe campanha com status FUNDED para esta startup',
      );
    }

    if (campaign.transferStarted) {
      throw new BadRequestException('O repasse desta campanha já foi iniciado');
    }

    // Soma o REPASSE dos investments CONFIRMED — startupRepasseAmount
    // (tokensQty x preco base). Linhas legadas sem split caem no `amount`.
    const investments = await this.prisma.investment.findMany({
      where: {
        campaignId: campaign.id,
        status: 'CONFIRMED',
      },
      select: { amount: true, startupRepasseAmount: true },
    });

    if (investments.length === 0) {
      throw new BadRequestException(
        'Não existem investments CONFIRMED para calcular o repasse',
      );
    }

    const captacaoBruta = investments.reduce(
      (acc, inv) => acc + Number(inv.startupRepasseAmount ?? inv.amount),
      0,
    );
    // Comissoes de afiliado saem do repasse a startup (vao para o afiliado).
    const comissoes = await this.affiliateCommissionService
      .getTotalDueByCampaign(campaign.id)
      .catch(() => ({ total: 0 }));
    const totalRaised = Math.max(
      0,
      Number((captacaoBruta - Number(comissoes.total)).toFixed(2)),
    );

    if (totalRaised <= 0) {
      throw new BadRequestException('Total arrecadado é zero ou negativo');
    }

    // Gera NF + 3 parcelas
    const nfNumber = await this.generateNfNumber();
    const [p1, p2, p3] = this.splitInstallments(totalRaised);

    const now = new Date();
    // Sprint S34-f — 1ª parcela fica disponível em 7 dias (não no dia).
    // O fundador pode SOLICITAR a partir de (scheduledDate - 10 dias) até
    // a data de vencimento. Se passar 10 dias do vencimento sem solicitação,
    // o cron REAGENDA para o próximo mês (REPASSE_REAGENDAR_DIAS após).
    const d1 = new Date(now);
    d1.setDate(d1.getDate() + REPASSE_PARCELA_1_DELAY_DIAS); // +7d
    const d30 = new Date(d1);
    d30.setDate(d30.getDate() + REPASSE_INTERVALO_DIAS);
    const d60 = new Date(d1);
    d60.setDate(d60.getDate() + REPASSE_INTERVALO_DIAS * 2);

    const nf = await this.prisma.notaFiscal.create({
      data: {
        startupId,
        number: nfNumber,
        amount: new Prisma.Decimal(totalRaised.toFixed(2)),
        issuedAt: now,
        status: 'ISSUED',
        fundTransfers: {
          create: [
            {
              startupId,
              installmentNumber: 1,
              amount: new Prisma.Decimal(p1.toFixed(2)),
              scheduledDate: d1,
              status: 'PENDING',
            },
            {
              startupId,
              installmentNumber: 2,
              amount: new Prisma.Decimal(p2.toFixed(2)),
              scheduledDate: d30,
              status: 'PENDING',
            },
            {
              startupId,
              installmentNumber: 3,
              amount: new Prisma.Decimal(p3.toFixed(2)),
              scheduledDate: d60,
              status: 'PENDING',
            },
          ],
        },
      },
      include: {
        fundTransfers: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    // Atualiza campanha (totalRaised + transferStarted)
    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        totalRaised: new Prisma.Decimal(totalRaised.toFixed(2)),
        transferStarted: true,
      },
    });

    // AuditLog
    await this.audit.log({
      userId,
      action: 'REPASSE_INITIATED',
      entity: 'NotaFiscal',
      entityId: nf.id,
      newValue: {
        startupId,
        nfNumber,
        totalRaised: Number(totalRaised.toFixed(2)),
        installmentCount: REPASSE_PARCELAS,
      } as Prisma.InputJsonValue,
    });

    this.logger.log(
      `Repasse iniciado startup=${startupId} NF=${nfNumber} total=R$${totalRaised.toFixed(2)} (3 parcelas)`,
    );

    return {
      notafiscal: {
        id: nf.id,
        number: nf.number,
        amount: Number(nf.amount),
        issuedAt: nf.issuedAt,
        status: nf.status,
        xmlUrl: nf.xmlUrl,
      },
      transfers: nf.fundTransfers.map((t) => ({
        id: t.id,
        installmentNumber: t.installmentNumber,
        amount: Number(t.amount),
        scheduledDate: t.scheduledDate,
        status: t.status,
        paidAt: t.paidAt,
        txIdBancario: t.txIdBancario,
      })),
      totalRaised: Number(totalRaised.toFixed(2)),
      transferStarted: true,
    };
  }

  /**
   * Retorna o status completo do repasse de uma startup.
   *
   * @param startupId - ID da startup
   * @param userId - ID do founder (validação de ownership)
   * @param userRole - Role (ADMIN bypassa ownership)
   * @returns RepasseStatus com NF + parcelas (ou vazio se ainda não iniciado)
   * @throws NotFoundException se startup não encontrada
   * @throws ForbiddenException se startup não pertence ao founder
   */
  async getTransferStatus(
    startupId: number,
    userId: number,
    userRole: string = 'USER',
  ): Promise<RepasseStatus> {
    await this.loadStartupForFounder(startupId, userId, userRole);

    const nf = await this.prisma.notaFiscal.findFirst({
      where: { startupId },
      orderBy: { createdAt: 'desc' },
      include: {
        fundTransfers: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    const campaign = await this.prisma.campaign.findFirst({
      where: { startupId },
      select: { totalRaised: true, transferStarted: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!nf) {
      return {
        notafiscal: null,
        transfers: [],
        totalRaised: Number(campaign?.totalRaised ?? 0),
        transferStarted: campaign?.transferStarted ?? false,
      };
    }

    return {
      notafiscal: {
        id: nf.id,
        number: nf.number,
        amount: Number(nf.amount),
        issuedAt: nf.issuedAt,
        status: nf.status,
        xmlUrl: nf.xmlUrl,
      },
      transfers: nf.fundTransfers.map((t) => ({
        id: t.id,
        installmentNumber: t.installmentNumber,
        amount: Number(t.amount),
        scheduledDate: t.scheduledDate,
        status: t.status,
        paidAt: t.paidAt,
        txIdBancario: t.txIdBancario,
      })),
      totalRaised: Number(campaign?.totalRaised ?? nf.amount),
      transferStarted: campaign?.transferStarted ?? true,
    };
  }

  /**
   * Processa todas as parcelas PENDING com scheduledDate <= agora.
   * Chamado pelo cron diariamente (09:00 BRT).
   *
   * Para cada parcela vencida:
   * 1. Marca como PROCESSING
   * 2. Busca dados bancários da startup
   * 3. Chama `pixAdapter.transferBancario(...)` (EFI)
   * 4. Sucesso → COMPLETED + paidAt + txIdBancario
   * 5. Falha → FAILED + AuditLog `REPASSE_FAILED`
   *
   * LGPD: dados bancários são sensíveis. Logs apenas IDs e valores monetários.
   *
   * @returns Quantidade de parcelas processadas (independente do resultado)
   */
  async processScheduledTransfers(): Promise<{
    processed: number;
    completed: number;
    failed: number;
    skipped: number;
  }> {
    const now = new Date();

    const due = await this.prisma.fundTransfer.findMany({
      where: {
        status: 'PENDING',
        scheduledDate: { lte: now },
      },
      include: {
        startup: {
          select: {
            id: true,
            banco: true,
            agencia: true,
            conta: true,
            digito: true,
            tipo_conta: true,
            pix_key: true,
            titular: true,
            documento_titular: true,
          },
        },
      },
    });

    if (due.length === 0) {
      this.logger.debug('Nenhuma parcela vencida para processar');
      return { processed: 0, completed: 0, failed: 0, skipped: 0 };
    }

    this.logger.log(
      `Processando ${due.length} parcela(s) vencida(s) — ${now.toISOString()}`,
    );

    let completed = 0;
    let failed = 0;
    const skipped = 0;

    for (const t of due) {
      const bank = this.normalizeBankAccount(t.startup);

      if (!bank) {
        // Sem dados bancários — pula e marca como FAILED com motivo
        await this.prisma.fundTransfer.update({
          where: { id: t.id },
          data: {
            status: 'FAILED',
            updatedAt: new Date(),
          },
        });
        // Cron é uma ação de sistema, sem User actor
        // AuditLog.userId é nullable para suportar este caso
        await this.prisma.auditLog.create({
          data: {
            userId: null, // ação de sistema (cron)
            action: 'REPASSE_FAILED',
            entity: 'FundTransfer',
            entityId: String(t.id),
            newValue: {
              reason: 'Dados bancários ausentes na startup',
              startupId: t.startupId,
              installmentNumber: t.installmentNumber,
            } as Prisma.InputJsonValue,
          },
        });
        this.logger.warn(
          `Parcela #${t.id} (startup=${t.startupId}, parcela=${t.installmentNumber}) FAILED — sem dados bancários`,
        );
        failed++;
        continue;
      }

      // Marca PROCESSING antes da chamada externa
      await this.prisma.fundTransfer.update({
        where: { id: t.id },
        data: { status: 'PROCESSING' },
      });

      try {
        const result = await this.executeTransfer(
          {
            id: t.id,
            amount: t.amount,
            installmentNumber: t.installmentNumber,
            startupId: t.startupId,
            invoiceId: t.notaFiscalId,
          },
          bank,
        );

        const newStatus =
          result.status === 'COMPLETED'
            ? 'COMPLETED'
            : result.status === 'FAILED'
              ? 'FAILED'
              : 'PROCESSING';

        await this.prisma.fundTransfer.update({
          where: { id: t.id },
          data: {
            status: newStatus,
            paidAt: result.status === 'COMPLETED' ? new Date() : null,
            txIdBancario: result.txId,
          },
        });

        // Cron é uma ação de sistema, sem User actor
        // AuditLog.userId é nullable para suportar este caso
        await this.prisma.auditLog.create({
          data: {
            userId: null, // ação de sistema (cron)
            action:
              result.status === 'COMPLETED'
                ? 'REPASSE_TRANSFERRED'
                : 'REPASSE_FAILED',
            entity: 'FundTransfer',
            entityId: String(t.id),
            newValue: {
              txId: result.txId,
              amount: Number(t.amount),
              installmentNumber: t.installmentNumber,
              startupId: t.startupId,
              gatewayStatus: result.status,
            } as Prisma.InputJsonValue,
          },
        });

        if (result.status === 'COMPLETED') {
          completed++;
          this.logger.log(
            `Parcela #${t.id} COMPLETED txId=${result.txId} amount=R$${Number(t.amount).toFixed(2)}`,
          );
        } else {
          failed++;
          this.logger.warn(
            `Parcela #${t.id} status=${result.status} txId=${result.txId}`,
          );
        }
      } catch (err) {
        // Falha na chamada ao gateway — marca FAILED + audit
        await this.prisma.fundTransfer.update({
          where: { id: t.id },
          data: { status: 'FAILED' },
        });
        const msg = err instanceof Error ? err.message : String(err);
        // Cron é uma ação de sistema, sem User actor
        // AuditLog.userId é nullable para suportar este caso
        await this.prisma.auditLog.create({
          data: {
            userId: null, // ação de sistema (cron)
            action: 'REPASSE_FAILED',
            entity: 'FundTransfer',
            entityId: String(t.id),
            newValue: {
              error: msg,
              amount: Number(t.amount),
              installmentNumber: t.installmentNumber,
              startupId: t.startupId,
            } as Prisma.InputJsonValue,
          },
        });
        failed++;
        this.logger.error(`Parcela #${t.id} FAILED — gateway error: ${msg}`);
      }
    }

    return {
      processed: due.length,
      completed,
      failed,
      skipped,
    };
  }

  /**
   * Normaliza dados bancários da startup, validando campos mínimos
   * para uma transferência. Retorna `null` se faltam dados essenciais.
   *
   * LGPD: helper interno, não loga dados em plaintext.
   *
   * @param startup - Startup carregada
   * @returns BankAccount normalizado ou null se faltam dados
   */
  private normalizeBankAccount(
    startup: StartupBankAccount & { id?: number },
  ): StartupBankAccount | null {
    if (
      !startup.banco ||
      !startup.agencia ||
      !startup.conta ||
      !startup.titular
    ) {
      return null;
    }
    return {
      banco: startup.banco,
      agencia: startup.agencia,
      conta: startup.conta,
      digito: startup.digito ?? null,
      tipo_conta: startup.tipo_conta ?? 'corrente',
      pix_key: startup.pix_key ?? null,
      titular: startup.titular,
      documento_titular: startup.documento_titular ?? null,
    };
  }

  /**
   * Executa a transferência PIX via gateway EFI.
   *
   * @param fundTransfer - Parcela de repasse
   * @param bank - Dados bancários normalizados da startup
   * @returns Resultado com txId e status
   */
  private async executeTransfer(
    fundTransfer: {
      id: number;
      amount: Prisma.Decimal;
      installmentNumber: number;
      startupId: number;
      invoiceId?: number | null;
    },
    bank: StartupBankAccount,
  ): Promise<{ txId: string; status: 'PROCESSING' | 'COMPLETED' | 'FAILED' }> {
    const input = {
      amount: Number(fundTransfer.amount),
      destinationAccount: {
        bankCode: bank.banco!,
        agency: bank.agencia!,
        account: `${bank.conta ?? ''}${bank.digito ? `-${bank.digito}` : ''}`,
        accountType: (bank.tipo_conta === 'poupanca'
          ? 'SAVINGS'
          : 'CHECKING') as 'SAVINGS' | 'CHECKING',
        holderName: bank.titular ?? 'Não informado',
        holderDocument: bank.documento_titular ?? '',
      },
      description: `Repasse B12 - NF ${fundTransfer.invoiceId ?? 'N/A'} - Parcela ${fundTransfer.installmentNumber}`,
      type: 'PIX' as const,
    };

    if (this.featureFlags.efiEnabled) {
      return this.efiPixAdapter.transferBancario(input);
    }
    return this.efiPixAdapter.transferBancario(input);
  }

  /**
   * Sprint S34-f — reagendamento automático de parcelas AWAITING_REQUEST
   * que o fundador NÃO solicitou dentro da janela.
   *
   * Regra de negócio (PRD FIN-09 §4.2):
   *  - Parcela AWAITING_REQUEST (sem InstallmentRequest ativa) com
   *    `scheduledDate` vencido há mais de `REPASSE_JANELA_ANTECEDENCIA_DIAS`
   *    (= 10 dias) é REAGENDADA para `scheduledDate + REPASSE_REAGENDAR_DIAS`
   *    (= +30 dias), respeitando floor de `REPASSE_MIN_DIAS_APOS_HOJE`
   *    (= 7 dias no futuro).
   *  - Garante que o cron NUNCA paga 2+ parcelas juntas: o
   *    `processScheduledTransfers` só processa `scheduledDate <= now`,
   *    e cada reagendamento empurra +30d, então parcelas caem em
   *    ordem cronológica.
   *  - Incrementa campo `reagendadaCount` (a criar via migration
   *    separada) — esta versão apenas loga. Quando a migration rodar,
   *    basta incluir o campo no Prisma model Installment e ajustar
   *    este método.
   *  - AuditLog INSTALLMENT_RESCHEDULED para rastreabilidade.
   *
   * Idempotente: cada parcela só é reagendada quando vence a janela.
   * Se o fundador solicitar enquanto está AWAITING_REQUEST antes da
   * próxima janela, ela vira REQUESTED e não será reagendada.
   */
  async reagendarParcelasAtrasadas(): Promise<{
    reagendadas: number;
    skipped: number;
  }> {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - REPASSE_JANELA_ANTECEDENCIA_DIAS);

    // Busca parcelas AWAITING_REQUEST (sem InstallmentRequest ativa
    // REQUESTED/APPROVED) com scheduledDate anterior a (now - 10 dias).
    const due = await this.prisma.installment.findMany({
      where: {
        status: 'AWAITING_REQUEST',
        scheduledDate: { lt: cutoff },
        request: {
          is: null,
        },
      },
      include: {
        repasse: true,
      },
    });

    if (due.length === 0) {
      return { reagendadas: 0, skipped: 0 };
    }

    let reagendadas = 0;
    const skipped = 0;

    for (const inst of due) {
      const oldDate = inst.scheduledDate!;
      // Nova data = max(scheduledDate + 30d, now + 7d).
      // Garante que o fundador tenha pelo menos 7 dias para solicitar.
      const naive = new Date(oldDate);
      naive.setDate(naive.getDate() + REPASSE_REAGENDAR_DIAS);
      const floor = new Date(now);
      floor.setDate(floor.getDate() + REPASSE_MIN_DIAS_APOS_HOJE);
      const newDate = naive > floor ? naive : floor;

      await this.prisma.installment.update({
        where: { id: inst.id },
        data: { scheduledDate: newDate },
      });

      // AuditLog (ação de sistema — userId null)
      await this.audit
        .log({
          userId: null,
          action: 'INSTALLMENT_RESCHEDULED',
          entity: 'Installment',
          entityId: String(inst.id),
          newValue: {
            installmentNumber: inst.numero,
            oldScheduledDate: oldDate.toISOString(),
            newScheduledDate: newDate.toISOString(),
            reason: `Fundador não solicitou dentro da janela de ${REPASSE_JANELA_ANTECEDENCIA_DIAS} dias`,
          },
        })
        .catch((err) => {
          this.logger.warn(
            `Falha ao gravar audit INSTALLMENT_RESCHEDULED para installment ${inst.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        });

      this.logger.log(
        `Installment ${inst.id} (#${inst.numero}) reagendada: ${oldDate.toISOString().slice(0, 10)} → ${newDate.toISOString().slice(0, 10)}`,
      );
      reagendadas++;
    }

    return { reagendadas, skipped };
  }
}
