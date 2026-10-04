import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInvestmentDto {
  @ApiProperty({ description: 'ID da campanha para investir' })
  @IsNumber()
  campaignId: number;

  @ApiProperty({ description: 'Valor do investimento', example: 1000.0 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ required: false, description: 'Código de afiliado' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  affiliateCode?: string;
}
