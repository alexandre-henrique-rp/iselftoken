import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCommissionStatusDto } from './dto/affiliate.dto';

/**
 * Apuracao e liquidacao das comissoes de afiliado.
 *
 * Regra de negocio: sobre cada investimento CONFIRMED atribuido a um afiliado,
 * a startup paga DUAS comissoes — uma ao afiliado e outra a iSelfToken. Ambas
 * saem do valor a repassar para a startup. Os percentuais sao congelados no
 * momento da apuracao para que mudanca posterior no programa nao reescreva
 * historico financeiro.
 */
@Injectable()
export class AffiliateCommissionService {
  private readonly logger = new Logger(AffiliateCommissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Descobre a afiliacao a quem creditar um investimento.
   *
   * Precedencia: o codigo digitado no checkout vence o vinculo gravado pelo
   * link, porque e a manifestacao mais recente e explicita do investidor.
   * Retorna null quando nao ha atribuicao — o caminho normal da maioria dos
   * investimentos.
   */
  async resolveAttribution(
    investorId: number,
    startupId: number,
    checkoutCode?: string | null,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (checkoutCode) {
      const byCode = await tx.affiliation.findUnique({
        where: { code: checkoutCode },
        include: { program: true },
      });
      // So vale se ativa, do programa daquela startup e nao for auto-indicacao.
      if (
        byCode &&
        byCode.status === 'ACTIVE' &&
        byCode.program.startupId === startupId &&
        byCode.userId !== investorId
      ) {
        return { affiliation: byCode, source: 'CHECKOUT_CODE' as const };
      }
    }

    const referral = await tx.affiliateReferral.findFirst({
      where: {
        investorId,
        affiliation: {
          status: 'ACTIVE',
          program: { startupId },
        },
      },
      include: { affiliation: { include: { program: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (referral && referral.affiliation.userId !== investorId) {
      return { affiliation: referral.affiliation, source: 'LINK' as const };
    }

    return null;
  }

  /**
   * Apura a comissao de um investimento recem-confirmado.
   *
   * Idempotente: `investmentId` e unico em AffiliateCommission, entao uma
   * segunda chamada nao duplica. Falhas aqui NAO devem derrubar a confirmacao
   * do investimento — o chamador trata o erro e apenas registra log.
   */
  async createForInvestment(
    investmentId: number,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const investment = await tx.investment.findUnique({
      where: { id: investmentId },
      include: {
        campaign: { select: { startupId: true, affiliateCommissionPct: true } },
        affiliateCommission: { select: { id: true } },
      },
    });

    if (!investment) {
      this.logger.warn(`Investimento ${investmentId} não encontrado`);
      return null;
    }
    if (investment.affiliateCommission) {
      return investment.affiliateCommission;
    }

    const attribution = await this.resolveAttribution(
      investment.userId,
      investment.campaign.startupId,
      investment.affiliateCode,
      tx,
    );

    if (!attribution) {
      return null;
    }

    const { affiliation, source } = attribution;
    const program = await tx.affiliateProgram.findUnique({
      where: { id: affiliation.programId },
    });
    if (!program || program.status !== 'APPROVED') {
      return null;
    }

    // Base da comissão = valor devido à startup (startupRepasseAmount =
    // tokensQty × preço base). Investimentos legados sem split caem no
    // `amount` (que antes do split já era o valor integral repassável).
    const base = new Prisma.Decimal(
      investment.startupRepasseAmount ?? investment.amount,
    );
    // A comissão do afiliado vem da RODADA (campanha) — o fundador a definiu na
    // abertura e ela é congelada. Rodadas antigas (sem o campo) caem no % do
    // programa. A comissão da plataforma continua vindo do programa.
    const affiliatePct = new Prisma.Decimal(
      investment.campaign.affiliateCommissionPct ??
        program.affiliateCommissionPct,
    );
    const platformPct = new Prisma.Decimal(program.platformCommissionPct);
    const cem = new Prisma.Decimal(100);

    const commission = await tx.affiliateCommission.create({
      data: {
        affiliationId: affiliation.id,
        investmentId,
        baseAmount: base,
        affiliatePct,
        affiliateAmount: base.mul(affiliatePct).div(cem).toDecimalPlaces(2),
        platformPct,
        platformAmount: base.mul(platformPct).div(cem).toDecimalPlaces(2),
        attributedBy: source,
      },
    });

    this.logger.log(
      `Comissão ${commission.id} apurada: investimento ${investmentId} → afiliação ${affiliation.id} (${source})`,
    );
    return commission;
  }

  /**
   * Soma das comissoes ja apuradas de uma startup, para ser descontada do
   * repasse. Considera apenas comissoes vivas (PENDING/PAYABLE/PAID);
   * CANCELED nao onera a startup.
   */
  async getTotalDueByStartup(startupId: number) {
    const result = await this.prisma.affiliateCommission.aggregate({
      where: {
        status: { in: ['PENDING', 'PAYABLE', 'PAID'] },
        affiliation: { program: { startupId } },
      },
      _sum: { affiliateAmount: true, platformAmount: true },
    });

    const afiliados = result._sum.affiliateAmount ?? new Prisma.Decimal(0);
    const plataforma = result._sum.platformAmount ?? new Prisma.Decimal(0);

    return {
      afiliados,
      plataforma,
      total: new Prisma.Decimal(afiliados).add(plataforma),
    };
  }

  /**
   * Mesma apuracao restrita a uma campanha — e o recorte usado no repasse,
   * porque o repasse e feito por campanha FUNDED, nao pela startup inteira.
   */
  async getTotalDueByCampaign(campaignId: number) {
    const result = await this.prisma.affiliateCommission.aggregate({
      where: {
        status: { in: ['PENDING', 'PAYABLE', 'PAID'] },
        investment: { campaignId },
      },
      _sum: { affiliateAmount: true, platformAmount: true },
    });

    const afiliados = result._sum.affiliateAmount ?? new Prisma.Decimal(0);
    const plataforma = result._sum.platformAmount ?? new Prisma.Decimal(0);

    return {
      afiliados,
      plataforma,
      total: new Prisma.Decimal(afiliados).add(plataforma),
    };
  }

  /**
   * Cancela a comissao apurada de um investimento estornado (refund total).
   * Comissoes PENDING/PAYABLE viram CANCELED. Se ja estiver PAID (valor ja
   * creditado na carteira do afiliado), nao e desfeita automaticamente —
   * loga warning para tratativa manual.
   */
  async cancelForInvestment(investmentId: number) {
    const commission = await this.prisma.affiliateCommission.findUnique({
      where: { investmentId },
      select: { id: true, status: true },
    });
    if (!commission || commission.status === 'CANCELED') {
      return { changed: false, wasPaid: false };
    }
    if (commission.status === 'PAID') {
      this.logger.warn(
        `Comissão ${commission.id} do investimento ${investmentId} já está PAID ` +
          '— estorno do investimento não debita a carteira do afiliado ' +
          'automaticamente; requer tratativa manual.',
      );
      return { changed: false, wasPaid: true };
    }
    await this.prisma.affiliateCommission.update({
      where: { id: commission.id },
      data: { status: 'CANCELED' },
    });
    this.logger.log(
      `Comissão ${commission.id} cancelada (estorno do investimento ${investmentId})`,
    );
    return { changed: true, wasPaid: false };
  }

  /** Comissoes do afiliado logado. */
  async listMine(userId: number, status?: string) {
    try {
      const commissions = await this.prisma.affiliateCommission.findMany({
        where: {
          affiliation: { userId },
          ...(status && {
            status:
              status as Prisma.EnumAffiliateCommissionStatusFilter['equals'],
          }),
        },
        include: {
          affiliation: {
            select: {
              code: true,
              program: {
                select: { startup: { select: { id: true, nome: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const totals = await this.prisma.affiliateCommission.groupBy({
        by: ['status'],
        where: { affiliation: { userId } },
        _sum: { affiliateAmount: true },
      });

      return ResponseDto.success(
        'Comissões listadas',
        200,
        {
          comissoes: commissions,
          totaisPorStatus: totals.map((t) => ({
            status: t.status,
            total: t._sum.affiliateAmount ?? 0,
          })),
        },
        commissions.length,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao listar comissões', 500, error);
    }
  }

  /** Visao administrativa das comissoes, com filtros. */
  async listAll(filters: { status?: string; startupId?: number }) {
    try {
      const where: Prisma.AffiliateCommissionWhereInput = {};
      if (filters.status) {
        where.status =
          filters.status as Prisma.EnumAffiliateCommissionStatusFilter['equals'];
      }
      if (filters.startupId) {
        where.affiliation = { program: { startupId: filters.startupId } };
      }

      const commissions = await this.prisma.affiliateCommission.findMany({
        where,
        include: {
          affiliation: {
            select: {
              code: true,
              user: { select: { id: true, nome: true, email: true } },
              program: {
                select: { startup: { select: { id: true, nome: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const totals = await this.prisma.affiliateCommission.aggregate({
        where,
        _sum: { affiliateAmount: true, platformAmount: true },
      });

      return ResponseDto.success(
        'Comissões listadas',
        200,
        {
          comissoes: commissions,
          totalAfiliados: totals._sum.affiliateAmount ?? 0,
          totalPlataforma: totals._sum.platformAmount ?? 0,
        },
        commissions.length,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao listar comissões', 500, error);
    }
  }

  /**
   * Muda o status de uma comissao. Ao marcar PAID credita o valor na carteira
   * do afiliado dentro da mesma transacao, para que o lancamento e a mudanca
   * de status nunca divirjam.
   */
  async updateStatus(commissionId: number, dto: UpdateCommissionStatusDto) {
    try {
      const commission = await this.prisma.affiliateCommission.findUnique({
        where: { id: commissionId },
        include: { affiliation: { select: { userId: true } } },
      });

      if (!commission) {
        return ResponseDto.error('Comissão não encontrada', 404);
      }
      if (commission.status === 'PAID') {
        return ResponseDto.error('Comissão já foi paga', 409);
      }
      if (dto.status === 'PAID' && commission.status !== 'PAYABLE') {
        return ResponseDto.error(
          'Só é possível pagar uma comissão que esteja PAYABLE',
          400,
        );
      }

      // Gate de KYC no CRÉDITO da comissão: o afiliado não faz KYC para se
      // afiliar nem para acumular comissão, mas precisa ter o documento
      // APROVADO no momento em que a comissão é paga/creditada na carteira.
      if (dto.status === 'PAID') {
        const afiliado = await this.prisma.user.findUnique({
          where: { id: commission.affiliation.userId },
          select: { documento: { select: { status: true } } },
        });
        if (afiliado?.documento?.status !== 'APPROVED') {
          return ResponseDto.error(
            'O afiliado precisa concluir o KYC (verificação de identidade) antes de receber a comissão.',
            403,
          );
        }
      }

      const creditWallet = dto.creditWallet ?? true;

      const updated = await this.prisma.$transaction(async (tx) => {
        let walletTransactionId: number | null = commission.walletTransactionId;

        if (dto.status === 'PAID' && creditWallet) {
          const wallet = await tx.wallet.upsert({
            where: { userId: commission.affiliation.userId },
            create: { userId: commission.affiliation.userId },
            update: {},
          });

          const movimento = await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'AFFILIATE_COMMISSION',
              amount: commission.affiliateAmount,
              description: `Comissão de afiliado — investimento #${commission.investmentId}`,
              relatedInvestId: commission.investmentId,
            },
          });
          walletTransactionId = movimento.id;

          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: commission.affiliateAmount } },
          });
        }

        return tx.affiliateCommission.update({
          where: { id: commissionId },
          data: {
            status: dto.status,
            walletTransactionId,
            paidAt: dto.status === 'PAID' ? new Date() : null,
          },
        });
      });

      this.logger.log(`Comissão ${commissionId} → ${dto.status}`);
      return ResponseDto.success('Comissão atualizada', 200, updated);
    } catch (error) {
      return ResponseDto.error('Erro ao atualizar comissão', 500, error);
    }
  }

  /**
   * Registra o vinculo investidor-afiliado gerado por clique no link.
   * Idempotente pela unique (affiliationId, investorId).
   */
  async trackReferral(code: string, investorId: number) {
    try {
      const affiliation = await this.prisma.affiliation.findUnique({
        where: { code },
        include: { program: { select: { startupId: true, status: true } } },
      });

      if (!affiliation || affiliation.status !== 'ACTIVE') {
        return ResponseDto.error('Código de afiliado inválido', 404);
      }
      if (affiliation.program.status !== 'APPROVED') {
        return ResponseDto.error('Programa não está ativo', 400);
      }
      if (affiliation.userId === investorId) {
        return ResponseDto.error('Não é possível usar o próprio código', 400);
      }

      const referral = await this.prisma.affiliateReferral.upsert({
        where: {
          affiliationId_investorId: {
            affiliationId: affiliation.id,
            investorId,
          },
        },
        create: {
          affiliationId: affiliation.id,
          investorId,
          source: 'LINK',
        },
        update: {},
      });

      return ResponseDto.success('Indicação registrada', 200, {
        referralId: referral.id,
        startupId: affiliation.program.startupId,
      });
    } catch (error) {
      return ResponseDto.error('Erro ao registrar indicação', 500, error);
    }
  }
}
