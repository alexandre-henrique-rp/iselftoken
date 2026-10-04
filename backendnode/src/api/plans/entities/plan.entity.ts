import { ApiProperty } from '@nestjs/swagger';

export class PlanEntity {
  @ApiProperty({ description: 'Identificador do plano', example: 1 })
  // ID único do plano
  id: number;

  @ApiProperty({ description: 'Nome do plano', example: 'Plano Premium' })
  // Nome exibido para o plano
  nome: string;

  @ApiProperty({ description: 'Slug do plano', example: 'plano-premium' })
  // Identificador amigável para URL
  slug: string;

  @ApiProperty({
    description: 'Descrição do plano',
    example: 'Plano com acesso completo',
    required: false,
    nullable: true,
  })
  // Texto descritivo do plano
  descricao?: string | null;

  @ApiProperty({ description: 'Preço do plano', example: 99.9 })
  // Valor monetário do plano
  preco: number;

  @ApiProperty({ description: 'Duração em meses', example: 12 })
  // Duração do plano em meses
  periodoMeses: number;

  @ApiProperty({ description: 'Tipo do período', example: 'anual' })
  // Nome do período exibido para o usuário
  periodo: string;

  @ApiProperty({
    description: 'Ícone do plano',
    example: 'star',
    required: false,
    nullable: true,
  })
  // Ícone ou referência visual do plano
  icon?: string | null;

  @ApiProperty({
    description: 'Benefícios do plano',
    example: ['Benefício 1', 'Benefício 2'],
    required: false,
    nullable: true,
    type: () => [String],
  })
  // Benefícios apresentados ao usuário
  beneficios?: Array<string> | null;

  @ApiProperty({ description: 'Plano visível para usuários', example: true })
  // Indica se o plano aparece nas listagens
  visivel: boolean;

  @ApiProperty({ description: 'Plano ativo no sistema', example: true })
  // Controla se o plano pode ser utilizado
  isActive: boolean;

  @ApiProperty({ description: 'Plano recomendado', example: false })
  // Marca o plano como destaque
  recomendado: boolean;

  @ApiProperty({
    description: 'Texto do botão de aquisição exibido no /pricing',
    example: 'Começar agora',
    required: false,
    nullable: true,
  })
  textoBotao?: string | null;

  @ApiProperty({
    description: 'Data de criação',
    example: '2026-01-19T12:00:00Z',
  })
  // Data de criação do plano
  createdAt: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2026-01-19T12:00:00Z',
  })
  // Data de atualização do plano
  updatedAt: Date;
}
