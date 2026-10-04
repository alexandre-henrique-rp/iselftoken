import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignResourceAllocation, ResourceCategory } from '@prisma/client';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResourceAllocationDto } from '../dto/resource-allocation.dto';

/**
 * Service para gerenciamento de alocacoes de recursos por categoria de uma Campaign.
 *
 * Historico: Decisao D8 (M7-S21) — migrou uso_recursos JSON legado para modelagem
 * relacional com CampaignResourceAllocation, permitindo agregacao e validacao de soma=100.
 *
 * @see ADR-007
 */
const PUBLIC_CAMPAIGN_STATUSES = ['OPEN', 'FUNDED', 'PAID_OUT'] as const;
const RESOURCE_READ_ADMIN_ROLES = ['ADMIN', 'FINANCEIRO', 'COMPLIANCE'];

/**
 * Limite máximo de alocação para a categoria `FUNDADOR`.
 *
 * Regra de negócio (CASE.md [Captação] — Alocação de Recursos): o percentual
 * destinado ao fundador (pró-labore, salário, distribuição do time fundador)
 * não pode ultrapassar 20% do total captado. Garante que a maior parte dos
 * recursos seja investida no crescimento do negócio (desenvolvimento,
 * comercial, marketing, infraestrutura, jurídico, reserva) — protege o
 * investidor de captações em que o founder se apropriaria de mais de 1/5
 * do montante sem entrega de produto/resultado.
 *
 * Aplicado em `replaceAll()` (fail-fast) — qualquer alocação com categoria
 * FUNDADOR e percentual > 20% é rejeitada com HTTP 400 antes de tocar o banco.
 */
export const MAX_FUNDADOR_PERCENTUAL = 20;

type CampaignResourceResponse = Pick<
  CampaignResourceAllocation,
  'categoria' | 'percentual' | 'descricaoCustomizada'
>;

@Injectable()
export class CampaignResourceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista alocacoes apenas de campanhas publicadas, sem expor metadados internos.
   *
   * @param campaignId - ID da campanha
   * @returns DTO publico ordenado por categoria
   * @throws NotFoundException quando a campanha não está publicada
   */
  async findByCampaign(
    campaignId: number,
  ): Promise<CampaignResourceResponse[]> {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        status: { in: [...PUBLIC_CAMPAIGN_STATUSES] },
      },
      select: { id: true },
    });

    if (!campaign) {
      throw new NotFoundException('CAMPAIGN_NOT_PUBLIC');
    }

    return this.findProjectedAllocations(campaignId);
  }

  /**
   * Lista alocacoes para o fundador da campanha ou para papeis administrativos.
   * Campanhas não publicadas nunca passam por esta leitura sem autenticação.
   */
  async findByCampaignForUser(
    campaignId: number,
    user: PayloadEntity,
  ): Promise<CampaignResourceResponse[]> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        startup: { select: { founderId: true, status: true } },
        payments: {
          where: { purpose: 'COMPLIANCE_FEE', status: 'PAID' },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    }

    const isOwner = campaign.startup.founderId === user.id;
    const isAdminRole = RESOURCE_READ_ADMIN_ROLES.includes(user.role);
    if (!isOwner && !isAdminRole) {
      throw new ForbiddenException('NOT_OWNER');
    }

    return this.findProjectedAllocations(campaignId);
  }

  private findProjectedAllocations(
    campaignId: number,
  ): Promise<CampaignResourceResponse[]> {
    return this.prisma.campaignResourceAllocation.findMany({
      where: { campaignId },
      select: {
        categoria: true,
        percentual: true,
        descricaoCustomizada: true,
      },
      orderBy: { categoria: 'asc' },
    });
  }

  /**
   * Substitui TODAS as alocacoes de uma campanha (replaceAll atomico).
   *
   * Executa em transacao: DELETE de todas as alocacoes existentes + INSERT das novas.
   * Validacoes aplicadas ANTES da transacao (fail-fast):
   *   - Soma dos percentuais deve ser exatamente 100%
   *   - Categoria CUSTOMIZADO exige descricaoCustomizada
   *   - Sem categorias duplicadas no input (Map deduplication)
   *
   * @param campaignId - ID da campanha
   * @param allocations - Array de alocacoes a serem aplicadas
   * @param user - Usuário autenticado; somente founder da startup ou ADMIN
   * @returns Lista das alocacoes criadas
   * @throws NotFoundException se a campanha não existir
   * @throws ForbiddenException se o usuário não for owner nem ADMIN
   * @throws BadRequestException se soma != 100 ou se CUSTOMIZADO sem descricaoCustomizada
   */
  async replaceAll(
    campaignId: number,
    allocations: ResourceAllocationDto[],
    user: PayloadEntity,
  ): Promise<CampaignResourceAllocation[]> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        startup: { select: { founderId: true, status: true } },
        payments: {
          where: { purpose: 'COMPLIANCE_FEE', status: 'PAID' },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    }

    if (campaign.startup.founderId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('NOT_OWNER');
    }

    if (
      campaign.startup.status === 'APPROVED' &&
      (campaign.payments?.length ?? 0) > 0
    ) {
      throw new ForbiddenException({
        code: 'CAMPAIGN_LOCKED_AFTER_COMPLIANCE',
        message:
          'A destinação de recursos está bloqueada após o pagamento da Taxa de Compliance e a aprovação da startup.',
      });
    }

    if (campaign.status !== 'DRAFT') {
      throw new ForbiddenException({
        code: 'CAMPAIGN_NOT_EDITABLE',
        message:
          'Apenas campanhas em DRAFT podem alterar a destinação de recursos.',
      });
    }

    // Validar FUNDADOR <= 20% PRIMEIRO (CASE.md [Captação] — Alocação de
    // Recursos). Fail-fast mais útil para o founder: erro específico da
    // regra de negócio em vez do genérico "soma != 100" quando o problema
    // real é o cap do fundador.
    const fundadorAlloc = allocations.find((a) => a.categoria === 'FUNDADOR');
    if (fundadorAlloc && fundadorAlloc.percentual > MAX_FUNDADOR_PERCENTUAL) {
      throw new BadRequestException({
        code: 'FUNDADOR_PERCENTUAL_EXCEEDS_MAX',
        message:
          `A alocação para FUNDADOR não pode ultrapassar ${MAX_FUNDADOR_PERCENTUAL}% ` +
          `(atual: ${fundadorAlloc.percentual}%). Caso precise de mais, abra uma solicitação ao Compliance.`,
        maxAllowed: MAX_FUNDADOR_PERCENTUAL,
        provided: fundadorAlloc.percentual,
      });
    }

    // Validar soma = 100 (fail-fast)
    const soma = allocations.reduce((acc, a) => acc + a.percentual, 0);
    if (soma !== 100) {
      throw new BadRequestException(
        `A soma dos percentuais deve ser exatamente 100%. Atual: ${soma}%`,
      );
    }

    // Validar CUSTOMIZADO requer descricaoCustomizada (fail-fast)
    for (const a of allocations) {
      if (a.categoria === 'CUSTOMIZADO' && !a.descricaoCustomizada) {
        throw new BadRequestException(
          'Alocacao com categoria CUSTOMIZADO requer descricaoCustomizada.',
        );
      }
    }

    // Validar duplicatas de categoria no input (UX fail-fast)
    const categoriaMap = new Map<ResourceCategory, number>();
    for (let i = 0; i < allocations.length; i++) {
      const a = allocations[i];
      if (categoriaMap.has(a.categoria)) {
        throw new BadRequestException(
          `Categoria duplicada no input: ${a.categoria}. Cada categoria pode aparecer apenas uma vez.`,
        );
      }
      categoriaMap.set(a.categoria, i);
    }

    // Transacao atomica: delete + create
    return this.prisma.$transaction(async (tx) => {
      await tx.campaignResourceAllocation.deleteMany({ where: { campaignId } });

      const created = await Promise.all(
        allocations.map((a) =>
          tx.campaignResourceAllocation.create({
            data: {
              campaignId,
              categoria: a.categoria,
              percentual: a.percentual,
              descricaoCustomizada: a.descricaoCustomizada,
            },
          }),
        ),
      );

      return created;
    });
  }

  /**
   * Helper estatico para validacao de soma = 100.
   *
   * Metodo estatico para permitir validacao em contexto externos (ex: DTOs, guards).
   * Lanca BadRequestException se a soma dos percentuais for diferente de 100.
   *
   * @param allocations - Array de objetos contendo campo percentual
   * @throws BadRequestException se soma != 100
   *
   * @example
   * CampaignResourceService.validateSum100([{ percentual: 50 }, { percentual: 50 }]); // OK
   * CampaignResourceService.validateSum100([{ percentual: 50 }, { percentual: 30 }]); // LANCA
   */
  static validateSum100(allocations: Array<{ percentual: number }>): void {
    const soma = allocations.reduce((acc, a) => acc + a.percentual, 0);
    if (soma !== 100) {
      throw new BadRequestException(
        `A soma dos percentuais deve ser exatamente 100%. Atual: ${soma}%`,
      );
    }
  }
}
