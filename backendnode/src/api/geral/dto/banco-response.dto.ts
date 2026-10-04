import { ApiProperty } from '@nestjs/swagger';

export class BancoDto {
  @ApiProperty({ example: '00000000', description: 'ISPB do banco' })
  ispb!: string;

  @ApiProperty({
    example: 1,
    description:
      'Código numérico do banco (febraban). null para entidades como Selic.',
    nullable: true,
  })
  code!: number | null;

  @ApiProperty({ example: 'BCO DO BRASIL S.A.' })
  name!: string;

  @ApiProperty({ example: 'Banco do Brasil S.A.' })
  fullName!: string;
}

export class BancosListResponseDto {
  @ApiProperty({ type: [BancoDto] })
  bancos!: BancoDto[];

  @ApiProperty({ example: 477 })
  total!: number;

  @ApiProperty({
    example: false,
    description: 'true quando vier do cache Redis',
  })
  cached!: boolean;
}
