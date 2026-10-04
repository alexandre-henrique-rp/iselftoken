import { ApiProperty } from '@nestjs/swagger';
import { Badge, RoundStatus } from '../service/enrichment.service';
import { NextAction } from '../service/next-action.service';

export class SparklinePoint {
  @ApiProperty({ example: '2026-07-01' })
  date: string;
  @ApiProperty({ example: 150000 })
  valor: number;
}

export class Captado30dEntity {
  @ApiProperty({ example: 150000 })
  valor: number;
  @ApiProperty({ example: 12 })
  variacaoPercent: number;
  @ApiProperty({ type: [SparklinePoint] })
  sparkline: SparklinePoint[];
}

export class RestantesEntity {
  @ApiProperty({ example: 5, nullable: true })
  diasAteProximoFechamento: number | null;
  @ApiProperty({ example: '2026-07-15', nullable: true })
  dataFechamentoMaisProxima: string | null;
}

export class CampanhasCountEntity {
  @ApiProperty({ example: 2 })
  abertas: number;
  @ApiProperty({ example: 5 })
  total: number;
}

export class DashboardSummaryEntity {
  @ApiProperty({ type: Captado30dEntity })
  captado30d: Captado30dEntity;
  @ApiProperty({ example: 42 })
  investidoresUnicos: number;
  @ApiProperty({ example: 65 })
  progressoMedio: number;
  @ApiProperty({ type: RestantesEntity })
  restantes: RestantesEntity;
  @ApiProperty({ type: CampanhasCountEntity })
  campanhas: CampanhasCountEntity;
}

export class TabsCountEntity {
  @ApiProperty({ example: 3 })
  todas: number;
  @ApiProperty({ example: 2 })
  aprovadas: number;
  @ApiProperty({ example: 1 })
  emAnalise: number;
  @ApiProperty({ example: 0 })
  rascunhos: number;
  @ApiProperty({ example: 0 })
  rejeitadas: number;
  @ApiProperty({ example: 1 })
  Financiadas: number;
}

export class EnrichedStartupEntity {
  // Campos antigos (retrocompat)
  @ApiProperty({ example: '1' })
  id: string;
  @ApiProperty({ example: '/documents/sm/logo-abc.jpeg', nullable: true })
  logo: string | null;
  @ApiProperty({ example: 'TechInnovate 🇧🇷' })
  nome: string;
  @ApiProperty({ example: 'Inteligência Artificial', nullable: true })
  segmento: string | null;
  @ApiProperty({ enum: ['aprovada', 'em_analise', 'rejeitada'] })
  status: 'aprovada' | 'em_analise' | 'rejeitada';
  @ApiProperty({ example: 'SERIES_A', nullable: true })
  estagio: string | null;
  @ApiProperty({ example: 1000000 })
  totalTokens: number;
  @ApiProperty({ example: 45000 })
  tokensVendidos: number;
  @ApiProperty({ example: 45 })
  percentualVendido: number;
  @ApiProperty({
    enum: ['edicao', 'em_analise', 'aberto', 'financiado', 'reprovado', 'pago'],
  })
  statusCampanha:
    | 'edicao'
    | 'em_analise'
    | 'aberto'
    | 'financiado'
    | 'reprovado'
    | 'pago';
  @ApiProperty({ example: '🇧🇷', nullable: true })
  bandeira: string | null;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;
  // Campos novos (T049)
  @ApiProperty({ type: [Object] })
  badges: Badge[];
  @ApiProperty({ example: 75000 })
  valorCaptado: number;
  @ApiProperty({ example: 75 })
  progresso: number;
  // Campo novo (T050)
  @ApiProperty({ type: Object, nullable: true })
  proximaAcao: NextAction | null;
  // Campo novo (T106)
  @ApiProperty({
    enum: [
      'sem_rodada',
      'criada_aguardando_reserva',
      'reserva_paga',
      'ativa',
      'pausada',
      'cancelada',
      'encerrada',
    ],
    example: 'ativa',
  })
  roundStatus: RoundStatus;
}

export class StartupListOverviewResponseEntity {
  @ApiProperty({
    description: 'Lista de startups enriqucidas',
    type: [EnrichedStartupEntity],
  })
  data: EnrichedStartupEntity[];
  @ApiProperty({ description: 'Summary agregado para cards do dashboard' })
  summary: DashboardSummaryEntity;
  @ApiProperty({ description: 'Contadores para tabs do dashboard' })
  tabsCount: TabsCountEntity;
  @ApiProperty({ example: false })
  error: boolean;
  @ApiProperty({ example: 'Startups retornadas com sucesso' })
  message: string;
  @ApiProperty({ example: 200 })
  codigo: number;
}
