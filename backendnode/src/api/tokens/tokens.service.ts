import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Emite tokens para um investimento confirmado.
   * Cria registros Token com hash único, quantity, purchaseVal, currentVal.
   */
  async emitTokensForInvestment(investmentId: number) {
    try {
      const investment = await this.prisma.investment.findUnique({
        where: { id: investmentId },
        include: {
          campaign: true,
          user: true,
        },
      });

      if (!investment) {
        return ResponseDto.error('Investimento não encontrado', 404);
      }

      if (investment.status !== 'CONFIRMED') {
        return ResponseDto.error(
          `Investimento está com status ${investment.status}. Apenas CONFIRMED emite tokens.`,
          400,
        );
      }

      // Verifica se já existem tokens emitidos
      const existingTokens = await this.prisma.token.count({
        where: { userId: investment.userId, campaignId: investment.campaignId },
      });

      if (existingTokens > 0) {
        return ResponseDto.error(
          'Tokens já emitidos para este investimento',
          400,
        );
      }

      const tokens: Array<{
        id: string;
        hash: string;
        quantity: number;
        purchaseVal: number;
        currentVal: number;
      }> = [];
      // purchaseVal = preco de VENDA (o que o investidor pagou por token).
      // Prefere o snapshot do proprio investment; fallback para o da campanha
      // (legado: campaign.tokenPrice). O repasse a startup e calculado
      // separadamente a partir de Investment.startupRepasseAmount.
      const tokenPrice = Number(
        investment.tokenSellPrice ??
          investment.campaign.tokenSellPrice ??
          investment.campaign.tokenPrice,
      );
      const quantity = investment.tokensQty;

      for (let i = 0; i < quantity; i++) {
        // Gera hash único para cada token
        const hash = crypto
          .createHash('sha256')
          .update(
            `${investment.userId}-${investment.campaignId}-${i}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`,
          )
          .digest('hex');

        const token = await this.prisma.token.create({
          data: {
            hash,
            userId: investment.userId,
            startupId: investment.campaign.startupId,
            campaignId: investment.campaignId,
            quantity: 1,
            purchaseVal: tokenPrice,
            currentVal: tokenPrice, // Inicialmente igual ao purchaseVal
          },
        });

        tokens.push({
          id: token.id,
          hash: token.hash,
          quantity: token.quantity,
          purchaseVal: Number(token.purchaseVal),
          currentVal: Number(token.currentVal),
        });
      }

      this.logger.log(
        `${quantity} tokens emitidos para investimento ${investmentId}`,
      );

      return ResponseDto.success(
        `${quantity} tokens emitidos com sucesso`,
        201,
        {
          investmentId,
          tokensCount: tokens.length,
          tokens,
        },
      );
    } catch (error) {
      this.logger.error('Erro ao emitir tokens', error);
      return ResponseDto.error('Erro ao emitir tokens', 500, error);
    }
  }

  /**
   * Busca tokens de um usuário.
   *
   * Inclui `investmentId` (vínculo com o Investment que originou cada token)
   * e `shortCode` (últimos 8 chars do hash) para exibição amigável na Wallet
   * sem expor o hash completo.
   */
  async getUserTokens(userId: number) {
    try {
      const tokens = await this.prisma.token.findMany({
        where: { userId },
        include: {
          campaign: {
            select: {
              title: true,
              status: true,
            },
          },
          startup: {
            select: {
              nome: true,
              slug: true,
            },
          },
        },
        orderBy: { dtAquisicao: 'desc' },
      });

      return ResponseDto.success('Tokens retornados com sucesso', 200, {
        total: tokens.length,
        tokens: tokens.map((t) => ({
          id: t.id,
          hash: t.hash,
          shortCode: t.hash.slice(-8),
          investmentId: t.investmentId ?? null,
          quantity: t.quantity,
          purchaseVal: Number(t.purchaseVal),
          currentVal: Number(t.currentVal),
          campaign: t.campaign.title,
          campaignStatus: t.campaign.status,
          startup: t.startup.nome,
          startupSlug: t.startup.slug,
          acquiredAt: t.dtAquisicao,
        })),
      });
    } catch (error) {
      this.logger.error('Erro ao buscar tokens', error);
      return ResponseDto.error('Erro ao buscar tokens', 500, error);
    }
  }

  /**
   * Busca um token pertencente ao usuário autenticado.
   *
   * O filtro de ownership é aplicado na própria consulta para que tokens de
   * outras contas sejam indistinguíveis de IDs inexistentes para este fluxo.
   */
  async getTokenById(tokenId: string, userId: number) {
    try {
      const token = await this.prisma.token.findFirst({
        where: { id: tokenId, userId },
        include: {
          campaign: {
            select: {
              title: true,
              status: true,
              tokenPrice: true,
            },
          },
          startup: {
            select: {
              nome: true,
              slug: true,
              area_atuacao: true,
            },
          },
          history: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!token) {
        return ResponseDto.error('Token não encontrado', 404);
      }

      return ResponseDto.success('Token encontrado', 200, {
        id: token.id,
        hash: token.hash,
        certificate: token.certificate,
        quantity: token.quantity,
        purchaseVal: Number(token.purchaseVal),
        currentVal: Number(token.currentVal),
        campaign: token.campaign.title,
        startup: token.startup.nome,
        acquiredAt: token.dtAquisicao,
        history: token.history,
      });
    } catch (error) {
      this.logger.error('Erro ao buscar token', error);
      return ResponseDto.error('Erro ao buscar token', 500, error);
    }
  }

  /**
   * Gera URL presigned do certificado PDF do token (dono ou ADMIN).
   */
  async getCertificateUrl(
    tokenId: string,
    userId: number,
    userRole: string,
  ): Promise<ResponseDto> {
    try {
      const token = await this.prisma.token.findUnique({
        where: { id: tokenId },
      });
      if (!token) {
        throw new NotFoundException('Token não encontrado');
      }
      if (token.userId !== userId && userRole !== 'ADMIN') {
        throw new ForbiddenException('Você não é o dono deste token');
      }

      const key = token.certificate ?? `certificates/${tokenId}.pdf`;
      const url = await this.s3Service.getUrl('document', key, 3600);
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      return ResponseDto.success('URL do certificado', 200, { url, expiresAt });
    } catch (error) {
      this.logger.error('Erro ao gerar URL do certificado', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      return ResponseDto.error('Erro ao gerar URL do certificado', 500, error);
    }
  }

  /**
   * Verifica autenticidade de token via hash (público).
   */
  async verifyByHash(hash: string): Promise<ResponseDto> {
    try {
      const token = await this.prisma.token.findFirst({ where: { hash } });
      if (!token) {
        return ResponseDto.success('Token não encontrado', 404, {
          valid: false,
        });
      }
      return ResponseDto.success('Token válido', 200, {
        valid: true,
        token: { id: String(token.id), userId: token.userId },
      });
    } catch (error) {
      this.logger.error('Erro ao verificar token por hash', error);
      return ResponseDto.error('Erro ao verificar token', 500, error);
    }
  }
}
