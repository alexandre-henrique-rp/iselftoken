/**
 * Tipos para o payload expandido do GET /startup (M5-S12).
 * Backend retorna: { data, summary, tabsCount } envolto em ResponseDto
 * com { error, message, codigo, data: DashboardOverview }.
 */

export type Badge = {
  type: "STATUS" | "RODADA" | "ALERTA";
  label: string;
  color: string;
};

export type NextActionType =
  | "CONFIGURAR"
  | "CAMPANHA_EM_ANDAMENTO"
  | "NOVA_RODADA"
  | "PAGAR_RESERVA"
  | "REVISAR_DOCUMENTOS"
  | "CONFIGURAR_TIME";

export type NextAction = {
  tipo: NextActionType;
  label: string;
  rota: string;
} | null;

export type StartupStatus =
  | "aprovada"
  | "em_analise"
  | "rejeitada";

export type StartupStatusCampanha =
  | "edicao"
  | "aberto"
  | "financiado"
  | "reprovado"
  | "pago";

export type StartupEnriched = {
  id: string;
  logo: string | null;
  nome: string;
  segmento: string | null;
  status: StartupStatus;
  estagio: string | null;
  totalTokens: number;
  tokensVendidos: number;
  percentualVendido: number;
  statusCampanha: StartupStatusCampanha;
  bandeira: string | null;
  createdAt: string;
  badges: Badge[];
  valorCaptado: number;
  metaCaptacao: number | null;
  progresso: number;
  proximaAcao: NextAction;
};

export type SparklinePoint = {
  date: string;
  valor: number;
};

export type Captado30d = {
  valor: number;
  variacaoPercent: number;
  sparkline: SparklinePoint[];
};

export type Restantes = {
  diasAteProximoFechamento: number | null;
  dataFechamentoMaisProxima: string | null;
};

export type CampanhasCount = {
  abertas: number;
  total: number;
};

export type DashboardSummary = {
  captado30d: Captado30d;
  investidoresUnicos: number;
  progressoMedio: number;
  restantes: Restantes;
  campanhas: CampanhasCount;
};

export type TabsCount = {
  todas: number;
  aprovadas: number;
  emAnalise: number;
  rascunhos: number;
  rejeitadas: number;
  Financiadas: number;
};

export type DashboardOverview = {
  startups: StartupEnriched[];
  summary: DashboardSummary;
  tabsCount: TabsCount;
};

/**
 * Wrapper do backend NestJS via ResponseDto.
 * GET /api/startup retorna { error, message, codigo, data: DashboardOverview }
 */
export type DashboardOverviewResponse = {
  error: boolean;
  message: string;
  codigo: number;
  data: DashboardOverview;
};
