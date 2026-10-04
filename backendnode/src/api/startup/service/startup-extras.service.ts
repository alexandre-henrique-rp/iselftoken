import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { StartupDocumentCategory } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';

const MAX_PITCH_LENGTH = 10_000;
// Teto técnico do backend propositalmente "frouxo" (25 MB) — a trava real
// fica no frontend (ex.: DocumentsSection com validateFile de 50 MB;
// new-startup-wizard impõe 15 MB para pitch deck). Esse limite so existe
// como defesa em profundidade contra abuso / uploads acidentais muito
// grandes; quotas FREE/PRO do QuotaService continuam aplicando via
// /uploads para a rota genérica. Regra de negócio: pitch deck = 15 MB
// (ver CASE.md §[Uploads] — divergência no fluxo PITCH_DECK).
const MAX_DOC_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * BUG-FT-006: limite canônico da justificativa do "Não se aplica". Espelha o
 * `maxLength={1000}` do `<textarea>` em `documents-section.tsx` (frontend).
 * Hard-cap no backend garante defense in depth contra bypasses do DOM (autofill,
 * extensões, requests diretos via BFF ou curl).
 */
export const JUSTIFICATIVA_NA_MAX_LENGTH = 1000;
const ACCEPTED_DOC_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);
/** Categorias aceitas no upload (todas do enum atual, pós-CVM Res. 88). */
const ALLOWED_CATEGORIES: ReadonlySet<StartupDocumentCategory> =
  new Set<StartupDocumentCategory>([
    'MIE',
    'CONTRATO_SOCIAL',
    'CNPJ',
    'BALANCO_ATUAL',
    'DECLARACAO_VERACIDADE',
    'ATA_ELEICAO',
    'BALANCO_ANTERIOR',
    'PROCURACAO',
    'CV_SOCIOS',
    'PITCH_DECK',
    'PROJECOES',
    'MODELO_CONTRATO_OFERTA',
    'COMPROVANTE_ENDERECO',
    'DECLARACAO_RECEITA',
    'TERMO_PLATAFORMA',
    'OUTRO',
  ]);

/**
 * Subset obrigatório pela CVM Res. 88/2022 pra ofertas de equity crowdfunding
 * (até R$ 15M/ano). A UI bloqueia "publicar oferta" enquanto este conjunto
 * não estiver completo (gate vive na camada de publicação, fora deste service).
 */
const REQUIRED_CATEGORIES: ReadonlyArray<StartupDocumentCategory> = [
  'MIE',
  'CONTRATO_SOCIAL',
  'CNPJ',
  'BALANCO_ATUAL',
  'DECLARACAO_VERACIDADE',
  'ATA_ELEICAO',
];

/**
 * Categorias NÃO-essenciais — as únicas que aceitam a marcação "Não se aplica"
 * (fluxo_startup §2). Documentos essenciais (REQUIRED_CATEGORIES) são
 * obrigatórios e não podem ser marcados como N/A.
 */
const NON_ESSENTIAL_CATEGORIES: ReadonlySet<StartupDocumentCategory> =
  new Set<StartupDocumentCategory>(
    [...ALLOWED_CATEGORIES].filter((c) => !REQUIRED_CATEGORIES.includes(c)),
  );

export interface ComplianceStatus {
  required: number;
  present: number;
  missing: StartupDocumentCategory[];
}

function computeCompliance(
  docs: { categoria: StartupDocumentCategory }[],
): ComplianceStatus {
  const presentCategories = new Set(docs.map((d) => d.categoria));
  const missing = REQUIRED_CATEGORIES.filter((c) => !presentCategories.has(c));
  return {
    required: REQUIRED_CATEGORIES.length,
    present: REQUIRED_CATEGORIES.length - missing.length,
    missing,
  };
}

export interface BankingUpdateInput {
  titular?: string | null;
  documentoTitular?: string | null;
  banco?: string | null;
  tipoConta?: 'corrente' | 'poupanca' | null;
  agencia?: string | null;
  conta?: string | null;
  digito?: string | null;
  chavePix?: string | null;
}

/**
 * Serviço dedicado às operações "extras" do edit-startup (Fase 3d/3e):
 * pitch (texto livre), dados bancários, e documentos uploadados pro
 * bucket `document` do AWS S3.
 *
 * Mantido separado do `StartupService` principal pra não inchar o
 * arquivo já volumoso. Compartilha o mesmo PrismaService.
 */
@Injectable()
export class StartupExtrasService {
  private readonly logger = new Logger(StartupExtrasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  /**
   * Garante que o user é o founder dono da Startup. Admins podem ser
   * adicionados ao bypass depois — por enquanto só o próprio.
   */
  private async assertOwnership(startupId: number, userId: number) {
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true, founderId: true },
    });
    if (!startup) throw new NotFoundException('Startup não encontrada');
    if (startup.founderId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar esta startup',
      );
    }
    return startup;
  }

  /**
   * Retorna os dados consolidados da Campanha ativa (DRAFT/OPEN) da startup
   * para a tela `/founder/startups/:id/captacao`.
   *
   * Importante: o endpoint público `GET /startup/:id` apaga o array `campaigns`
   * (startup-crud.service.findOne) para evitar vazar dados financeiros. Aqui
   * reusamos a mesma regra de ownership do `assertOwnership` mas devolvemos a
   * Campaign em edição com tudo que a UI precisa:
   *
   *   - financeiros (targetAmount, valuation, tokenPrice, totalTokens, deadline,
   *     reservationFeePaid, affiliateCommissionPct)
   *   - tese (problema, solucao, modeloReceita, diferencial, mercadoAlvo,
   *     sociosCount, dedicacao, compradores, investimentoPrevio, concorrencia)
   *   - lucros/benefícios (participacaoLucros, faturamentoMinimoLucros,
   *     beneficiosAdicionais, beneficiosDescricao)
   *   - CVM (oQueEsperaAlcancar, objetivoCaptacao)
   *   - payments relacionados (purpose=TOKEN_RESERVATION, p/ fast-track)
   *   - resources (CampaignResourceAllocation → soma 100%)
   *
   * Se a startup ainda não tem Campaign, retorna payload vazio no shape
   * esperado pelo loader (campaign=null) — a UI renderiza placeholders.
   */
  async getCaptacaoData(startupId: number, userId: number) {
    await this.assertOwnership(startupId, userId);

    const [campaign, phase3Decision] = await Promise.all([
      this.prisma.campaign.findFirst({
        where: {
          startupId,
          status: { in: ['DRAFT', 'OPEN', 'PAUSED'] },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          payments: {
            // S18.6 — inclui também FAST_TRACK_REVIEW para que o fundador veja
            // o status do serviço contratado + admin/compliance tenham o
            // breakdown completo na auditoria.
            // + COMPLIANCE_FEE/FAST_DEPLOY (Publicação Rápida) para o frontend
            // saber se já há taxa paga (gate do diálogo de Publicação Rápida).
            where: {
              purpose: {
                in: [
                  'TOKEN_RESERVATION',
                  'FAST_TRACK_REVIEW',
                  'COMPLIANCE_FEE',
                  'FAST_DEPLOY',
                ],
              },
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              amount: true,
              originalAmount: true,
              discountAmount: true,
              paidAmount: true,
              status: true,
              purpose: true,
              createdAt: true,
              paidAt: true,
            },
          },
          resources: {
            select: {
              id: true,
              categoria: true,
              percentual: true,
              descricaoCustomizada: true,
            },
            orderBy: { categoria: 'asc' },
          },
        },
      }),
      // Última decisão da Fase 3 (Detalhes de Captação) — usada pelo
      // banner de rejeição em `/founder/startups/:id/captacao`. Mesmo
      // critério do `enrichment.service.ts:phase3Rejected` (lista): se a
      // última decisão for REJECTED, exibimos a justificativa + data.
      // Falha aqui é defensiva (best-effort) — sem justificativa, o
      // banner simplesmente não aparece (campos null/false).
      this.prisma.startupReviewDecision
        .findFirst({
          where: { startupId, phase: 3 },
          orderBy: { createdAt: 'desc' },
          select: {
            decision: true,
            justification: true,
            createdAt: true,
          },
        })
        .catch(() => null),
    ]);

    if (!campaign) {
      return ResponseDto.success('Startup sem campanha ativa ainda', 200, {
        campaign: null,
        startupId,
      });
    }

    const phase3Rejected = phase3Decision?.decision === 'REJECTED';
    const phase3RejectedJustification = phase3Rejected
      ? (phase3Decision?.justification ?? null)
      : null;
    const phase3RejectedAt = phase3Rejected
      ? (phase3Decision?.createdAt?.toISOString?.() ?? null)
      : null;

    // Converte Decimal → number para o frontend (que usa <input type="number">).
    return ResponseDto.success('Dados de captação carregados', 200, {
      campaign: {
        id: campaign.id,
        startupId: campaign.startupId,
        title: campaign.title,
        status: campaign.status,
        targetAmount: Number(campaign.targetAmount),
        minInvestment: Number(campaign.minInvestment),
        valuation: Number(campaign.valuation),
        tokenPrice: Number(campaign.tokenPrice),
        totalTokens: campaign.totalTokens,
        tokensSold: campaign.tokensSold,
        deadline: campaign.deadline,
        reservationFeePaid: campaign.reservationFeePaid,
        // Gate do diálogo "Publicação Rápida" (frontend): o diálogo só aparece
        // quando NÃO há COMPLIANCE_FEE PAID. `fastDeploy` reflete se o serviço
        // já foi contratado/pago (campo da Campaign).
        complianceFeePaid: campaign.payments.some(
          (p) => p.purpose === 'COMPLIANCE_FEE' && p.status === 'PAID',
        ),
        fastDeploy: campaign.fastDeploy,
        affiliateCommissionPct:
          campaign.affiliateCommissionPct != null
            ? Number(campaign.affiliateCommissionPct)
            : null,
        // S18.6 — expõe todos os Payments da campanha (TOKEN_RESERVATION +
        // FAST_TRACK_REVIEW) com breakdown financeiro para o fundador ver
        // o que pagou, e admin/compliance auditar.
        payments: campaign.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          originalAmount: p.originalAmount ? Number(p.originalAmount) : null,
          discountAmount: p.discountAmount ? Number(p.discountAmount) : null,
          paidAmount: p.paidAmount ? Number(p.paidAmount) : null,
          status: p.status,
          purpose: p.purpose,
          createdAt: p.createdAt,
          paidAt: p.paidAt,
        })),
        resources: campaign.resources,
        // Tese
        problema: campaign.problema,
        solucao: campaign.solucao,
        modeloReceita: campaign.modeloReceita,
        diferencial: campaign.diferencial,
        mercadoAlvo: campaign.mercadoAlvo,
        sociosCount: campaign.sociosCount,
        dedicacao: campaign.dedicacao,
        compradores: campaign.compradores,
        investimentoPrevio: campaign.investimentoPrevio,
        concorrencia: campaign.concorrencia,
        // Lucros & benefícios
        participacaoLucros: campaign.participacaoLucros,
        faturamentoMinimoLucros:
          campaign.faturamentoMinimoLucros != null
            ? Number(campaign.faturamentoMinimoLucros)
            : null,
        politicaLucros: campaign.politicaLucros,
        beneficiosAdicionais: campaign.beneficiosAdicionais,
        beneficiosDescricao: campaign.beneficiosDescricao,
        // CVM
        oQueEsperaAlcancar: campaign.oQueEsperaAlcancar,
        objetivoCaptacao: campaign.objetivoCaptacao,
        // S35 — última decisão da Fase 3 (Detalhes de Captação).
        // Quando `phase3Rejected=true`, o frontend renderiza banner
        // rosa em `/founder/startups/:id/captacao` com a justificativa
        // e CTA de ressubmissão (espelha o banner de rejeição do
        // `/edit` para fases 1/2). NUNCA enviar `rejectedSnapshot`
        // (dados internos de auditoria, exclusivos do admin).
        phase3Rejected,
        phase3RejectedJustification,
        phase3RejectedAt,
      },
    });
  }

  async updatePitch(startupId: number, userId: number, pitch: string) {
    await this.assertOwnership(startupId, userId);
    const cleaned = (pitch ?? '').trim();
    if (cleaned.length > MAX_PITCH_LENGTH) {
      throw new HttpException(
        `Pitch excede ${MAX_PITCH_LENGTH} caracteres`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.startup.update({
      where: { id: startupId },
      data: { descritivo_basico: cleaned || null },
      select: { id: true, descritivo_basico: true },
    });
    return ResponseDto.success('Pitch atualizado', 200, {
      id: updated.id,
      pitch: updated.descritivo_basico,
    });
  }

  async updateBanking(
    startupId: number,
    userId: number,
    input: BankingUpdateInput,
  ) {
    await this.assertOwnership(startupId, userId);

    if (
      input.tipoConta &&
      input.tipoConta !== 'corrente' &&
      input.tipoConta !== 'poupanca'
    ) {
      throw new HttpException(
        'tipoConta deve ser "corrente" ou "poupanca"',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Normaliza CPF/CNPJ (preserva alfa + dígitos, valida comprimento).
    // Aceita CPF (11 dígitos) ou CNPJ (14 alfanuméricos com DV válido).
    const rawDoc = input.documentoTitular ?? '';
    const docLimpo = rawDoc
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 14);
    if (
      docLimpo.length > 0 &&
      docLimpo.length !== 11 &&
      docLimpo.length !== 14
    ) {
      throw new HttpException(
        'CPF/CNPJ do titular deve ter 11 (CPF) ou 14 (CNPJ) caracteres',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (docLimpo.length === 14) {
      // CNPJ — valida DV alfanumérico (aceita também numérico puro via alphanumeric:true)
      const { validateCnpj } =
        await import('../../../common/validators/cnpj.validator');
      if (!validateCnpj(docLimpo, { alphanumeric: true })) {
        throw new HttpException(
          'CNPJ do titular inválido',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const documento_titular =
      input.documentoTitular === null
        ? null
        : docLimpo.length > 0
          ? docLimpo
          : undefined;

    const updated = await this.prisma.startup.update({
      where: { id: startupId },
      data: {
        titular: input.titular ?? undefined,
        documento_titular,
        banco: input.banco ?? undefined,
        tipo_conta: input.tipoConta ?? undefined,
        agencia: input.agencia ?? undefined,
        conta: input.conta ?? undefined,
        digito: input.digito ?? undefined,
        pix_key: input.chavePix ?? undefined,
      },
      select: {
        id: true,
        titular: true,
        documento_titular: true,
        banco: true,
        tipo_conta: true,
        agencia: true,
        conta: true,
        digito: true,
        pix_key: true,
      },
    });

    return ResponseDto.success('Dados bancários atualizados', 200, {
      id: updated.id,
      titular: updated.titular,
      documentoTitular: updated.documento_titular,
      banco: updated.banco,
      tipoConta: updated.tipo_conta,
      agencia: updated.agencia,
      conta: updated.conta,
      digito: updated.digito,
      chavePix: updated.pix_key,
    });
  }

  async listDocuments(startupId: number, userId: number) {
    await this.assertOwnership(startupId, userId);
    const [docs, nas, rejections, startup] = await Promise.all([
      this.prisma.startupDocument.findMany({
        where: { startupId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          categoria: true,
          nome: true,
          s3Key: true,
          mimetype: true,
          sizeBytes: true,
          // Status de review é exibido para o founder nos slots de categoria
          // (badge verde quando aprovado; sem badge quando pendente).
          reviewStatus: true,
          reviewNote: true,
          createdAt: true,
        },
      }),
      this.prisma.startupDocumentNA.findMany({
        where: { startupId },
        select: {
          id: true,
          categoria: true,
          justificativa: true,
          reviewStatus: true,
          reviewNote: true,
          createdAt: true,
        },
      }),
      // Rejeições em aberto — fonte de verdade do banner vermelho por categoria
      // em /founder/startups/:id/edit/documentos. Quando o founder re-upload
      // satisfatoriamente, `resolvedAt` é setado e a row sai daqui.
      this.prisma.startupDocumentRejection.findMany({
        where: { startupId, resolvedAt: null },
        orderBy: { rejectedAt: 'desc' },
        select: {
          id: true,
          categoria: true,
          documentName: true,
          reason: true,
          rejectedAt: true,
        },
      }),
      this.prisma.startup.findUnique({
        where: { id: startupId },
        select: {
          pitch_deck: {
            select: {
              id: true,
              originalName: true,
              mineType: true,
              size: true,
              url: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const documents =
      docs.some((doc) => doc.categoria === 'PITCH_DECK') || !startup?.pitch_deck
        ? docs
        : [
            ...docs,
            {
              id: startup.pitch_deck.id,
              categoria: 'PITCH_DECK' as const,
              nome: startup.pitch_deck.originalName,
              mimetype: startup.pitch_deck.mineType,
              sizeBytes: startup.pitch_deck.size,
              createdAt: startup.pitch_deck.createdAt,
              legacyUrl: startup.pitch_deck.url,
              legacy: true,
            },
          ];
    const compliance = computeCompliance(documents);
    return ResponseDto.success('Documentos retornados', 200, {
      documents,
      naoSeAplica: nas,
      // Banner vermelho inline na categoria correspondente. Some quando o
      // founder faz upload de um novo doc nessa categoria (resolvedAt setado).
      rejections,
      compliance,
    });
  }

  /**
   * Marca (ou atualiza) uma categoria como "Não se aplica" com justificativa
   * obrigatória (fluxo_startup §2). Só categorias NÃO-essenciais são aceitas.
   * Idempotente por (startupId, categoria). Se houver um documento enviado
   * nessa categoria, ele é removido (a marcação N/A o substitui).
   */
  async setDocumentNA(
    startupId: number,
    userId: number,
    categoria: StartupDocumentCategory,
    justificativa: string,
  ) {
    await this.assertOwnership(startupId, userId);

    if (!NON_ESSENTIAL_CATEGORIES.has(categoria)) {
      throw new HttpException(
        `A categoria ${categoria} é obrigatória e não pode ser marcada como "Não se aplica".`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const texto = (justificativa ?? '').trim();
    if (texto.length < 3) {
      throw new HttpException(
        'A justificativa do "Não se aplica" é obrigatória (mín. 3 caracteres).',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (texto.length > JUSTIFICATIVA_NA_MAX_LENGTH) {
      throw new HttpException(
        `A justificativa excede o limite de ${JUSTIFICATIVA_NA_MAX_LENGTH} caracteres.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const na = await this.prisma.startupDocumentNA.upsert({
      where: { startupId_categoria: { startupId, categoria } },
      update: {
        justificativa: texto,
        // Reabre a revisão do compliance ao alterar a justificativa.
        reviewStatus: 'PENDING_REVIEW',
        reviewNote: null,
        reviewedAt: null,
        reviewedById: null,
      },
      create: {
        startupId,
        categoria,
        justificativa: texto,
        createdById: userId,
      },
    });

    // Remove qualquer documento enviado nessa categoria (a marcação substitui).
    await this.prisma.startupDocument.deleteMany({
      where: { startupId, categoria },
    });

    return ResponseDto.success('Marcado como "Não se aplica"', 200, na);
  }

  /** Remove a marcação "Não se aplica" de uma categoria (volta a pendente). */
  async removeDocumentNA(
    startupId: number,
    userId: number,
    categoria: StartupDocumentCategory,
  ) {
    await this.assertOwnership(startupId, userId);
    await this.prisma.startupDocumentNA.deleteMany({
      where: { startupId, categoria },
    });
    return ResponseDto.success('Marcação "Não se aplica" removida', 200, {
      categoria,
    });
  }

  /**
   * Dados da página de prorrogação (PRD_RECEBIMENTO §6.3): meta original,
   * preço do token e o captado da campanha finalizada (FUNDED). O founder
   * define o valor adicional; a nova meta e a reserva (adicional ÷ preço do
   * token) são derivadas no cliente (read-only).
   */
  async getProrrogacaoData(startupId: number, userId: number) {
    await this.assertOwnership(startupId, userId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { startupId, status: 'FUNDED' },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        title: true,
        targetAmount: true,
        tokenPrice: true,
        tokensSold: true,
        totalTokens: true,
      },
    });
    if (!campaign) {
      return ResponseDto.error(
        'Nenhuma campanha finalizada (FUNDED) para prorrogar.',
        404,
      );
    }
    return ResponseDto.success('Dados de prorrogação', 200, {
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      metaOriginal: Number(campaign.targetAmount),
      tokenPrice: Number(campaign.tokenPrice),
      tokensSold: campaign.tokensSold,
      totalTokens: campaign.totalTokens,
    });
  }

  /**
   * Cria a cobrança da reserva adicional na prorrogação (PRD_RECEBIMENTO §6.3):
   * grava a CampaignExtension (PENDING_RESERVATION_PAYMENT) + Payment
   * TOKEN_RESERVATION_EXTENSION (PENDING, expira em 24h) numa transação.
   * A reserva de tokens é calculada SOMENTE sobre o valor adicional. Ao
   * confirmar o pagamento (PAID), o efeito reativa a campanha (OPEN) somando a
   * meta. Idempotente: reaproveita uma extensão PENDENTE existente.
   */
  async createProrrogacaoCheckout(
    startupId: number,
    userId: number,
    additionalAmount: number,
    periodDays = 30,
  ) {
    await this.assertOwnership(startupId, userId);

    const add = Number(additionalAmount);
    if (!Number.isFinite(add) || add <= 0) {
      throw new HttpException(
        'O valor adicional deve ser maior que zero.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const campaign = await this.prisma.campaign.findFirst({
      where: { startupId, status: 'FUNDED' },
      orderBy: { id: 'desc' },
      select: { id: true, targetAmount: true, tokenPrice: true },
    });
    if (!campaign) {
      throw new HttpException(
        'Nenhuma campanha finalizada (FUNDED) para prorrogar.',
        HttpStatus.NOT_FOUND,
      );
    }

    const tokenPrice = Number(campaign.tokenPrice);
    const tokenReserve = tokenPrice > 0 ? Math.floor(add / tokenPrice) : 0;
    if (tokenReserve <= 0) {
      throw new HttpException(
        'O valor adicional é insuficiente para reservar ao menos 1 token.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const totalAmountShown = Number(campaign.targetAmount) + add;

    // Idempotência: reaproveita extensão PENDENTE com pagamento PENDING.
    const existing = await this.prisma.campaignExtension.findFirst({
      where: {
        campaignId: campaign.id,
        status: 'PENDING_RESERVATION_PAYMENT',
        payment: { status: 'PENDING' },
      },
      select: { id: true, paymentId: true },
    });
    if (existing?.paymentId) {
      return ResponseDto.success(
        'Cobrança de prorrogação pendente reaproveitada',
        200,
        { paymentId: existing.paymentId, reused: true },
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId,
          amount: add,
          method: 'PIX',
          purpose: 'TOKEN_RESERVATION_EXTENSION',
          status: 'PENDING',
          expiresAt,
          campaignId: campaign.id,
        },
        select: { id: true },
      });
      await tx.campaignExtension.create({
        data: {
          campaignId: campaign.id,
          additionalAmount: add,
          totalAmountShown,
          tokenReserve,
          periodDays,
          status: 'PENDING_RESERVATION_PAYMENT',
          paymentId: payment.id,
          createdById: userId,
        },
      });
      return payment;
    });

    return ResponseDto.success('Cobrança da reserva adicional criada', 201, {
      paymentId: result.id,
      reused: false,
    });
  }

  async uploadDocument(
    startupId: number,
    userId: number,
    file: Express.Multer.File,
    categoria: StartupDocumentCategory,
  ) {
    await this.assertOwnership(startupId, userId);

    if (!file) {
      throw new HttpException(
        'Arquivo `file` é obrigatório',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!ALLOWED_CATEGORIES.has(categoria)) {
      throw new HttpException(
        `Categoria inválida (${categoria}). Aceitas: ${[...ALLOWED_CATEGORIES].join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (file.size > MAX_DOC_SIZE_BYTES) {
      throw new HttpException(
        `Arquivo excede ${MAX_DOC_SIZE_BYTES / 1024 / 1024} MB`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!ACCEPTED_DOC_MIMES.has(file.mimetype)) {
      throw new HttpException(
        `Tipo não suportado (${file.mimetype}). Aceitos: PDF, JPG, PNG`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const ext =
      file.mimetype === 'application/pdf'
        ? 'pdf'
        : file.mimetype === 'image/png'
          ? 'png'
          : 'jpg';
    const key = `startup-${startupId}/${randomUUID()}.${ext}`;
    const uploaded = await this.s3.upload(
      file.buffer,
      'document',
      key,
      file.mimetype,
    );

    // Pra slots únicos (não OUTRO), removemos o anterior pra manter 1-por-categoria.
    if (categoria !== 'OUTRO') {
      const existing = await this.prisma.startupDocument.findFirst({
        where: { startupId, categoria },
      });
      if (existing) {
        await this.prisma.startupDocument.delete({
          where: { id: existing.id },
        });
      }
    }

    // Um documento enviado substitui a marcação anterior de "Não se aplica".
    await this.prisma.startupDocumentNA.deleteMany({
      where: { startupId, categoria },
    });

    const doc = await this.prisma.startupDocument.create({
      data: {
        startupId,
        categoria,
        nome: file.originalname,
        s3Key: uploaded.key,
        mimetype: file.mimetype,
        sizeBytes: uploaded.size,
        uploadedById: userId,
      },
    });

    // Marca rejeições em aberto da mesma categoria como resolvidas — o founder
    // acabou de enviar o substituto que o Compliance pediu. O banner vermelho
    // some automaticamente na próxima refetch.
    const resolved = await this.prisma.startupDocumentRejection.updateMany({
      where: { startupId, categoria, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
    if (resolved.count > 0) {
      this.logger.log(
        `Resolved ${resolved.count} rejeição(ões) aberta(s) para startup ${startupId} / categoria ${categoria} via novo upload`,
      );
    }

    this.logger.log(
      `Documento ${doc.id} (${doc.categoria}) uploadado pra startup ${startupId} por user ${userId}`,
    );

    return ResponseDto.success('Documento enviado', 200, doc);
  }

  /**
   * Gera URL assinada (presigned) pra download do documento. URL expira
   * em 1h por default — tempo suficiente pro user clicar/baixar sem
   * deixar link aberto eternamente.
   */
  async getDocumentDownloadUrl(
    startupId: number,
    userId: number,
    docId: number,
  ) {
    await this.assertOwnership(startupId, userId);
    const doc = await this.prisma.startupDocument.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.startupId !== startupId) {
      throw new NotFoundException('Documento não encontrado');
    }
    const url = await this.s3.getUrl('document', doc.s3Key);
    return ResponseDto.success('URL gerada', 200, {
      id: doc.id,
      url,
      mimetype: doc.mimetype,
      nome: doc.nome,
    });
  }

  async deleteDocument(startupId: number, userId: number, docId: number) {
    await this.assertOwnership(startupId, userId);
    const doc = await this.prisma.startupDocument.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.startupId !== startupId) {
      throw new NotFoundException('Documento não encontrado');
    }

    await this.prisma.startupDocument.delete({ where: { id: doc.id } });
    this.logger.log(
      `Documento ${doc.id} (${doc.categoria}) removido da startup ${startupId} por user ${userId}`,
    );

    return ResponseDto.success('Documento removido', 200, {
      id: doc.id,
      categoria: doc.categoria,
    });
  }
}
