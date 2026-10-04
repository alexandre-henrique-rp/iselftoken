import { ApiProperty } from '@nestjs/swagger';

export class MarketplaceCardSealDto {
  @ApiProperty({ example: 'startup_verificada' })
  slug: string;

  @ApiProperty({ example: 'Startup Verificada' })
  name: string;

  @ApiProperty({ example: '/icons/startup_verificada.png' })
  imagePath: string;

  @ApiProperty({
    enum: ['STAGE', 'VERIFICATION', 'PARTNERSHIP', 'ACHIEVEMENT', 'CUSTOM'],
  })
  category: string;
}

export class MarketplaceCardDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'shieldbyte' })
  slug: string;

  @ApiProperty({ example: 'ShieldByte' })
  name: string;

  @ApiProperty({
    example:
      'Segurança cibernética baseada em IA para infraestruturas críticas.',
  })
  description: string;

  @ApiProperty({ example: 'https://storage.example.com/logo.png' })
  image: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://storage.example.com/cover.jpg',
    description: 'URL da imagem de capa (banner) da startup.',
  })
  cover: string | null;

  @ApiProperty({
    type: [String],
    example: [],
    description: 'Reservado para futuro (ex.: VERIFICADA, TRENDING)',
  })
  tags: string[];

  @ApiProperty({
    enum: ['FINTECH', 'AI', 'SAAS', 'HEALTHTECH', 'EDTECH', 'BIOTECH', 'OTHER'],
    example: 'FINTECH',
  })
  category: string;

  @ApiProperty({
    example: '5.5%',
    description: 'Percentual de tokens vendidos sobre o total',
  })
  equity: string;

  @ApiProperty({ example: 'R$ 22M' })
  valuation: string;

  @ApiProperty({ example: 'R$ 150k' })
  raised: string;

  @ApiProperty({ example: 'R$ 1.5M' })
  goal: string;

  @ApiProperty({
    example: 10,
    description: 'Percentual arrecadado sobre a meta (0-100)',
  })
  progress: number;

  @ApiProperty({
    required: false,
    example: 87,
    description: 'Score manual (0-100). Apenas em /featured.',
  })
  score?: number;

  @ApiProperty({
    type: [MarketplaceCardSealDto],
    description:
      'Top 5 selos atribuídos à startup (prioridade: VERIFICATION > ACHIEVEMENT > STAGE > PARTNERSHIP > CUSTOM).',
  })
  seals: MarketplaceCardSealDto[];

  @ApiProperty({
    required: false,
    nullable: true,
    example: '2026-06-15T23:59:59.000Z',
    description:
      'Deadline da campanha em ISO 8601. null quando não há campanha aberta.',
  })
  deadline: string | null;

  @ApiProperty({
    type: [Number],
    example: [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
    description:
      'Captação dos últimos 7 dias normalizada [0,1] por campanha. Array de comprimento 7. ' +
      'Posição 0 = 6 dias atrás; posição 6 = hoje. Vazio (zeros) quando sem investimentos no período.',
  })
  sparkline7d: number[];
}
