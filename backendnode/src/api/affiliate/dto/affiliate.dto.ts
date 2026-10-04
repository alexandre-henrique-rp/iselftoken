import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

/** Adesao da startup ao programa (etapa 1, enviada pelo fundador). */
export class CreateAffiliateProgramDto {
  @ApiPropertyOptional({
    description:
      'Percentual sugerido de comissao ao afiliado. Se omitido usa o default de FinanceConfig. Sujeito a ajuste da admin na aprovacao.',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  affiliateCommissionPct?: number;

  @ApiPropertyOptional({
    description: 'Percentual sugerido de comissao a iSelfToken.',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformCommissionPct?: number;

  @ApiPropertyOptional({
    description: 'Teto de afiliados ativos simultaneos. Null = sem limite.',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAffiliates?: number;
}

/** Decisao da admin sobre a adesao da startup (etapa 1). */
export class DecideAffiliateProgramDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' })
  @IsString()
  decision: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    description:
      'Percentual ao afiliado fixado na aprovacao. Prevalece sobre o sugerido pelo fundador.',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  affiliateCommissionPct?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformCommissionPct?: number;

  @ApiPropertyOptional({ description: 'Obrigatorio quando decision=REJECTED.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/** Decisao do fundador (etapa 2) ou da admin (etapa 3) sobre uma candidatura. */
export class DecideAffiliationDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' })
  @IsString()
  decision: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Obrigatorio quando decision=REJECTED.' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Etapa 2 (fundador): quantidade de tokens alocada ao afiliado para venda. ' +
      'Obrigatorio quando o fundador aprova; validado contra os tokens disponiveis.',
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  tokensAllocated?: number;
}

/** Registro de clique no link de indicacao. */
export class TrackReferralDto {
  @ApiProperty({ description: 'Codigo do afiliado.', example: 'AFL-7QK2M9' })
  @IsString()
  @Length(3, 32)
  code: string;
}

/** Atualizacao do status de uma comissao pela area financeira. */
export class UpdateCommissionStatusDto {
  @ApiProperty({ enum: ['PAYABLE', 'PAID', 'CANCELED'], example: 'PAYABLE' })
  @IsString()
  status: 'PAYABLE' | 'PAID' | 'CANCELED';

  @ApiPropertyOptional({
    description:
      'Ao marcar PAID, credita o valor na carteira do afiliado. Default true.',
  })
  @IsOptional()
  @IsBoolean()
  creditWallet?: boolean;
}
