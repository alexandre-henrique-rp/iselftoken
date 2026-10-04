/**
 * Registro canônico dos parâmetros de cálculo da plataforma.
 *
 * Cada parâmetro tem uma UNIDADE nativa que os cálculos esperam — NÃO mude a
 * unidade de um `key` existente sem ajustar os sites de cálculo:
 *  - FRACTION: fração (0.05 = 5%). Ex.: taxa de emissão multiplica o alvo.
 *  - PERCENT:  percentual inteiro (3 = 3%). Ex.: comissão do afiliado (÷100 no cálculo).
 *  - BRL:      valor em reais.
 *  - INT:      inteiro (ex.: faixa de equity em %).
 *  - BOOL:     liga/desliga (1 = sim, 0 = não).
 *
 * O valor default aqui é o fallback usado quando ainda não há nenhuma versão
 * vigente na tabela `config_parameter_values`.
 */
export type ConfigUnit = 'FRACTION' | 'PERCENT' | 'BRL' | 'INT' | 'BOOL';

export interface ConfigParamMeta {
  key: string;
  label: string;
  group: string;
  unit: ConfigUnit;
  default: number;
  help?: string;
}

export const CONFIG_PARAMETERS: ConfigParamMeta[] = [
  {
    key: 'fundraising.authFeePerToken',
    label: 'Taxa de emissão por token',
    group: 'Tokens e emissão',
    unit: 'BRL',
    default: 1,
    help: 'Custo unitário de geração por token (R$/token) cobrado do fundador ao emitir/reservar tokens.',
  },
  {
    key: 'fundraising.tokenPrice',
    label: 'Preço base do token',
    group: 'Tokens e emissão',
    unit: 'BRL',
    default: 200,
    help: 'Valor base usado para calcular a quantidade de tokens da campanha.',
  },
  {
    key: 'fundraising.tokenSalePrice',
    label: 'Preço de venda do token',
    group: 'Tokens e emissão',
    unit: 'BRL',
    default: 240,
    help: 'Valor efetivamente cobrado do investidor por token.',
  },
  {
    key: 'fundraising.platformFee',
    label: 'Taxa da plataforma (fundraising)',
    group: 'Comissões',
    unit: 'FRACTION',
    default: 0.05,
    help: 'Alíquota sobre o GMV usada na apuração de receita da plataforma.',
  },
  {
    key: 'affiliate.defaultAffiliatePct',
    label: 'Comissão de afiliado (padrão)',
    group: 'Comissões',
    unit: 'PERCENT',
    default: 3,
    help: 'Percentual sugerido ao criar um programa de afiliados (ajustável por programa).',
  },
  {
    key: 'affiliate.defaultPlatformPct',
    label: 'Comissão da plataforma no afiliado (padrão)',
    group: 'Comissões',
    unit: 'PERCENT',
    default: 2,
    help: 'Percentual da plataforma sobre vendas com afiliado (ajustável por programa).',
  },
  {
    key: 'fundraising.complianceFee',
    label: 'Taxa de compliance',
    group: 'Compliance',
    unit: 'BRL',
    default: 1500,
    help: 'Taxa fixa da análise de compliance da startup.',
  },
  {
    key: 'fundraising.fastTrackFee',
    label: 'Taxa de fast-track',
    group: 'Compliance',
    unit: 'BRL',
    default: 2500,
    help: 'Taxa para análise prioritária (compliance + prioridade).',
  },
  {
    key: 'fundraising.minCampaign',
    label: 'Campanha mínima',
    group: 'Limites de campanha',
    unit: 'BRL',
    default: 300000,
  },
  {
    key: 'fundraising.maxCampaign',
    label: 'Campanha máxima',
    group: 'Limites de campanha',
    unit: 'BRL',
    default: 12000000,
  },
  {
    key: 'fundraising.equityMin',
    label: 'Equity mínimo',
    group: 'Limites de campanha',
    unit: 'INT',
    default: 5,
  },
  {
    key: 'fundraising.equityMax',
    label: 'Equity máximo',
    group: 'Limites de campanha',
    unit: 'INT',
    default: 20,
  },
  // O preco dos planos agora vive exclusivamente na tabela `plans`
  // (editavel via /admin/plans). Removido o override por config versionada
  // para evitar divergencia entre o banco e a tela de Configuracoes.
  // Fluxo de afiliação
  {
    key: 'affiliate.requireFounderReview',
    label: 'Exigir análise da candidatura de afiliado',
    group: 'Afiliação',
    unit: 'BOOL',
    default: 0,
    help: 'Ligado: a candidatura passa pela análise do fundador e depois da iSelfToken. Desligado (padrão): o afiliado é aprovado automaticamente, sem análise do fundador nem do admin.',
  },
];

export const CONFIG_PARAM_BY_KEY: Record<string, ConfigParamMeta> =
  Object.fromEntries(CONFIG_PARAMETERS.map((p) => [p.key, p]));
