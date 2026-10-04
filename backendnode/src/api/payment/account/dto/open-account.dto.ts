import {
  IsString,
  IsEmail,
  IsOptional,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenAccountDto {
  @ApiProperty({
    description: 'CPF ou CNPJ do titular (só dígitos)',
    example: '12345678901',
  })
  @IsString()
  @Matches(/^\d{11}$|^\d{14}$/, {
    message: 'holderDocument deve ser CPF (11) ou CNPJ (14) dígitos',
  })
  holderDocument: string;

  @ApiProperty({
    description: 'Nome completo do titular',
    example: 'João da Silva',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  holderName: string;

  @ApiProperty({
    description: 'E-mail do titular',
    example: 'joao@startup.com',
  })
  @IsEmail()
  holderEmail: string;

  @ApiPropertyOptional({
    description: 'Telefone do titular (10 ou 11 dígitos)',
    example: '11999998888',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'holderPhone deve ter 10 ou 11 dígitos' })
  holderPhone?: string;
}
