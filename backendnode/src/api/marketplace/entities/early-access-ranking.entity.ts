import { ApiProperty } from '@nestjs/swagger';

export class EarlyAccessRankingItemEntity {
  @ApiProperty({ description: 'Posição no ranking', example: 1 })
  position: number;

  @ApiProperty({ description: 'UUID público da startup', example: 'abc-123' })
  startupId: string;

  @ApiProperty({ description: 'Nome da startup', example: 'Startup XYZ' })
  startupName: string;

  @ApiProperty({ description: 'Categoria da startup', example: 'Fintech' })
  category: string;

  @ApiProperty({ description: 'Número de reservas Early Access', example: 127 })
  reservations: number;

  @ApiProperty({
    description: 'URL do logo da startup',
    example: 'https://storage.example.com/logo.png',
    nullable: true,
  })
  logoUrl: string | null;
}

export class EarlyAccessRankingEntity {
  @ApiProperty({ type: [EarlyAccessRankingItemEntity] })
  ranking: EarlyAccessRankingItemEntity[];

  @ApiProperty({ description: 'Total de reservas', example: 1543 })
  totalReservations: number;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2026-05-02T12:00:00Z',
  })
  lastUpdated: string;
}
