import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { IsCnpj, IsCpfOrCnpj } from '../../../common/validators/cnpj.validator';

/**
 * DTO para dados bancários da startup
 */
export class DadosBancariosDto {
  @ApiProperty({ description: 'Código do banco' })
  @IsString()
  @MaxLength(10)
  banco: string;

  @ApiProperty({ description: 'Tipo da conta (corrente/poupanca)' })
  @IsString()
  @MaxLength(20)
  tipoConta: string;

  @ApiProperty({ description: 'Agência' })
  @IsString()
  @MaxLength(10)
  agencia: string;

  @ApiProperty({ description: 'Número da conta' })
  @IsString()
  @MaxLength(20)
  conta: string;

  @ApiProperty({ description: 'Dígito da conta' })
  @IsString()
  @MaxLength(5)
  digito: string;

  @ApiProperty({ description: 'Nome do titular' })
  @IsString()
  @MaxLength(255)
  titular: string;

  @ApiProperty({ description: 'Documento do titular (CPF/CNPJ)' })
  @IsCpfOrCnpj()
  documentoTitular: string;

  @ApiProperty({ description: 'Chave PIX' })
  @IsString()
  @MaxLength(255)
  chavePix: string;
}

/**
 * DTO para redes sociais da startup
 */
export class RedesSociaisInputDto {
  @ApiPropertyOptional({ description: 'Website' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'LinkedIn' })
  @IsUrl()
  @IsOptional()
  linkedin?: string;

  @ApiPropertyOptional({ description: 'Instagram' })
  @IsUrl()
  @IsOptional()
  instagram?: string;

  @ApiPropertyOptional({ description: 'Twitter/X' })
  @IsUrl()
  @IsOptional()
  twitter?: string;
}

/**
 * DTO para objeto país completo
 */
export class PaisDto {
  @ApiProperty({ description: 'ID do país', example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'Nome do país', example: 'Brazil' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Nome nativo', example: 'Brasil' })
  @IsString()
  native: string;

  @ApiProperty({ description: 'Código ISO2', example: 'BR' })
  @IsString()
  @Length(2, 2)
  iso2: string;

  @ApiProperty({ description: 'Código ISO3', example: 'BRA' })
  @IsString()
  @Length(3, 3)
  iso3: string;

  @ApiProperty({ description: 'Emoji da bandeira', example: '🇧🇷' })
  @IsString()
  emoji: string;

  @ApiProperty({ description: 'Código da moeda', example: 'BRL' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Nome da moeda', example: 'Brazilian Real' })
  @IsString()
  currencyName: string;

  @ApiProperty({ description: 'Símbolo da moeda', example: 'R$' })
  @IsString()
  currencySymbol: string;

  @ApiProperty({ description: 'Código de telefone', example: '55' })
  @IsString()
  phonecode: string;
}

/**
 * @name CreateStartupInitialDto
 * @description DTO para criação inicial de uma startup.
 * Recebe dados básicos para cadastro. O cliente completa os demais dados posteriormente.
 *
 * Fluxo:
 * 1. Valida campos obrigatórios
 * 2. Mapeia dados bancários para campos individuais
 * 3. Usa objeto país completo
 * 4. Gera slug automaticamente a partir do nome
 */
export class CreateStartupInitialDto {
  @ApiProperty({ description: 'Nome da startup', example: 'TechNova' })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiProperty({
    description: 'Razão social',
    example: 'TechNova Tecnologia S.A.',
  })
  @IsString()
  @MaxLength(255)
  razaoSocial: string;

  @ApiProperty({
    description: 'CNPJ (14 dígitos ou alfanumérico)',
    example: '12345678000195',
  })
  @IsCnpj({ alphanumeric: true })
  cnpj: string;

  @ApiProperty({ description: 'Objeto país completo', type: PaisDto })
  @IsObject()
  pais: PaisDto;

  @ApiProperty({ description: 'Área de atuação', example: 'Tecnologia / SaaS' })
  @IsString()
  @MaxLength(255)
  areaAtuacao: string;

  @ApiProperty({ description: 'Estágio da startup', example: 'seed' })
  @IsString()
  @MaxLength(50)
  estagio: string;

  @ApiProperty({
    description: 'Descrição da startup',
    example: 'Plataforma SaaS para automação de processos financeiros de PMEs.',
  })
  @IsString()
  descricao: string;

  @ApiPropertyOptional({
    description: 'Total de tokens a emitir',
    example: 100000,
  })
  @IsNumber()
  @IsOptional()
  totalTokens?: number;

  @ApiPropertyOptional({
    description: 'Prazo de captação em dias',
    example: 90,
  })
  @IsNumber()
  @IsOptional()
  prazoCapitacao?: number;

  @ApiProperty({ description: 'ID da imagem do logo (KYCProfile)', example: 6 })
  @IsNumber()
  logo: number;

  @ApiPropertyOptional({
    description: 'ID do pitch deck (KYCProfile)',
    example: 3,
  })
  @IsNumber()
  @IsOptional()
  pitchDeck?: number;

  @ApiPropertyOptional({
    description: 'URL do vídeo pitch',
    example: 'https://www.youtube.com/watch?v=abc123',
  })
  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  videoPitch?: string;

  @ApiPropertyOptional({
    description: 'Redes sociais',
    type: RedesSociaisInputDto,
  })
  @IsObject()
  @IsOptional()
  redesSociais?: RedesSociaisInputDto;

  @ApiPropertyOptional({
    description: 'Dados bancários',
    type: DadosBancariosDto,
  })
  @IsObject()
  @IsOptional()
  dadosBancarios?: DadosBancariosDto;
}
