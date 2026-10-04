/**
 * DTOs para o payload expandido do GET /startup (T051).
 * Nao ha validacao de input - sao apenas tipos de saida.
 */
export class SparklinePointDto {
  date: string;
  valor: number;
}

export class Captado30dDto {
  valor: number;
  variacaoPercent: number;
  sparkline: SparklinePointDto[];
}

export class RestantesDto {
  diasAteProximoFechamento: number | null;
  dataFechamentoMaisProxima: string | null;
}

export class CampanhasCountDto {
  abertas: number;
  total: number;
}

export class DashboardSummaryDto {
  captado30d: Captado30dDto;
  investidoresUnicos: number;
  progressoMedio: number;
  restantes: RestantesDto;
  campanhas: CampanhasCountDto;
}

export class TabsCountDto {
  todas: number;
  aprovadas: number;
  emAnalise: number;
  rascunhos: number;
  rejeitadas: number;
  Financiadas: number;
}
