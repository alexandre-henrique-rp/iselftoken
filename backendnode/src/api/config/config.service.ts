import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CONFIG_PARAMETERS,
  CONFIG_PARAM_BY_KEY,
  type ConfigParamMeta,
} from './config.constants';

/** Extrai o slug do plano de uma key `plan.<slug>.preco`, ou null. */
export function planSlugFromKey(key: string): string | null {
  const m = /^plan\.(.+)\.preco$/.exec(key);
  return m ? m[1] : null;
}

export interface PublicFundraisingConfig {
  authFeePerToken: number;
  minCampaign: number;
  maxCampaign: number;
  equityMin: number;
  equityMax: number;
  tokenPrice: number;
  fastTrackFee: number;
}

export interface ParamVersion {
  id: number;
  value: number;
  effectiveFrom: Date;
  note: string | null;
  createdById: number | null;
  createdAt: Date;
}

export interface ParamAdminView extends ConfigParamMeta {
  currentValue: number;
  currentEffectiveFrom: Date | null;
  scheduled: ParamVersion | null; // próxima versão futura (agendada), se houver
  history: ParamVersion[]; // todas as versões, mais recente primeiro
}

/**
 * Fonte única da verdade dos parâmetros de cálculo (taxas, percentuais, limites).
 *
 * O valor vigente numa data D é a versão de maior `effectiveFrom <= D`. Como as
 * versões são append-only, cálculos passados que releem o parâmetro na sua
 * própria data continuam obtendo o valor da época — alterações futuras não
 * reescrevem o passado. Uma versão com `effectiveFrom` no futuro é uma alteração
 * agendada que passa a valer sozinha quando a data chega.
 */
@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Semeia a linha de base: para cada parâmetro sem nenhuma versão, importa o
   * valor atual de `finance_config` (se existir) como versão de 1970 — assim
   * customizações anteriores do admin são preservadas. Idempotente.
   */
  async onModuleInit(): Promise<void> {
    try {
      const jaExiste = await this.prisma.configParameterValue.findMany({
        select: { key: true },
        distinct: ['key'],
      });
      const comVersao = new Set(jaExiste.map((r) => r.key));
      const faltantes = CONFIG_PARAMETERS.filter((p) => !comVersao.has(p.key));
      if (faltantes.length === 0) return;

      const legacy = await this.prisma.financeConfig.findMany({
        where: { key: { in: faltantes.map((p) => p.key) } },
      });
      const legacyByKey = new Map(legacy.map((r) => [r.key, Number(r.value)]));

      // Preços de adesão (plan.<slug>.preco) têm a linha de base em `plans.preco`.
      const planSlugs = faltantes
        .map((p) => planSlugFromKey(p.key))
        .filter((s): s is string => !!s);
      const planRows = planSlugs.length
        ? await this.prisma.plan.findMany({
            where: { slug: { in: planSlugs } },
          })
        : [];
      const planPrecoBySlug = new Map(
        planRows.map((r) => [r.slug, Number(r.preco)]),
      );

      const epoch = new Date('1970-01-01T00:00:00.000Z');
      for (const p of faltantes) {
        const slug = planSlugFromKey(p.key);
        const planVal = slug ? planPrecoBySlug.get(slug) : undefined;
        const legacyVal = legacyByKey.get(p.key);
        const value =
          planVal !== undefined && !Number.isNaN(planVal)
            ? planVal
            : legacyVal !== undefined && !Number.isNaN(legacyVal)
              ? legacyVal
              : p.default;
        await this.prisma.configParameterValue.create({
          data: {
            key: p.key,
            value: String(value),
            effectiveFrom: epoch,
            note: 'Linha de base (migração da configuração anterior)',
          },
        });
      }
      this.logger.log(
        `Config: linha de base semeada para ${faltantes.length} parâmetro(s).`,
      );
    } catch (e: any) {
      this.logger.warn(`Config: falha ao semear linha de base: ${e?.message}`);
    }
  }

  /**
   * Retorna somente os campos operacionais necessários ao wizard de founder.
   * Não expõe platformFee, complianceFee, histórico ou metadados administrativos.
   *
   * Fonte única: tabela `config_parameter_values` (modelo `ConfigParameterValue`)
   * com vigência por data — a mesma que o painel admin `/admin/config/parameters`
   * lê e escreve. A tabela legada `finance_config` foi descontinuada; valores
   * antigos eram migrados para `config_parameter_values` no `onModuleInit`.
   *
   * Defaults caem nos metadados de `CONFIG_PARAMETERS` quando o admin ainda nao
   * gravou nenhuma versão vigente.
   */
  async getPublicFundraisingConfig(): Promise<PublicFundraisingConfig> {
    const metaDefault = (key: string): number => {
      const meta = CONFIG_PARAMETERS.find((p) => p.key === key);
      return meta ? meta.default : 0;
    };

    /** Le o valor vigente em `config_parameter_values`. Devolve null se nao ha row. */
    const readRaw = async (paramKey: string): Promise<number | null> => {
      const row = await this.prisma.configParameterValue.findFirst({
        where: { key: paramKey, effectiveFrom: { lte: new Date() } },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (!row) return null;
      const n = Number(row.value);
      return Number.isFinite(n) && !Number.isNaN(n) ? n : null;
    };

    /** Le o valor vigente OU cai no default canonico da CONFIG_PARAMETERS. */
    const read = async (paramKey: string): Promise<number> => {
      const raw = await readRaw(paramKey);
      return raw !== null ? raw : metaDefault(paramKey);
    };

    // fastTrackFee pode estar gravado como fastTrackFee OU fastTrackReview
    // (legado — admin antigo gravava neste nome); aceitamos ambos para
    // retro-compatibilidade. Se nenhum dos dois existir, cai no default.
    const fastTrackFee = await (async () => {
      const fee = await readRaw('fundraising.fastTrackFee');
      if (fee !== null) return fee;
      const review = await readRaw('fundraising.fastTrackReview');
      if (review !== null) return review;
      return metaDefault('fundraising.fastTrackFee');
    })();

    return {
      authFeePerToken: await read('fundraising.authFeePerToken'),
      minCampaign: await read('fundraising.minCampaign'),
      maxCampaign: await read('fundraising.maxCampaign'),
      equityMin: await read('fundraising.equityMin'),
      equityMax: await read('fundraising.equityMax'),
      tokenPrice: await read('fundraising.tokenPrice'),
      fastTrackFee,
    };
  }

  /** Valor vigente de um parâmetro numa data (default: agora). */
  async getEffective(key: string, at: Date = new Date()): Promise<number> {
    const meta = CONFIG_PARAM_BY_KEY[key];
    const row = await this.prisma.configParameterValue.findFirst({
      where: { key, effectiveFrom: { lte: at } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (row) {
      const n = Number(row.value);
      if (!Number.isNaN(n)) return n;
    }
    return meta ? meta.default : NaN;
  }

  /** Vários parâmetros vigentes numa data, em um mapa key→valor. */
  async getManyEffective(
    keys: string[],
    at: Date = new Date(),
  ): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    await Promise.all(
      keys.map(async (k) => {
        out[k] = await this.getEffective(k, at);
      }),
    );
    return out;
  }

  /** Visão completa para a tela do admin: atual + agendado + histórico. */
  async listForAdmin(now: Date = new Date()): Promise<ParamAdminView[]> {
    const rows = await this.prisma.configParameterValue.findMany({
      where: { key: { in: CONFIG_PARAMETERS.map((p) => p.key) } },
      orderBy: { effectiveFrom: 'desc' },
    });
    const byKey = new Map<string, ParamVersion[]>();
    for (const r of rows) {
      const v: ParamVersion = {
        id: r.id,
        value: Number(r.value),
        effectiveFrom: r.effectiveFrom,
        note: r.note ?? null,
        createdById: r.createdById ?? null,
        createdAt: r.createdAt,
      };
      const arr = byKey.get(r.key) ?? [];
      arr.push(v);
      byKey.set(r.key, arr);
    }

    return CONFIG_PARAMETERS.map((meta) => {
      const history = byKey.get(meta.key) ?? []; // já desc por effectiveFrom
      const current =
        history.find((v) => v.effectiveFrom.getTime() <= now.getTime()) ?? null;
      // agendada = a versão futura mais próxima (a de MENOR effectiveFrom > now)
      const futuras = history
        .filter((v) => v.effectiveFrom.getTime() > now.getTime())
        .sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());
      return {
        ...meta,
        currentValue: current ? current.value : meta.default,
        currentEffectiveFrom: current ? current.effectiveFrom : null,
        scheduled: futuras[0] ?? null,
        history,
      };
    });
  }

  /**
   * Cria uma nova versão vigente a partir de `effectiveFrom`. Não altera versões
   * existentes (o passado é imutável). Retorna a versão criada.
   */
  async setValue(input: {
    key: string;
    value: number;
    effectiveFrom: Date;
    note?: string | null;
    createdById?: number | null;
  }): Promise<ParamVersion> {
    const meta = CONFIG_PARAM_BY_KEY[input.key];
    if (!meta) {
      throw new Error(`Parâmetro de configuração desconhecido: ${input.key}`);
    }
    if (Number.isNaN(input.value)) {
      throw new Error('Valor inválido');
    }
    if (input.value < 0) {
      throw new Error('Valor não pode ser negativo');
    }
    const row = await this.prisma.configParameterValue.create({
      data: {
        key: input.key,
        value: String(input.value),
        effectiveFrom: input.effectiveFrom,
        note: input.note ?? null,
        createdById: input.createdById ?? null,
      },
    });
    return {
      id: row.id,
      value: Number(row.value),
      effectiveFrom: row.effectiveFrom,
      note: row.note ?? null,
      createdById: row.createdById ?? null,
      createdAt: row.createdAt,
    };
  }
}
