import { ApiProperty } from '@nestjs/swagger';

export class StartupListPropEntity {
  @ApiProperty({
    description: 'ID da startup',
    example: '1',
  })
  id: string;

  @ApiProperty({
    description: 'URL da logo (thumbnail)',
    example: '/documents/sm/logo-abc.jpeg',
    nullable: true,
  })
  logo: string | null;

  @ApiProperty({
    description: 'Nome da startup',
    example: 'TechInnovate',
  })
  nome: string;

  @ApiProperty({
    description: 'Segmento/área de atuação',
    example: 'Inteligência Artificial',
    nullable: true,
  })
  segmento: string | null;

  @ApiProperty({
    description: 'Status da startup',
    enum: ['aprovada', 'em_analise', 'rejeitada'],
    example: 'aprovada',
  })
  status: 'aprovada' | 'em_analise' | 'rejeitada';

  @ApiProperty({
    description: 'Estágio da startup',
    example: 'SERIES_A',
    nullable: true,
  })
  estagio: string | null;

  @ApiProperty({
    description: 'Total de tokens emitidos',
    example: 1000000,
  })
  totalTokens: number;

  @ApiProperty({
    description: 'Quantidade de tokens vendidos',
    example: 45000,
  })
  tokensVendidos: number;

  @ApiProperty({
    description: 'Percentual de tokens vendidos',
    example: 45,
  })
  percentualVendido: number;

  @ApiProperty({
    description: 'Status da campanha',
    enum: ['edicao', 'aberto', 'financiado', 'reprovado', 'pago'],
    example: 'aberto',
  })
  statusCampanha: 'edicao' | 'aberto' | 'financiado' | 'reprovado' | 'pago';

  @ApiProperty({
    description: 'Ícone da bandeira do país',
    example: '🇧🇷',
    nullable: true,
  })
  bandeira: string | null;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;
}

export class StartupListResponseEntity {
  @ApiProperty({
    description: 'Indica se houve erro na operação',
    example: false,
  })
  error: boolean;
  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Startups retornadas com sucesso',
  })
  message: string;
  @ApiProperty({
    description: 'Código de status',
    example: 200,
  })
  codigo: number;
  @ApiProperty({
    description: 'Lista de startups',
    type: [StartupListPropEntity],
  })
  data: StartupListPropEntity[];
}
