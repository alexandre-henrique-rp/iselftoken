import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { TokenReservationService } from 'src/api/tokens/token-reservation.service';
import { TokensService } from 'src/api/tokens/tokens.service';
import { AffiliateCommissionService } from 'src/api/affiliate/affiliate-commission.service';
import { ConfigService } from 'src/api/config/config.service';
import { AuditService } from 'src/common/audit/audit.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';

/** Arredonda para 2 casas decimais (centavos) sem erro de float. */
const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Split financeiro de um investimento (Modelo B).
 *
 *   tokenSubtotal          = tokensQty x tokenSellPrice   → Investment.amount
 *   platformFeeAmount      = tokenSubtotal x platformFeePct
 *   totalCharged           = tokenSubtotal + platformFee  → Payment.amount
 *   startupRepasseAmount   = tokensQty x tokenBasePrice   → repasse a startup
 *   platformSpreadAmount   = tokenSubtotal - repasse      → ganho do markup
 *   platformRevenueAmount  = spread + fee                 → receita plataforma
 */
export interface InvestmentSplit {
  tokensQty: number;
  tokenBasePrice: number;
  tokenSellPrice: number;
  tokenSubtotal: number;
  platformFeePct: number;
  platformFeeAmount: number;
  startupRepasseAmount: number;
  platformSpreadAmount: number;
  platformRevenueAmount: number;
  totalCharged: number;
}

@Injectable()
export class InvestmentsService {
  private readonly logger = new Logger(InvestmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: TokensService,
    private readonly tokenReservationService: TokenReservationService,
    private readonly audit: AuditService,
    private readonly configService: ConfigService,
    private readonly affiliateCommissionService: AffiliateCommissionService,
  ) {}

  /**
   * Calcula o split financeiro a partir dos snapshots da campanha.
   *
   * O `amount` recebido do cliente serve apenas para derivar a quantidade de
   * tokens — todos os valores monetarios sao recalculados no servidor a
   * partir dos precos gravados na campanha (nunca confiamos em totais do
   * frontend).
   */
  private async computeSplit(
    campaign: { tokenPrice: any; tokenBaseValue: any; tokenSellPrice?: any },
    amount: number,
  ): Promise<InvestmentSplit> {
    // Preco de venda = snapshot tokenSellPrice; tokenPrice e alias legado.
    const tokenSellPrice = Number(
      campaign.tokenSellPrice ?? campaign.tokenPrice,
    );
    const tokenBasePrice = Number(
      campaign.tokenBaseValue ?? campaign.tokenPrice,
    );
    const tokensQty = this.calcularTokensQty(amount, tokenSellPrice);
    const tokenSubtotal = round2(tokensQty * tokenSellPrice);
    const platformFeePctRaw = await this.configService.getEffective(
      'fundraising.platformFee',
    );
    const platformFeePct =
      Number.isFinite(platformFeePctRaw) && platformFeePctRaw >= 0
        ? platformFeePctRaw
        : 0;
    const platformFeeAmount = round2(tokenSubtotal * platformFeePct);
    const startupRepasseAmount = round2(tokensQty * tokenBasePrice);
    const platformSpreadAmount = round2(tokenSubtotal - startupRepasseAmount);

    return {
      tokensQty,
      tokenBasePrice,
      tokenSellPrice,
      tokenSubtotal,
      platformFeePct,
      platformFeeAmount,
      startupRepasseAmount,
      platformSpreadAmount,
      platformRevenueAmount: round2(platformSpreadAmount + platformFeeAmount),
      totalCharged: round2(tokenSubtotal + platformFeeAmount),
    };
  }

  /**
   * Calcula a quantidade de tokens para um valor de investimento.
   *
   * @param amount - Valor do investimento em reais (ex: 1000 = R$ 1.000,00)
   * @param tokenPrice - Preco do token em reais (ex: 200 = R$ 200,00)
   * @returns Quantidade de tokens (arredondada para baixo via Math.trunc)
   *
   * Formula: tokensQty = floor(amount / tokenPrice)
   *
   * @example
   *   calcularTokensQty(1000, 200)  // => 5 tokens
   *   calcularTokensQty(1050, 200)  // => 5 tokens (50c desperdicados)
   *   calcularTokensQty(50000, 200) // => 250 tokens
   */
  calcularTokensQty(amount: number, tokenPrice: number): number {
    if (tokenPrice <= 0 || amount <= 0) return 0;
    // Math.trunc e equivalente a floor para numeros positivos,
    // mas evita algumas armadilhas de precisao de ponto flutuante.
    return Math.trunc(amount / tokenPrice);
  }

  /**
   * POST /investments - Cria Investment (PENDING).
   * Validação: documento KYC aprovado, subscription ativa, campaign OPEN e compra de pelo menos 1 token.
   */
  async create(userId: number, createDto: CreateInvestmentDto) {
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      const result = await this.prisma.$transaction(async (tx) => {
        const investor = await tx.user.findUnique({
          where: { id: userId },
          select: { documento: { select: { status: true } } },
        });
        if (investor?.documento?.status !== 'APPROVED') {
          throw new HttpException(
            'É necessário ter o documento de identidade aprovado para investir',
            HttpStatus.FORBIDDEN,
          );
        }

        const subscription = await tx.subscription.findFirst({
          where: { userId, status: 'ACTIVE' },
          select: { id: true },
        });
        if (!subscription) {
          throw new HttpException(
            'É necessário ter uma assinatura ativa para investir',
            HttpStatus.FORBIDDEN,
          );
        }

        const campaign = await tx.campaign.findUnique({
          where: { id: createDto.campaignId },
          include: {
            startup: { select: { nome: true, status: true } },
          },
        });
        if (!campaign) {
          throw new HttpException(
            'Campanha não encontrada',
            HttpStatus.NOT_FOUND,
          );
        }
        if (campaign.status !== 'OPEN') {
          throw new HttpException(
            `Campanha está com status ${campaign.status}. Apenas campanhas OPEN aceitam investimentos.`,
            HttpStatus.BAD_REQUEST,
          );
        }

        const split = await this.computeSplit(campaign, createDto.amount);
        if (split.tokensQty < 1) {
          throw new HttpException(
            'Valor insuficiente para comprar pelo menos 1 token',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (split.tokenSellPrice < split.tokenBasePrice) {
          throw new HttpException(
            'Preco de venda da campanha esta abaixo do valor base do token',
            HttpStatus.CONFLICT,
          );
        }

        const investment = await tx.investment.create({
          data: {
            userId,
            campaignId: createDto.campaignId,
            amount: split.tokenSubtotal,
            tokensQty: split.tokensQty,
            affiliateCode: createDto.affiliateCode?.trim() || null,
            status: 'PENDING',
            // Split financeiro — snapshot imutavel do pedido (allocatedAt
            // e carimbado apenas na confirmacao do pagamento).
            tokenBasePrice: split.tokenBasePrice,
            tokenSellPrice: split.tokenSellPrice,
            tokenSubtotal: split.tokenSubtotal,
            platformFeePct: split.platformFeePct,
            platformFeeAmount: split.platformFeeAmount,
            startupRepasseAmount: split.startupRepasseAmount,
            platformSpreadAmount: split.platformSpreadAmount,
            platformRevenueAmount: split.platformRevenueAmount,
          },
          include: {
            campaign: {
              select: { title: true, tokenPrice: true, minInvestment: true },
            },
          },
        });

        const reservation = await this.tokenReservationService.reserve(
          {
            campaignId: createDto.campaignId,
            userId,
            quantity: split.tokensQty,
            investmentId: investment.id,
            expiresAt,
          },
          tx,
        );
        if (!reservation.ok) {
          throw new ConflictException(
            `Estoque insuficiente. Apenas ${reservation.available} token(s) estão disponíveis.`,
          );
        }

        const payment = await tx.payment.create({
          data: {
            userId,
            investmentId: investment.id,
            // O investidor paga subtotal dos tokens + taxa da plataforma.
            amount: split.totalCharged,
            originalAmount: split.totalCharged,
            paidAmount: split.totalCharged,
            method: 'PIX',
            purpose: 'INVESTMENT',
            status: 'PENDING',
            expiresAt,
            // Breakdown consumido pelo checkout (ordem transparente).
            serviceDetails: {
              investmentBreakdown: {
                tokensQty: split.tokensQty,
                tokenBasePrice: split.tokenBasePrice,
                tokenSellPrice: split.tokenSellPrice,
                tokenSubtotal: split.tokenSubtotal,
                platformFeePct: split.platformFeePct,
                platformFeeAmount: split.platformFeeAmount,
                startupRepasseAmount: split.startupRepasseAmount,
                platformSpreadAmount: split.platformSpreadAmount,
                platformRevenueAmount: split.platformRevenueAmount,
                totalCharged: split.totalCharged,
              },
            },
          },
        });

        return {
          investment,
          payment,
          reservation: reservation.reservation,
          split,
        };
      });

      this.logger.log(
        `Investimento criado: ${result.investment.id} - subtotal R$ ${result.split.tokenSubtotal} + taxa R$ ${result.split.platformFeeAmount} = R$ ${result.split.totalCharged} - ${result.investment.tokensQty} tokens`,
      );

      return ResponseDto.success('Investimento criado com sucesso', 201, {
        investment: {
          id: result.investment.id,
          campaignId: result.investment.campaignId,
          campaignTitle: result.investment.campaign.title,
          amount: Number(result.investment.amount),
          tokensQty: result.investment.tokensQty,
          status: result.investment.status,
          createdAt: result.investment.createdAt,
        },
        payment: {
          id: result.payment.id,
          status: result.payment.status,
          method: result.payment.method,
          amount: Number(result.payment.amount),
          expiresAt: result.payment.expiresAt,
        },
        breakdown: {
          tokensQty: result.split.tokensQty,
          tokenBasePrice: result.split.tokenBasePrice,
          tokenSellPrice: result.split.tokenSellPrice,
          tokenSubtotal: result.split.tokenSubtotal,
          platformFeePct: result.split.platformFeePct,
          platformFeeAmount: result.split.platformFeeAmount,
          totalCharged: result.split.totalCharged,
        },
        reservation: {
          id: result.reservation.id,
          expiresAt: result.reservation.expiresAt,
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Erro ao criar investimento', error);
      return ResponseDto.error('Erro ao criar investimento', 500, error);
    }
  }

  /**
   * Confirma investimento após pagamento.
   * Atualiza status para CONFIRMED e emite tokens.
   */
  /**
   * Confirma um investimento após o pagamento ser marcado PAID.
   *
   * IDEMPOTENTE: se o investimento já não está PENDING (ex.: reprocessamento
   * por retry/reentrega de mensagem), retorna sem erro e sem duplicar efeito.
   *
   * ATÔMICO: marca CONFIRMED + incrementa tokensSold na mesma transação, de
   * modo que nunca fica um investimento CONFIRMED sem o tokensSold refletido
   * (ou vice-versa). A emissão de tokens roda após o commit — é idempotente
   * no próprio TokensService e pode ser reprocessada se falhar.
   */
  async confirmInvestment(investmentId: number, ownerId?: number) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: { payment: true },
    });

    if (!investment) {
      throw new HttpException(
        'Investimento não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    if (ownerId !== undefined && investment.userId !== ownerId) {
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }

    // Idempotência: reprocessar um investimento não-PENDING é no-op seguro.
    if (investment.status !== 'PENDING') {
      this.logger.log(
        `Investimento ${investmentId} já está ${investment.status} (idempotente)`,
      );
      return ResponseDto.success('Investimento já confirmado', 200, {
        investment: {
          id: investment.id,
          status: investment.status,
          tokensQty: investment.tokensQty,
        },
        tokens: null,
      });
    }

    // Guarda: o pagamento precisa estar PAID.
    if (investment.payment?.status !== 'PAID') {
      throw new HttpException(
        'Pagamento ainda não confirmado',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Transação: CONFIRMED + tokensSold atômicos. Relê o status DENTRO da
    // transação para blindar contra corrida entre dois processamentos.
    const applied = await this.prisma.$transaction(async (tx) => {
      const current = await tx.investment.findUnique({
        where: { id: investmentId },
        select: { status: true },
      });
      if (!current || current.status !== 'PENDING') {
        return false;
      }
      await this.tokenReservationService.confirmByInvestment(investmentId, tx);
      await tx.investment.update({
        where: { id: investmentId },
        // `allocatedAt` carimba o momento da confirmacao do pagamento — a
        // partir dele o split financeiro gravado na criacao passa a contar
        // nos dashboards e no repasse.
        data: { status: 'CONFIRMED', allocatedAt: new Date() },
      });
      await tx.campaign.update({
        where: { id: investment.campaignId },
        data: { tokensSold: { increment: investment.tokensQty } },
      });
      return true;
    });

    if (!applied) {
      this.logger.log(
        `Investimento ${investmentId} confirmado concorrentemente (idempotente)`,
      );
      return ResponseDto.success('Investimento já confirmado', 200, {
        investment: {
          id: investmentId,
          status: 'CONFIRMED',
          tokensQty: investment.tokensQty,
        },
        tokens: null,
      });
    }

    // Emite tokens após o commit (idempotente no TokensService).
    const tokenResult =
      await this.tokensService.emitTokensForInvestment(investmentId);

    // Apura comissao de afiliado (se houver atribuicao) — best-effort FORA do
    // caminho critico: falha nao pode desfazer tokens ja emitidos e a apuracao
    // e idempotente por investmentId (pode ser reprocessada depois).
    // Base da comissao: startupRepasseAmount (valor devido a startup).
    try {
      await this.affiliateCommissionService.createForInvestment(investmentId);
      // Re-lê o registro completo — createForInvestment retorna apenas { id }
      // no caminho idempotente.
      const commission = await this.prisma.affiliateCommission.findUnique({
        where: { investmentId },
        select: { affiliateAmount: true },
      });
      if (commission) {
        await this.prisma.investment.update({
          where: { id: investmentId },
          data: {
            affiliateCommissionAmount: Number(commission.affiliateAmount),
          },
        });
      }
    } catch (commissionError) {
      this.logger.error(
        `Falha ao apurar comissao de afiliado do investimento ${investmentId}`,
        commissionError,
      );
    }

    this.logger.log(`Investimento confirmado: ${investmentId}`);

    return ResponseDto.success(
      'Investimento confirmado e tokens emitidos',
      200,
      {
        investment: {
          id: investmentId,
          status: 'CONFIRMED',
          tokensQty: investment.tokensQty,
        },
        tokens: tokenResult.data,
      },
    );
  }

  /** Cancela logicamente a ordem do investidor e libera a reserva. */
  async cancelInvestment(
    investmentId: number,
    ownerId: number,
    reason = 'Cancelado pelo investidor',
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findUnique({
        where: { id: investmentId },
        include: { payment: true },
      });
      if (!investment) {
        throw new HttpException(
          'Investimento não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      if (investment.userId !== ownerId) {
        throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
      }
      if (investment.status === 'CANCELED') {
        return { investment, payment: investment.payment, changed: false };
      }
      if (
        investment.status === 'CONFIRMED' ||
        investment.status === 'REFUNDED'
      ) {
        throw new HttpException(
          'Investimento já confirmado e não pode ser cancelado por este fluxo',
          HttpStatus.CONFLICT,
        );
      }
      if (investment.payment?.status === 'PAID') {
        throw new HttpException(
          'Pagamento já confirmado; aguarde o processamento da compra',
          HttpStatus.CONFLICT,
        );
      }

      const updatedInvestment = await tx.investment.update({
        where: { id: investmentId },
        data: { status: 'CANCELED' },
      });
      if (investment.payment?.status === 'PENDING') {
        await tx.payment.update({
          where: { id: investment.payment.id },
          data: { status: 'CANCELED', updatedAt: new Date() },
        });
      }
      await this.tokenReservationService.discardByInvestment(
        investmentId,
        reason,
        tx,
      );

      return {
        investment: updatedInvestment,
        payment: investment.payment
          ? { ...investment.payment, status: 'CANCELED' as const }
          : null,
        changed: true,
      };
    });

    if (result.changed) {
      await this.audit.log({
        userId: ownerId,
        action: 'INVESTMENT_CANCEL',
        entity: 'Investment',
        entityId: investmentId,
        oldValue: { status: 'PENDING' },
        newValue: {
          status: 'CANCELED',
          reason,
          paymentStatus: result.payment?.status ?? null,
        },
      });
    }

    this.logger.log(`Investimento ${investmentId} cancelado: ${reason}`);
    return ResponseDto.success('Investimento cancelado com sucesso', 200, {
      investment: {
        id: result.investment.id,
        status: result.investment.status,
      },
      payment: result.payment
        ? { id: result.payment.id, status: result.payment.status }
        : null,
    });
  }

  /**
   * Estorno TOTAL de um investimento (regra de negócio: não existe estorno
   * parcial — o pedido inteiro é revertido). Chamado pelo fluxo admin
   * (`PaymentService.cancelByAdmin` quando o Payment é purpose=INVESTMENT).
   *
   * Investimento CONFIRMED → REFUNDED:
   *   - devolve tokensQty ao estoque da campanha (tokensSold decrementa);
   *   - remove os tokens emitidos para este aporte (eles nunca deveriam
   *     circular após o estorno);
   *   - cancela a comissão de afiliado apurada (se PENDING/PAYABLE).
   *
   * Investimento PENDING → CANCELED (pagamento nunca confirmou; libera a
   * reserva de tokens).
   *
   * Idempotente: REFUNDED/CANCELED → no-op.
   */
  async refundInvestment(
    investmentId: number,
    actorId: number,
    reason = 'Estorno administrativo',
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findUnique({
        where: { id: investmentId },
        include: { payment: true },
      });
      if (!investment) {
        throw new HttpException(
          'Investimento não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      if (
        investment.status === 'REFUNDED' ||
        investment.status === 'CANCELED'
      ) {
        return { investment, changed: false, refundedTokens: 0 };
      }

      if (investment.status === 'PENDING') {
        const canceled = await tx.investment.update({
          where: { id: investmentId },
          data: { status: 'CANCELED' },
        });
        if (investment.payment?.status === 'PENDING') {
          await tx.payment.update({
            where: { id: investment.payment.id },
            data: { status: 'CANCELED' },
          });
        }
        await this.tokenReservationService.discardByInvestment(
          investmentId,
          reason,
          tx,
        );
        return { investment: canceled, changed: true, refundedTokens: 0 };
      }

      // CONFIRMED → estorno integral: volta estoque + remove tokens emitidos.
      const updated = await tx.investment.update({
        where: { id: investmentId },
        data: { status: 'REFUNDED' },
      });
      await tx.campaign.update({
        where: { id: investment.campaignId },
        data: { tokensSold: { decrement: investment.tokensQty } },
      });
      const deletedTokens = await tx.token.deleteMany({
        where: { investmentId },
      });
      await tx.payment.updateMany({
        where: { investmentId, status: 'PAID' },
        data: { status: 'REFUNDED' },
      });
      return {
        investment: updated,
        changed: true,
        refundedTokens: deletedTokens.count,
      };
    });

    if (result.changed) {
      // Comissão de afiliado não sobrevive a um estorno (best-effort fora da
      // transação — comissão já PAID fica para tratativa manual).
      try {
        await this.affiliateCommissionService.cancelForInvestment(investmentId);
      } catch (commissionError) {
        this.logger.error(
          `Falha ao cancelar comissão do investimento ${investmentId}`,
          commissionError,
        );
      }

      await this.audit.log({
        userId: actorId,
        action:
          result.investment.status === 'REFUNDED'
            ? 'INVESTMENT_REFUND'
            : 'INVESTMENT_CANCEL',
        entity: 'Investment',
        entityId: investmentId,
        oldValue: { status: 'CONFIRMED' },
        newValue: {
          status: result.investment.status,
          reason,
          refundedTokens: result.refundedTokens,
          // Snapshots do split preservam a auditoria financeira do estorno.
          startupRepasseAmount: result.investment.startupRepasseAmount,
          platformRevenueAmount: result.investment.platformRevenueAmount,
        },
      });
    }

    this.logger.log(
      `Investimento ${investmentId} → ${result.investment.status}: ${reason}`,
    );
    return ResponseDto.success('Investimento estornado com sucesso', 200, {
      investment: {
        id: result.investment.id,
        status: result.investment.status,
      },
    });
  }

  /** Retorna a confirmação somente quando os tokens já foram emitidos. */
  async getConfirmation(investmentId: number, ownerId: number) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            paidAt: true,
            effectsAppliedAt: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
            tokenPrice: true,
            startup: { select: { id: true, nome: true, slug: true } },
          },
        },
        tokens: { select: { id: true, quantity: true } },
      },
    });

    if (!investment) {
      throw new HttpException(
        'Investimento não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
    if (investment.userId !== ownerId) {
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }

    if (
      investment.status !== 'CONFIRMED' ||
      investment.payment?.status !== 'PAID' ||
      !investment.payment.effectsAppliedAt ||
      investment.tokens.length === 0
    ) {
      throw new HttpException(
        'A confirmação do investimento ainda está sendo processada',
        HttpStatus.CONFLICT,
      );
    }

    return ResponseDto.success('Confirmação do investimento retornada', 200, {
      investment: {
        id: investment.id,
        amount: Number(investment.amount),
        tokensQty: investment.tokensQty,
        status: investment.status,
        paidAt: investment.payment.paidAt,
        effectsAppliedAt: investment.payment.effectsAppliedAt,
        // Split financeiro (Modelo B) — transparencia do que foi cobrado
        // do investidor vs. o que vai para a startup.
        tokenSellPrice:
          investment.tokenSellPrice != null
            ? Number(investment.tokenSellPrice)
            : null,
        tokenBasePrice:
          investment.tokenBasePrice != null
            ? Number(investment.tokenBasePrice)
            : null,
        tokenSubtotal:
          investment.tokenSubtotal != null
            ? Number(investment.tokenSubtotal)
            : null,
        platformFeePct:
          investment.platformFeePct != null
            ? Number(investment.platformFeePct)
            : null,
        platformFeeAmount:
          investment.platformFeeAmount != null
            ? Number(investment.platformFeeAmount)
            : null,
        startupRepasseAmount:
          investment.startupRepasseAmount != null
            ? Number(investment.startupRepasseAmount)
            : null,
        totalCharged:
          investment.payment?.amount != null
            ? Number(investment.payment.amount)
            : null,
      },
      startup: {
        id: investment.campaign.startup.id,
        nome: investment.campaign.startup.nome,
        slug: investment.campaign.startup.slug,
      },
      campaign: {
        id: investment.campaign.id,
        title: investment.campaign.title,
        tokenPrice: Number(investment.campaign.tokenPrice),
      },
      tokens: {
        total: investment.tokens.reduce(
          (sum, token) => sum + token.quantity,
          0,
        ),
        ids: investment.tokens.map((token) => token.id),
      },
    });
  }

  /**
   * Lista investimentos do usuário.
   */
  async findByUser(userId: number) {
    try {
      const investments = await this.prisma.investment.findMany({
        where: { userId },
        include: {
          campaign: {
            select: {
              title: true,
              status: true,
              tokenPrice: true,
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
              method: true,
              amount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return ResponseDto.success('Investimentos retornados', 200, {
        total: investments.length,
        investments: investments.map((i) => ({
          id: i.id,
          campaignTitle: i.campaign.title,
          // amount = subtotal de tokens (qty x preco de venda, Modelo B).
          amount: Number(i.amount),
          // totalCharged = subtotal + taxa da plataforma (o que o investidor
          // efetivamente pagou). Fallback p/ legado: proprio amount.
          totalCharged: i.payment?.amount
            ? Number(i.payment.amount)
            : Number(i.amount),
          platformFeeAmount:
            i.platformFeeAmount != null ? Number(i.platformFeeAmount) : null,
          tokensQty: i.tokensQty,
          status: i.status,
          paymentStatus: i.payment?.status,
          createdAt: i.createdAt,
        })),
      });
    } catch (error) {
      this.logger.error('Erro ao buscar investimentos', error);
      return ResponseDto.error('Erro ao buscar investimentos', 500, error);
    }
  }

  /**
   * Agrega investimentos do usuário por startup.
   *
   * Considera apenas CONFIRMED (aportes efetivados — PENDING/CANCELED não devem
   * aparecer no dashboard). Para cada startup retornamos: nome, logo, segmento,
   * status da campanha, número de aportes, total investido (R$), total de tokens
   * e valor atual (soma de `currentVal` dos Tokens emitidos).
   *
   * Performance: 1 query com include de campaign + startup + tokens.
   * Apenas Tokens emitidos a partir dos investments do usuário (campaignId + userId).
   */
  async findMyInvestedStartups(userId: number) {
    try {
      const investments = await this.prisma.investment.findMany({
        where: { userId, status: 'CONFIRMED' },
        include: {
          campaign: {
            select: {
              id: true,
              status: true,
              startup: {
                select: {
                  id: true,
                  nome: true,
                  logo: { select: { url_sm: true } },
                  area_atuacao: true,
                },
              },
            },
          },
          tokens: {
            select: { quantity: true, currentVal: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const grouped = new Map<
        number,
        {
          startupId: number;
          nome: string;
          logo: string | null;
          segmento: string | null;
          // P3.3 — campo singular. Antes era `campaignStatuses: Set<string>`
          // mas a UI consome apenas o ultimo valor (`slice(-1)[0]`); mantemos
          // so o estado mais recente (mais conservador — reflete a campanha
          // ativa). Se a startup tiver multiplas campanhas em estados
          // diferentes, exibimos o estado da mais recente (ordering ASC
          // por createdAt abaixo).
          campaignStatus: string;
          aportes: number;
          totalInvestido: number;
          totalTokens: number;
          currentValue: number;
        }
      >();

      for (const inv of investments) {
        const startup = inv.campaign.startup;
        if (!startup) continue;

        const entry =
          grouped.get(startup.id) ??
          ({
            startupId: startup.id,
            nome: startup.nome,
            logo: startup.logo?.url_sm ?? null,
            segmento: startup.area_atuacao,
            campaignStatus: inv.campaign.status,
            aportes: 0,
            totalInvestido: 0,
            totalTokens: 0,
            currentValue: 0,
          } as const);

        const tokensQty = inv.tokensQty;
        const tokensCurrentValue = inv.tokens.reduce(
          (sum, t) => sum + (t.currentVal ? Number(t.currentVal) : 0),
          0,
        );

        grouped.set(startup.id, {
          ...entry,
          // Mantem o status da campanha mais recente (loop ASC por createdAt).
          campaignStatus: inv.campaign.status,
          aportes: entry.aportes + 1,
          totalInvestido: entry.totalInvestido + Number(inv.amount),
          totalTokens: entry.totalTokens + tokensQty,
          currentValue: entry.currentValue + tokensCurrentValue,
        });
      }

      const startups = Array.from(grouped.values()).map((s) => ({
        startupId: s.startupId,
        nome: s.nome,
        logo: s.logo,
        segmento: s.segmento,
        // Prioriza status terminal visível: pega o primeiro (ordem cronológica
        // do investimento mais antigo). Útil para exibir rótulo da campanha.
        campaignStatus: s.campaignStatus,
        aportes: s.aportes,
        totalInvestido: s.totalInvestido,
        totalTokens: s.totalTokens,
        currentValue: s.currentValue > 0 ? s.currentValue : null,
      }));

      const totalInvestido = startups.reduce(
        (sum, s) => sum + s.totalInvestido,
        0,
      );
      const currentValueTotal = startups.reduce(
        (sum, s) => sum + (s.currentValue ?? 0),
        0,
      );

      return ResponseDto.success('Startups investidas retornadas', 200, {
        startups,
        totalStartups: startups.length,
        totalInvestido,
        currentValueTotal,
      });
    } catch (error) {
      this.logger.error('Erro ao buscar startups investidas', error);
      return ResponseDto.error(
        'Erro ao buscar startups investidas',
        500,
        error,
      );
    }
  }
}
