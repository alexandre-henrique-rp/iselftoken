import { Injectable } from '@nestjs/common';
import type { PaymentMethod, PaymentPurpose, WalletType } from '@prisma/client';
import {
  PaymentMethod as PrismaPaymentMethod,
  PaymentPurpose as PrismaPaymentPurpose,
  WalletType as PrismaWalletType,
} from '@prisma/client';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { CouponSettlementService } from '../payment/coupons/coupon-settlement.service';
import { PaymentService } from '../payment/payment.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponSettlementService: CouponSettlementService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * @name create
   * @description Cria uma transação conforme o propósito e método.
   *
   * @param data Dados da transação
   * @param user Usuário autenticado
   */
  async create(data: CreateTransactionDto, user: PayloadEntity) {
    try {
      const existing = await this.findRecentPending(data, user.id);
      if (existing) {
        return ResponseDto.success(
          'Transação pendente já existente',
          200,
          existing,
        );
      }

      switch (data.purpose) {
        case PrismaPaymentPurpose.SUBSCRIPTION:
          return this.createSubscriptionPayment(data, user);
        case PrismaPaymentPurpose.INVESTMENT:
          return this.createInvestmentPayment(data, user);
        case PrismaPaymentPurpose.TOKEN_RESERVATION:
          return this.createReservationPayment(data, user);
        case PrismaPaymentPurpose.EARLY_ACCESS:
          return this.createEarlyAccessPayment(data, user);
        case PrismaPaymentPurpose.P2P_BUY:
          return ResponseDto.error('P2P_BUY ainda não implementado', 400);
        default:
          return ResponseDto.error('Propósito inválido', 400);
      }
    } catch (error) {
      return ResponseDto.error('Erro ao criar transação', 500, error);
    }
  }

  /**
   * @name findAll
   * @description Lista transações do usuário autenticado com paginação.
   *
   * @param query Parâmetros de paginação
   * @param user Usuário autenticado
   */
  async findAll(query: { page?: number; limit?: number }, user: PayloadEntity) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 25;

      const paymentInclude = {
        subscription: true,
        investment: true,
        campaign: true,
      };

      const paymentQuery = {
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' as const },
        take: limit,
        skip: (page - 1) * limit,
        include: paymentInclude,
      };

      const [data, total] = await this.prisma.$transaction([
        this.prisma.payment.findMany(paymentQuery),
        this.prisma.payment.count({ where: { userId: user.id } }),
      ]);

      return ResponseDto.success(
        'Transações retornadas com sucesso',
        200,
        data,
        total,
        page,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao listar transações', 500, error);
    }
  }

  /**
   * @name findOne
   * @description Busca uma transação do usuário autenticado.
   *
   * @param id ID da transação
   * @param user Usuário autenticado
   */
  async findOne(id: number, user: PayloadEntity) {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { id, userId: user.id },
        include: {
          subscription: true,
          investment: true,
          campaign: true,
        },
      });

      if (!payment) {
        return ResponseDto.error('Transação não encontrada', 404);
      }

      return ResponseDto.success(
        'Transação encontrada com sucesso',
        200,
        payment,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao buscar transação', 500, error);
    }
  }

  async findAllAdmin(query?: {
    page?: number;
    limit?: number;
    search?: string;
    cursor?: number;
  }) {
    try {
      const limit = Math.min(query?.limit || 25, 100);
      const search = query?.search?.trim();
      const cursor = query?.cursor;

      const where: any = {};

      if (search) {
        const searchNum = parseInt(search, 10);
        where.OR = [
          { status: { contains: search } },
          { method: { contains: search } },
          { user: { nome: { contains: search } } },
          { user: { email: { contains: search } } },
          ...(searchNum ? [{ id: searchNum }, { userId: searchNum }] : []),
        ];
      }

      if (cursor !== undefined) {
        where.id = { lt: cursor };
      }

      const useOffset = cursor === undefined;
      const page = query?.page || 1;

      const [payments, total] = await Promise.all([
        this.prisma.payment.findMany({
          where,
          take: limit + 1,
          ...(useOffset ? { skip: (page - 1) * limit } : {}),
          ...(cursor !== undefined ? { cursor: { id: cursor }, skip: 1 } : {}),
          orderBy: { id: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
            subscription: true,
            investment: true,
            campaign: {
              include: {
                startup: true,
              },
            },
          },
        }),
        useOffset ? this.prisma.payment.count({ where }) : Promise.resolve(0),
      ]);

      const hasMore = payments.length > limit;
      const items = hasMore ? payments.slice(0, limit) : payments;
      const nextCursor =
        !useOffset && hasMore ? items[items.length - 1].id : null;

      const response = ResponseDto.success(
        'Transações retornadas com sucesso',
        200,
        items,
        total,
        useOffset ? page : undefined,
      );
      if (nextCursor !== null) {
        (response as { nextCursor?: number }).nextCursor = nextCursor;
      }
      return response;
    } catch (error) {
      return ResponseDto.error('Erro ao listar transações', 500, error);
    }
  }

  async findOneAdmin(id: number) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
          subscription: true,
          investment: true,
          campaign: {
            include: {
              startup: true,
            },
          },
        },
      });

      if (!payment) {
        return ResponseDto.error('Transação não encontrada', 404);
      }

      return ResponseDto.success(
        'Transação encontrada com sucesso',
        200,
        payment,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao buscar transação', 500, error);
    }
  }

  /**
   * @name confirm
   * @description Confirma um pagamento pendente e aplica regras de negócio.
   *
   * @param id ID da transação
   * @param user Usuário autenticado
   */
  async confirm(id: number, user: PayloadEntity) {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { id, userId: user.id },
        include: {
          subscription: true,
          investment: true,
          campaign: true,
        },
      });

      if (!payment) {
        return ResponseDto.error('Transação não encontrada', 404);
      }

      if (payment.status !== 'PENDING') {
        return ResponseDto.error(
          'Apenas transações PENDING podem ser confirmadas',
          400,
        );
      }

      const transition = await this.prisma.payment.updateMany({
        where: {
          id: payment.id,
          userId: user.id,
          status: 'PENDING',
        },
        data: { status: 'PAID', paidAt: new Date() },
      });

      if (transition.count !== 1) {
        return ResponseDto.error(
          'A transação deixou de estar PENDING antes da confirmação',
          409,
        );
      }

      // Todos os efeitos de um Payment PAID passam pelo pipeline centralizado.
      // Isso também grava effectsAppliedAt e evita duplicação com webhook/retry.
      await this.paymentService.processPaymentEffects(payment.id);

      const updated = await this.prisma.payment.findUnique({
        where: { id: payment.id },
        include: {
          subscription: true,
          investment: true,
          campaign: true,
        },
      });

      return ResponseDto.success(
        'Transação confirmada com sucesso',
        200,
        updated,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao confirmar transação', 500, error);
    }
  }

  /**
   * @name cancel
   * @description Cancela uma transação pendente.
   *
   * @param id ID da transação
   * @param user Usuário autenticado
   */
  async cancel(id: number, user: PayloadEntity) {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { id, userId: user.id },
        include: {
          subscription: true,
          investment: true,
          campaign: true,
        },
      });

      if (!payment) {
        return ResponseDto.error('Transação não encontrada', 404);
      }

      if (payment.status !== 'PENDING') {
        return ResponseDto.error(
          'Apenas transações PENDING podem ser canceladas',
          400,
        );
      }

      // A transição condicional define o vencedor entre cancelamento e webhook.
      const canceled = await this.prisma.$transaction(async (tx) => {
        const transition = await tx.payment.updateMany({
          where: {
            id: payment.id,
            userId: user.id,
            status: 'PENDING',
          },
          data: { status: 'CANCELED' },
        });

        if (transition.count !== 1) return false;

        // Cancela investment se existir
        if (payment.investmentId) {
          await tx.investment.update({
            where: { id: payment.investmentId },
            data: { status: 'CANCELED' },
          });
        }

        // Cancela subscription se existir
        if (payment.subscriptionId) {
          await tx.subscription.update({
            where: { id: payment.subscriptionId },
            data: { status: 'CANCELED' },
          });
        }

        // Reverte campanha (TOKEN_RESERVATION) se existir
        if (payment.campaignId) {
          await tx.campaign.update({
            where: { id: payment.campaignId },
            data: {
              reservationFeePaid: false,
              status: 'DRAFT',
            },
          });
        }

        // Estorna saldo da wallet se pagamento foi via WALLET
        if (payment.method === PrismaPaymentMethod.WALLET) {
          const wallet = await tx.wallet.findUnique({
            where: { userId: payment.userId },
          });

          if (wallet) {
            // Devolve o valor
            await tx.wallet.update({
              where: { id: wallet.id },
              data: {
                balance: Number(wallet.balance) + Number(payment.amount),
              },
            });

            // Registra transação de estorno
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: PrismaWalletType.WITHDRAWAL as WalletType,
                amount: Number(payment.amount),
                description: `Estorno de cancelamento: ${payment.purpose}`,
                relatedPaymentId: payment.id,
                relatedInvestId: payment.investmentId,
              },
            });
          }
        }

        return true;
      });

      if (!canceled) {
        return ResponseDto.error(
          'A transação deixou de estar PENDING antes do cancelamento',
          409,
        );
      }

      await this.couponSettlementService.reconcilePayment(payment.id);

      return ResponseDto.success('Transação cancelada com sucesso', 200, {
        id: payment.id,
        status: 'CANCELED',
      });
    } catch (error) {
      return ResponseDto.error('Erro ao cancelar transação', 500, error);
    }
  }

  private async createSubscriptionPayment(
    data: CreateTransactionDto,
    user: PayloadEntity,
  ) {
    if (!data.planId) {
      return ResponseDto.error('planId é obrigatório para SUBSCRIPTION', 400);
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: data.planId },
    });
    if (!plan) {
      return ResponseDto.error('Plano não encontrado', 404);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'PENDING',
      },
    });

    return this.createPayment({
      userId: user.id,
      amount: Number(plan.preco),
      method: data.method as PaymentMethod,
      purpose: data.purpose as PaymentPurpose,
      subscriptionId: subscription.id,
      campaignId: null,
      investmentId: null,
      serviceDetails: null,
    });
  }

  private async createInvestmentPayment(
    data: CreateTransactionDto,
    user: PayloadEntity,
  ) {
    if (!data.campaignId) {
      return ResponseDto.error('campaignId é obrigatório para INVESTMENT', 400);
    }

    if (!data.tokensQty) {
      return ResponseDto.error('tokensQty é obrigatório para INVESTMENT', 400);
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: data.campaignId },
      include: { startup: true },
    });

    if (!campaign) {
      return ResponseDto.error('Campanha não encontrada', 404);
    }

    if (campaign.status !== 'OPEN') {
      return ResponseDto.error(
        'Campanha não está aberta para investimento',
        400,
      );
    }

    if (campaign.tokensSold + data.tokensQty > campaign.totalTokens) {
      return ResponseDto.error('Quantidade de tokens indisponível', 400);
    }

    const amount = Number(campaign.tokenPrice) * data.tokensQty;

    const investment = await this.prisma.investment.create({
      data: {
        userId: user.id,
        campaignId: campaign.id,
        amount,
        tokensQty: data.tokensQty,
        status: 'PENDING',
      },
    });

    return this.createPayment({
      userId: user.id,
      amount,
      method: data.method as PaymentMethod,
      purpose: data.purpose as PaymentPurpose,
      subscriptionId: null,
      campaignId: campaign.id,
      investmentId: investment.id,
      serviceDetails: null,
    });
  }

  private async createReservationPayment(
    data: CreateTransactionDto,
    user: PayloadEntity,
  ) {
    if (!data.campaignId) {
      return ResponseDto.error(
        'campaignId é obrigatório para TOKEN_RESERVATION',
        400,
      );
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: data.campaignId },
      include: { startup: true },
    });

    if (!campaign) {
      return ResponseDto.error('Campanha não encontrada', 404);
    }

    if (campaign.startup.founderId !== user.id) {
      return ResponseDto.error(
        'Apenas o fundador pode pagar a taxa de reserva',
        403,
      );
    }

    if (campaign.reservationFeePaid) {
      return ResponseDto.error('Taxa de reserva já foi paga', 400);
    }

    const amount = Number(campaign.targetAmount) * 0.05;

    return this.createPayment({
      userId: user.id,
      amount,
      method: data.method as PaymentMethod,
      purpose: data.purpose as PaymentPurpose,
      subscriptionId: null,
      campaignId: campaign.id,
      investmentId: null,
      serviceDetails: null,
    });
  }

  private async createEarlyAccessPayment(
    data: CreateTransactionDto,
    user: PayloadEntity,
  ) {
    const serviceDetails = data.serviceDetails || { product: 'EARLY_ACCESS' };
    const amount = 5000;

    return this.createPayment({
      userId: user.id,
      amount,
      method: data.method as PaymentMethod,
      purpose: data.purpose as PaymentPurpose,
      subscriptionId: null,
      campaignId: null,
      investmentId: null,
      serviceDetails,
    });
  }

  private async createPayment(payload: {
    userId: number;
    amount: number;
    method: PaymentMethod;
    purpose: PaymentPurpose;
    subscriptionId: number | null;
    campaignId: number | null;
    investmentId: number | null;
    serviceDetails: Record<string, any> | null;
  }) {
    if (payload.method === PrismaPaymentMethod.WALLET) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: payload.userId },
      });

      if (!wallet) {
        return ResponseDto.error('Carteira não encontrada', 404);
      }

      if (Number(wallet.balance) < payload.amount) {
        return ResponseDto.error('Saldo insuficiente', 400);
      }

      const payment = await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: Number(wallet.balance) - payload.amount,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: this.mapWalletType(payload.purpose),
            amount: payload.amount,
            description: `Pagamento via Wallet: ${payload.purpose}`,
            relatedPaymentId: null,
            relatedInvestId: payload.investmentId,
          },
        });

        return tx.payment.create({
          data: {
            userId: payload.userId,
            amount: payload.amount,
            method: payload.method,
            purpose: payload.purpose,
            status: 'PAID',
            paidAt: new Date(),
            subscriptionId: payload.subscriptionId ?? undefined,
            investmentId: payload.investmentId ?? undefined,
            campaignId: payload.campaignId ?? undefined,
            serviceDetails: payload.serviceDetails ?? undefined,
          },
        });
      });

      // O pipeline centralizado liquida o cupom e aplica os efeitos de domínio
      // uma única vez, preenchendo effectsAppliedAt.
      await this.paymentService.processPaymentEffects(payment.id);

      return ResponseDto.success('Transação criada com sucesso', 201, payment);
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId: payload.userId,
        amount: payload.amount,
        method: payload.method,
        purpose: payload.purpose,
        status: 'PENDING',
        // O txid só existe depois que a cobrança PIX é emitida. Manter o
        // Payment PENDING sem txid permite aplicar cupom antes da emissão.
        txid: null,
        subscriptionId: payload.subscriptionId ?? undefined,
        investmentId: payload.investmentId ?? undefined,
        campaignId: payload.campaignId ?? undefined,
        serviceDetails: payload.serviceDetails ?? undefined,
      },
    });

    return ResponseDto.success('Transação criada com sucesso', 201, payment);
  }

  private mapWalletType(purpose: PaymentPurpose): WalletType {
    switch (purpose) {
      case PrismaPaymentPurpose.SUBSCRIPTION:
        return PrismaWalletType.SUBSCRIPTION as WalletType;
      case PrismaPaymentPurpose.INVESTMENT:
      case PrismaPaymentPurpose.TOKEN_RESERVATION:
        return PrismaWalletType.INVESTMENT as WalletType;
      case PrismaPaymentPurpose.P2P_BUY:
        return PrismaWalletType.P2P_PURCHASE as WalletType;
      case PrismaPaymentPurpose.EARLY_ACCESS:
        return PrismaWalletType.WITHDRAWAL as WalletType;
      default:
        return PrismaWalletType.WITHDRAWAL as WalletType;
    }
  }

  private async findRecentPending(data: CreateTransactionDto, userId: number) {
    const createdAt = new Date();
    createdAt.setMinutes(createdAt.getMinutes() - 5);

    const where: any = {
      userId,
      purpose: data.purpose as PaymentPurpose,
      status: 'PENDING',
      createdAt: {
        gte: createdAt,
      },
    };

    if (data.purpose === PrismaPaymentPurpose.SUBSCRIPTION && data.planId) {
      where.subscription = { planId: data.planId };
    }

    if (
      (data.purpose === PrismaPaymentPurpose.INVESTMENT ||
        data.purpose === PrismaPaymentPurpose.TOKEN_RESERVATION) &&
      data.campaignId
    ) {
      where.campaignId = data.campaignId;
    }

    if (data.purpose === PrismaPaymentPurpose.EARLY_ACCESS) {
      where.serviceDetails = { path: ['product'], equals: 'EARLY_ACCESS' };
    }

    return this.prisma.payment.findFirst({ where });
  }

  /**
   * @name exportCSV
   * @description Exporta transações do usuário em formato CSV.
   *
   * @param query Filtros (type, status, startDate, endDate)
   * @param user Usuário autenticado
   * @param res Response para stream do CSV
   */
  async exportCSV(
    query: {
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    user: PayloadEntity,
    res: any,
  ) {
    try {
      const where: any = { userId: user.id };

      if (query.status) {
        where.status = query.status;
      }

      if (query.type) {
        where.purpose = query.type;
      }

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = new Date(query.startDate);
        if (query.endDate) where.createdAt.lte = new Date(query.endDate);
      }

      const transactions = await this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 1000,
        include: {
          investment: true,
          subscription: true,
        },
      });

      // CSV Headers
      const headers = [
        'ID',
        'Data',
        'Tipo',
        'Método',
        'Status',
        'Valor (R$)',
        'Investimento ID',
        'Assinatura ID',
        'TXID',
        'Criado em',
        'Atualizado em',
      ];

      const rows = transactions.map((t) => [
        t.id,
        t.paidAt ? new Date(t.paidAt).toLocaleDateString('pt-BR') : '-',
        t.purpose || '-',
        t.method || '-',
        t.status,
        (Number(t.amount) / 100).toFixed(2),
        t.investmentId || '-',
        t.subscriptionId || '-',
        t.txid || '-',
        new Date(t.createdAt).toLocaleString('pt-BR'),
        new Date(t.updatedAt).toLocaleString('pt-BR'),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=transacoes.csv',
      );
      res.send('\ufeff' + csvContent); // BOM for Excel
    } catch (error) {
      res
        .status(500)
        .json({ error: true, message: 'Erro ao exportar CSV', codigo: 500 });
    }
  }

  /**
   * @name exportPDF
   * @description Exporta transações do usuário em formato HTML tabular (PDF-ready).
   *
   * @param query Filtros (type, status, startDate, endDate)
   * @param user Usuário autenticado
   * @param res Response para stream do HTML
   */
  async exportPDF(
    query: {
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    user: PayloadEntity,
    res: any,
  ) {
    try {
      const where: any = { userId: user.id };

      if (query.status) {
        where.status = query.status;
      }

      if (query.type) {
        where.purpose = query.type;
      }

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = new Date(query.startDate);
        if (query.endDate) where.createdAt.lte = new Date(query.endDate);
      }

      const transactions = await this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit for PDF
        include: {
          investment: true,
          subscription: true,
        },
      });

      const rows = transactions
        .map(
          (t) => `
        <tr>
          <td>${t.id}</td>
          <td>${t.paidAt ? new Date(t.paidAt).toLocaleDateString('pt-BR') : '-'}</td>
          <td>${t.purpose || '-'}</td>
          <td>${t.method || '-'}</td>
          <td>${t.status}</td>
          <td>R$ ${(Number(t.amount) / 100).toFixed(2)}</td>
        </tr>`,
        )
        .join('');

      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Transações - iSelfToken</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #d500f9; font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ddd; }
    td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
    tr:hover { background: #fafafa; }
    .footer { margin-top: 32px; font-size: 11px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <h1>iSelfToken - Extrato de Transações</h1>
  <p class="subtitle">Gerado em ${new Date().toLocaleString('pt-BR')} | ${transactions.length} transações</p>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Data Pagamento</th>
        <th>Tipo</th>
        <th>Método</th>
        <th>Status</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p class="footer">iSelfToken &copy; ${new Date().getFullYear()} - Plataforma de Equity Crowdfunding</p>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=transacoes.html',
      );
      res.send(html);
    } catch (error) {
      res
        .status(500)
        .json({ error: true, message: 'Erro ao exportar PDF', codigo: 500 });
    }
  }
}
