/**
 * Shape de resposta para GET/PATCH /admin/configs/:key.
 * Espelha o row da tabela `SystemConfig`.
 */
import { ApiProperty } from '@nestjs/swagger';

export class ConfigResponseDto {
  @ApiProperty({
    description: 'Chave da configuração',
    example: 'PLATFORM_ADMIN_FEE_PCT',
  })
  key!: string;

  @ApiProperty({ description: 'Valor numérico', example: 0.2 })
  value!: number;

  @ApiProperty({ description: 'Descrição legível', required: false })
  description?: string | null;

  @ApiProperty({
    description: 'Timestamp da última atualização',
    example: '2026-07-29T10:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'ID do usuário que fez a última alteração',
    required: false,
    nullable: true,
  })
  updatedBy?: number | null;
}
