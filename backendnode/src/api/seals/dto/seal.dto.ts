import { ApiProperty } from '@nestjs/swagger';

export class SealCatalogItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'acelerada' })
  slug: string;

  @ApiProperty({ example: 'Acelerada' })
  name: string;

  @ApiProperty({
    required: false,
    example: 'Startup acelerada por programa parceiro',
  })
  description?: string;

  @ApiProperty({ example: '/icons/acelerada.png' })
  imagePath: string;

  @ApiProperty({
    enum: ['STAGE', 'VERIFICATION', 'PARTNERSHIP', 'ACHIEVEMENT', 'CUSTOM'],
  })
  category: string;
}

export class StartupSealDto extends SealCatalogItemDto {
  @ApiProperty({ example: '2026-05-07T12:00:00Z' })
  issuedAt: string;

  @ApiProperty({
    required: false,
    example: { id: 1, nome: 'Admin' },
    description: 'NULL quando atribuído automaticamente',
  })
  issuedBy?: { id: number; nome: string } | null;
}

export class CreateSealDto {
  @ApiProperty({ example: 'novo_selo', description: 'snake_case, único' })
  slug: string;

  @ApiProperty({ example: 'Novo Selo' })
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({
    enum: ['STAGE', 'VERIFICATION', 'PARTNERSHIP', 'ACHIEVEMENT', 'CUSTOM'],
    default: 'CUSTOM',
  })
  category?:
    | 'STAGE'
    | 'VERIFICATION'
    | 'PARTNERSHIP'
    | 'ACHIEVEMENT'
    | 'CUSTOM';
}

export class UpdateSealDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  active?: boolean;
}

export class AssignSealDto {
  @ApiProperty({ example: 'acelerada' })
  sealSlug: string;

  @ApiProperty({ required: false })
  metadata?: Record<string, unknown>;
}
