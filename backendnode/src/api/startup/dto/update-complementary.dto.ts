import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsBoolean,
  IsArray,
  Length,
  Min,
  Max,
  IsEnum,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para recursos percentuais (uso_recursos)
 */
export class RecursoPercentual {
  @ApiProperty({ description: 'Descrição do recurso', example: 'Marketing' })
  @IsString()
  @Length(2, 100)
  descricao: string;

  @ApiProperty({ description: 'Percentual (1-100)', example: 30 })
  @IsNumber()
  @Min(1)
  @Max(100)
  percentual: number;
}

/**
 * DTO para tese de negócio
 */
export class TeseNegocio {
  @ApiProperty({
    description: 'Problema que a startup resolve',
    example: 'PMEs têm dificuldade em gerir fluxo de caixa',
  })
  @IsString()
  @Length(10, 2000)
  problema: string;

  @ApiProperty({
    description: 'Solução proposta',
    example: 'Plataforma SaaS de automação financeira',
  })
  @IsString()
  @Length(10, 2000)
  solucao: string;

  @ApiProperty({
    description: 'Modelo de receita',
    example: 'SaaS mensal com planos por tamanho',
  })
  @IsString()
  @Length(10, 2000)
  modeloReceita: string;
}

/**
 * DTO para endereço
 */
export class Endereco {
  @ApiProperty({ description: 'Rua', example: 'Av. Paulista' })
  @IsString()
  @Length(2, 200)
  rua: string;

  @ApiProperty({ description: 'Número', example: '1000' })
  @IsString()
  @Length(1, 50)
  numero: string;

  @ApiPropertyOptional({ description: 'Complemento', example: 'Sala 101' })
  @IsString()
  @IsOptional()
  @Length(0, 100)
  complemento?: string;

  @ApiProperty({ description: 'Bairro', example: 'Bela Vista' })
  @IsString()
  @Length(2, 100)
  bairro: string;

  @ApiProperty({ description: 'Cidade', example: 'São Paulo' })
  @IsString()
  @Length(2, 100)
  cidade: string;

  @ApiProperty({ description: 'UF', example: 'SP' })
  @IsString()
  @Length(2, 2)
  uf: string;

  @ApiProperty({ description: 'CEP', example: '01310-100' })
  @IsString()
  @Length(8, 9)
  cep: string;
}

/**
 * DTO para dividendos e benefícios
 */
export class DividendosBeneficios {
  @ApiProperty({
    description: 'Política de dividendos',
    example: 'Distribuição anual após 3 anos',
  })
  @IsString()
  @Length(10, 2000)
  politicaDividendos: string;

  @ApiProperty({
    description: 'Benefícios para investidores',
    example: 'Acesso a relatórios mensais, direito a voto',
  })
  @IsString()
  @Length(10, 2000)
  beneficiosInvestidores: string;
}

/**
 * @name UpdateComplementaryDto
 * @description DTO para preenchimento de dados complementares da startup.
 *
 * Validações:
 * - recursosPercentuais deve somar exatamente 100
 * - Todos os aceites devem ser true
 * - Status deve ser RESERVATION_PAID ou superior
 */
export class UpdateComplementaryDto {
  @ApiPropertyOptional({
    description: 'Data de lançamento da rodada (YYYY-MM-DD)',
    example: '2024-07-01',
  })
  @IsString()
  @IsOptional()
  @Length(10, 10)
  dataLancamentoRodada?: string;

  @ApiPropertyOptional({
    description: 'ID do arquivo de logo (KYCProfile)',
    example: 6,
  })
  @IsNumber()
  @IsOptional()
  logoFileId?: number;

  @ApiPropertyOptional({
    description: 'Descrição breve (10-150 caracteres)',
    example: 'SaaS financeiro para PMEs',
  })
  @IsString()
  @IsOptional()
  @Length(10, 150)
  descricaoBreve?: string;

  @ApiPropertyOptional({
    description: 'Objetivo da captação',
    example: 'Expandir equipe de vendas e produto',
  })
  @IsString()
  @IsOptional()
  @Length(10, 2000)
  objetivoCaptacao?: string;

  @ApiPropertyOptional({
    description: 'O que espera alcançar com a captação',
    example: 'Aumentar MRR em 50%',
  })
  @IsString()
  @IsOptional()
  @Length(10, 2000)
  esperaAlcancar?: string;

  @ApiPropertyOptional({
    description: 'Recursos percentuais (deve somar 100)',
    type: [RecursoPercentual],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecursoPercentual)
  @IsOptional()
  recursosPercentuais?: RecursoPercentual[];

  @ApiPropertyOptional({ description: 'Tese de negócio', type: TeseNegocio })
  @ValidateNested()
  @Type(() => TeseNegocio)
  @IsOptional()
  teseNegocios?: TeseNegocio;

  @ApiPropertyOptional({ description: 'Endereço completo', type: Endereco })
  @ValidateNested()
  @Type(() => Endereco)
  @IsOptional()
  endereco?: Endereco;

  @ApiPropertyOptional({
    description: 'Dividendos e benefícios',
    type: DividendosBeneficios,
  })
  @ValidateNested()
  @Type(() => DividendosBeneficios)
  @IsOptional()
  dividendosEBeneficios?: DividendosBeneficios;

  @ApiProperty({
    description: 'Aceite dos termos de uso da plataforma',
    example: true,
  })
  @IsBoolean()
  aceiteTermosPlataforma: boolean;

  @ApiProperty({
    description: 'Aceite da política de privacidade',
    example: true,
  })
  @IsBoolean()
  aceitePoliticaPrivacidade: boolean;

  @ApiProperty({
    description: 'Declaração de veracidade das informações',
    example: true,
  })
  @IsBoolean()
  declaracaoVeracidade: boolean;

  // === CAMPOS DE CAPTAÇÃO (BFF: aceitos aqui, redirecionados para Campaign) ===

  @ApiPropertyOptional({
    description: 'Problema que a startup resolve (10-2000 chars)',
  })
  @IsString()
  @IsOptional()
  @Length(10, 2000)
  problema?: string;

  @ApiPropertyOptional({ description: 'Solução proposta (10-2000 chars)' })
  @IsString()
  @IsOptional()
  @Length(10, 2000)
  solucao?: string;

  @ApiPropertyOptional({ description: 'Modelo de receita (10-2000 chars)' })
  @IsString()
  @IsOptional()
  @Length(10, 2000)
  modeloReceita?: string;

  @ApiPropertyOptional({
    description: 'Diferencial competitivo (10-2000 chars)',
  })
  @IsString()
  @IsOptional()
  @Length(10, 2000)
  diferencial?: string;

  @ApiPropertyOptional({ description: 'Mercado alvo (10-2000 chars)' })
  @IsString()
  @IsOptional()
  @Length(10, 2000)
  mercadoAlvo?: string;

  @ApiPropertyOptional({ description: 'Número de sócios' })
  @IsNumber()
  @IsOptional()
  sociosCount?: number;

  @ApiPropertyOptional({
    description: 'Dedicacao do fundador (integral/parcial) (10-200 chars)',
  })
  @IsString()
  @IsOptional()
  @Length(10, 200)
  dedicacao?: string;

  @ApiPropertyOptional({
    description: 'Quem são os compradores (10-2000 chars)',
  })
  @IsString()
  @IsOptional()
  @Length(10, 2000)
  compradores?: string;

  @ApiPropertyOptional({
    description: 'Investimento prévio já realizado (10-2000 chars)',
  })
  @IsString()
  @IsOptional()
  @Length(10, 2000)
  investimentoPrevio?: string;

  @ApiPropertyOptional({
    description: 'Análise de concorrência (10-2000 chars)',
  })
  @IsString()
  @IsOptional()
  @Length(10, 2000)
  concorrencia?: string;
}
