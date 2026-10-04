import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { IsCpfOrCnpj } from '../../../common/validators/cnpj.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({ description: 'Valor do depósito', example: 100.0 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Descrição do depósito' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class WithdrawDto {
  @ApiProperty({ description: 'Valor do saque', example: 50.0 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Banco destino', example: '001' })
  @IsString()
  banco: string;

  @ApiProperty({ description: 'Agência destino', example: '1234' })
  @IsString()
  agencia: string;

  @ApiProperty({ description: 'Conta destino', example: '12345-6' })
  @IsString()
  conta: string;

  @ApiProperty({ description: 'Tipo da conta', example: 'CORRENTE' })
  @IsString()
  tipoConta: string;

  @ApiProperty({ description: 'Nome do titular' })
  @IsString()
  titular: string;

  @ApiPropertyOptional({ description: 'CPF/CNPJ do titular' })
  @IsOptional()
  @IsCpfOrCnpj()
  cpfCnpj?: string;
}
