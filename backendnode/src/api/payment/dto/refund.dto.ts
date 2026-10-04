import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RefundDto {
  @ApiProperty({ description: 'Valor a ser estornado (parcial ou total)' })
  @IsNumber()
  @Min(0.01, { message: 'amount deve ser maior que 0' })
  amount: number;

  @ApiProperty({ description: 'Motivo do estorno (min 5, max 500 caracteres)' })
  @IsString()
  @MinLength(5, { message: 'reason deve ter no mínimo 5 caracteres' })
  @MaxLength(500, { message: 'reason deve ter no máximo 500 caracteres' })
  reason: string;

  @ApiPropertyOptional({
    description: 'endToEndId EFI para devolução PIX (opcional)',
  })
  @IsOptional()
  @IsString()
  endToEndId?: string;
}
