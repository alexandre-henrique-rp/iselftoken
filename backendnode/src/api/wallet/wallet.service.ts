import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { DepositDto, WithdrawDto } from './dto/wallet.dto';
import {
  WalletAssetDto,
  WalletAssetTokenDto,
  WalletAssetsResponseDto,
} from './dto/wallet-assets.dto';
import * as crypto from 'crypto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /wallet/assets - Lista os ativos de tokens do investidor.
   *
   * Cada ativo é agrupado por (startupId, campaignId, investmentId) e contém a
   * lista de Token IDs emitidos para aquele aporte (1 Token = 1 registro com
   * hash SHA-256 único). Apenas investimentos CONFIRMED aparecem.
   *
   * Diferente de `findMyInvestedStartups` (InvestmentsService): este método
   * é otimizado para a Wallet do investidor — retorna os **token IDs reais**
   * (cada um com `id`, `shortCode`, `purchaseVal`, `currentVal`), enquanto
   * aquele retorna apenas o agregado `tokensQty`.
   */
  async getAssets(userId: number) {
    try {
      const investments = await this.prisma.investment.findMany({
        where: { userId, status: 'CONFIRMED' },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              status: true,
              startup: {
                select: {
                  id: true,
                  nome: true,
                  slug: true,
                  area_atuacao: true,
                  logo: { select: { url_sm: true, url: true } },
                },
              },
            },
          },
          tokens: {
            select: {
              id: true,
              hash: true,
              quantity: true,
              purchaseVal: true,
              currentVal: true,
              dtAquisicao: true,
              investmentId: true,
            },
            orderBy: { dtAquisicao: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const assets: WalletAssetDto[] = investments.map((i) => {
        const tokens: WalletAssetTokenDto[] = i.tokens.map((t) => ({
          id: t.id,
          shortCode: t.hash.slice(-8),
          quantity: t.quantity,
          purchaseVal: Number(t.purchaseVal),
          currentVal:
            t.currentVal != null ? Number(t.currentVal) : Number(t.purchaseVal),
          acquiredAt: t.dtAquisicao,
          investmentId: t.investmentId ?? i.id,
        }));

        const currentValue = tokens.reduce(
          (sum, t) => sum + t.currentVal * t.quantity,
          0,
        );
        const investedAmount = Number(i.amount);
        const totalCharged =
          i.platformFeeAmount != null
            ? investedAmount + Number(i.platformFeeAmount)
            : investedAmount;

        return {
          investmentId: i.id,
          startupId: i.campaign.startup.id,
          startupName: i.campaign.startup.nome,
          startupSlug: i.campaign.startup.slug,
          startupLogoUrl:
            i.campaign.startup.logo?.url_sm ?? i.campaign.startup.logo?.url ?? null,
          startupCategory: i.campaign.startup.area_atuacao ?? null,
          campaignTitle: i.campaign.title,
          campaignStatus: i.campaign.status,
          tokensCount: tokens.reduce((sum, t) => sum + t.quantity, 0),
          tokens,
          investedAmount,
          platformFeeAmount:
            i.platformFeeAmount != null ? Number(i.platformFeeAmount) : null,
          totalCharged,
          currentValue,
          investmentStatus: i.status,
          acquiredAt: i.tokens[0]?.dtAquisicao ?? i.createdAt,
        };
      });

      const startupsCount = new Set(assets.map((a) => a.startupId)).size;
      const tokensCount = assets.reduce((sum, a) => sum + a.tokensCount, 0);
      const totalInvested = assets.reduce(
        (sum, a) => sum + a.investedAmount,
        0,
      );
      const totalCurrent = assets.reduce((sum, a) => sum + a.currentValue, 0);
      const averageRoi =
        totalInvested > 0
          ? Math.round(((totalCurrent - totalInvested) / totalInvested) * 10000) / 100
          : 0;

      const payload: WalletAssetsResponseDto = {
        assets,
        startupsCount,
        tokensCount,
        averageRoi,
      };

      return ResponseDto.success(
        'Ativos da wallet retornados com sucesso',
        200,
        payload,
      );
    } catch (error) {
      this.logger.error('Erro ao buscar ativos da wallet', error);
      return ResponseDto.error('Erro ao buscar ativos da wallet', 500, error);
    }
  }

  /**
   * GET /wallet - Retorna saldo, bloqueado e moeda da carteira do usuário.
   */
  async getWallet(userId: number) {
    try {
      let wallet = await this.prisma.wallet.findUnique({
        where: { userId },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      });

      // Cria carteira se não existir
      if (!wallet) {
        wallet = await this.prisma.wallet.create({
          data: {
            userId,
            balance: 0,
            blocked: 0,
            currency: 'BRL',
          },
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        });
      }

      return ResponseDto.success('Carteira retornada com sucesso', 200, {
        id: wallet.id,
        balance: Number(wallet.balance),
        blocked: Number(wallet.blocked),
        currency: wallet.currency,
        transactions: wallet.transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          description: t.description,
          createdAt: t.createdAt,
        })),
      });
    } catch (error) {
      this.logger.error('Erro ao buscar carteira', error);
      return ResponseDto.error('Erro ao buscar carteira', 500, error);
    }
  }

  /**
   * POST /wallet/deposit - Gera PIX para depósito na carteira.
   *
   * P2.13 — também cria um `WalletTransaction` (type=DEPOSIT, status PENDING)
   * para que o ledger tenha rastreabilidade mesmo antes da confirmação do
   * webhook. Quando o PIX confirma (em `processPaymentEffects`), o balance
   * é creditado e o WalletTransaction permanece como histórico.
   */
  async deposit(userId: number, depositDto: DepositDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { nome: true, email: true },
      });

      if (!user) {
        throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
      }

      // Garante que a carteira existe (idempotente).
      const wallet = await this.prisma.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balance: 0, blocked: 0, currency: 'BRL' },
      });

      // Gera TXID único para o depósito
      const txid = `DEP${crypto.randomBytes(10).toString('hex').toUpperCase().slice(0, 21)}`;

      // Cria pagamento de depósito
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          amount: depositDto.amount,
          method: 'PIX',
          purpose: 'INVESTMENT',
          status: 'PENDING',
          txid,
        },
      });

      // P2.13 — cria WalletTransaction com referência ao payment para
      // rastreabilidade. O balance só é creditado na confirmação do PIX
      // (no consumer de webhook / processPaymentEffects).
      await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: depositDto.amount,
          description: `Depósito PIX #${payment.id} (txid ${txid})`,
          relatedPaymentId: payment.id,
        },
      });

      // Gera payload PIX
      const pixPayload = this.buildPixPayload(
        txid,
        depositDto.amount,
        user.nome,
        'SAO PAULO',
      );

      // Atualiza pagamento com dados PIX
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          qrCodeBase64: Buffer.from(pixPayload).toString('base64'),
          copyPastePix: pixPayload,
        },
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      return ResponseDto.success('PIX de depósito gerado com sucesso', 201, {
        paymentId: payment.id,
        txid,
        qrCodeBase64: payment.qrCodeBase64,
        copyPastePix: payment.copyPastePix,
        amount: depositDto.amount,
        expiresAt,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Erro ao gerar depósito', error);
      return ResponseDto.error('Erro ao gerar depósito', 500, error);
    }
  }

  /**
   * POST /wallet/withdraw - Solicita saque para conta bancária.
   */
  async withdraw(userId: number, withdrawDto: WithdrawDto) {
    try {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new HttpException(
          'Carteira não encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      if (Number(wallet.balance) < withdrawDto.amount) {
        throw new HttpException(
          `Saldo insuficiente. Disponível: R$ ${Number(wallet.balance).toFixed(2)}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Cria transação de saque (pendente)
      const transaction = await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount: withdrawDto.amount,
          description: `Saque para ${withdrawDto.banco} Ag:${withdrawDto.agencia} Cc:${withdrawDto.conta}`,
        },
      });

      // Bloqueia o valor
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: withdrawDto.amount },
          blocked: { increment: withdrawDto.amount },
        },
      });

      return ResponseDto.success(
        'Saque solicitado com sucesso. Status: pending',
        201,
        {
          transactionId: transaction.id,
          amount: withdrawDto.amount,
          status: 'pending',
          bankInfo: {
            banco: withdrawDto.banco,
            agencia: withdrawDto.agencia,
            conta: withdrawDto.conta,
            tipoConta: withdrawDto.tipoConta,
            titular: withdrawDto.titular,
          },
        },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Erro ao solicitar saque', error);
      return ResponseDto.error('Erro ao solicitar saque', 500, error);
    }
  }

  /**
   * Processa aprovação de saque (interno).
   */
  async approveWithdraw(transactionId: number, adminId: number) {
    try {
      const transaction = await this.prisma.walletTransaction.findUnique({
        where: { id: transactionId },
        include: { wallet: true },
      });

      if (!transaction) {
        throw new HttpException(
          'Transação não encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      // Desbloqueia o valor (já foi debitado do balance)
      await this.prisma.wallet.update({
        where: { id: transaction.walletId },
        data: {
          blocked: { decrement: Number(transaction.amount) },
        },
      });

      return ResponseDto.success('Saque aprovado', 200, {
        transactionId,
        status: 'approved',
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Erro ao aprovar saque', error);
      return ResponseDto.error('Erro ao aprovar saque', 500, error);
    }
  }

  /**
   * Processa rejeição de saque (interno).
   */
  async rejectWithdraw(transactionId: number) {
    try {
      const transaction = await this.prisma.walletTransaction.findUnique({
        where: { id: transactionId },
        include: { wallet: true },
      });

      if (!transaction) {
        throw new HttpException(
          'Transação não encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      // Reverte: devolve ao balance e remove do blocked
      await this.prisma.wallet.update({
        where: { id: transaction.walletId },
        data: {
          balance: { increment: Number(transaction.amount) },
          blocked: { decrement: Number(transaction.amount) },
        },
      });

      return ResponseDto.success('Saque rejeitado, valor estornado', 200, {
        transactionId,
        status: 'rejected',
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Erro ao rejeitar saque', error);
      return ResponseDto.error('Erro ao rejeitar saque', 500, error);
    }
  }

  /**
   * Constrói payload EMV para QR Code PIX.
   */
  private buildPixPayload(
    txid: string,
    amount: number,
    merchantName: string,
    merchantCity: string,
  ): string {
    const formatField = (id: string, value: string): string => {
      const len = value.length.toString().padStart(2, '0');
      return `${id}${len}${value}`;
    };

    const payloadId = formatField('00', '01');
    const gui = formatField('00', 'br.gov.bcb.pix');
    const key = formatField('01', txid);
    const merchantAccount = formatField('26', `${gui}${key}`);
    const mcc = formatField('52', '0000');
    const currency = formatField('53', '986');
    const txAmount = formatField('54', amount.toFixed(2));
    const country = formatField('58', 'BR');
    const name = formatField('59', merchantName.slice(0, 25));
    const city = formatField('60', merchantCity.slice(0, 15));
    const txidField = formatField('05', txid);
    const additionalData = formatField('62', txidField);

    const payload = `${payloadId}${merchantAccount}${mcc}${currency}${txAmount}${country}${name}${city}${additionalData}6304`;
    const crc = this.crc16ccitt(payload);
    return `${payload}${crc}`;
  }

  private crc16ccitt(str: string): string {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      }
    }
    return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  }
}
