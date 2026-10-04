import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsUrl,
  IsOptional,
  Length,
  Min,
  IsEnum,
  IsInt,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';
import { IsCnpj } from '../../../common/validators/cnpj.validator';

/**
 * Enum para estágio da startup
 */
export enum EstagioStartup {
  IDEACAO = 'ideacao',
  MVP = 'mvp',
  OPERACAO = 'operacao',
  TRACAO = 'tracao',
  ESCALA = 'escala',
  BREAKEVEN = 'breakeven',
}

/**
 * @name CreateStartupOnboardingDto
 * @description DTO para cadastro básico (onboarding rápido) de uma startup.
 *
 * Fluxo:
 * 1. Valida campos obrigatórios mínimos
 * 2. CNPJ é higienizado (remove caracteres não numéricos)
 * 3. Status inicial: PENDING_RESERVATION_PAYMENT
 * 4. Campos pesados (logo, descrição detalhada, termos) podem ser nulos
 */
export class CreateStartupOnboardingDto {
  @ApiProperty({
    description: 'Razão social (Mín 3 caracteres)',
    example: 'TechNova Tecnologia S.A.',
  })
  @IsString()
  @Length(3, 255)
  razaoSocial!: string;

  @ApiProperty({
    description: 'Nome fantasia (Mín 2 caracteres)',
    example: 'TechNova',
  })
  @IsString()
  @Length(2, 255)
  nomeFantasia!: string;

  @ApiProperty({
    description: 'CNPJ (formatado ou limpo - será higienizado)',
    example: '12.345.678/0001-95',
  })
  @IsCnpj({ alphanumeric: true })
  cnpj!: string;

  @ApiProperty({
    description: 'Data de abertura (Ano ou Data completa)',
    example: '2020',
  })
  @IsString()
  dataAbertura!: string;

  @ApiProperty({ description: 'País em ISO3 (3 caracteres)', example: 'BRA' })
  @IsString()
  @Length(3, 3)
  paisIso3!: string;

  /**
   * ID da Categoria (filtro de marketplace).
   * Representa o agrupamento amplo — ver GET /categories.
   * Ex: 1 (Fintech), 2 (Edtech), etc.
   */
  @ApiProperty({
    description: 'ID da Categoria (filtro marketplace) - ver GET /categories',
    example: 1,
  })
  @IsInt({ message: 'A categoria deve ser um número inteiro.' })
  @Min(1, { message: 'A categoria é obrigatória.' })
  categoryId!: number;

  /**
   * ID da Área de Atuação específica (nicho).
   * Deve pertencer à Categoria informada. Validação cruzada no service (T025).
   * Ex: 3 (Pagamentos/Pix), 8 (Educação Básica), etc.
   */
  @ApiProperty({
    description:
      'IDs das áreas de atuação selecionadas; todas devem pertencer à categoria informada.',
    example: [3, 4],
    type: [Number],
  })
  @IsOptional()
  @IsArray({ message: 'As áreas de atuação devem ser uma lista.' })
  @ArrayNotEmpty({ message: 'Selecione pelo menos uma área de atuação.' })
  @ArrayUnique({ message: 'As áreas de atuação não podem se repetir.' })
  @IsInt({
    each: true,
    message: 'Cada área de atuação deve ser um número inteiro.',
  })
  @Min(1, { each: true, message: 'A área de atuação deve ser positiva.' })
  areaAtuacaoIds?: number[];

  /** Campo legado aceito durante a migração para areaAtuacaoIds. */
  @ApiPropertyOptional({ deprecated: true, example: 3 })
  @IsInt()
  @Min(1)
  @IsOptional()
  areaAtuacaoId?: number;

  @ApiProperty({ description: 'Estágio da startup', enum: EstagioStartup })
  @IsEnum(EstagioStartup)
  estagio!: EstagioStartup;

  @ApiProperty({
    description: 'Descrição curta (3 a 1000 caracteres)',
    example: 'Plataforma SaaS para automação financeira de PMEs.',
  })
  @IsString()
  @Length(3, 1000)
  descricao!: string;

  @ApiPropertyOptional({
    description:
      'ID do arquivo de logo (KYCProfile) - relacionamento permanente',
    example: 6,
  })
  @IsNumber()
  @IsOptional()
  logoFileId?: number;

  @ApiPropertyOptional({
    description: 'URL do vídeo pitch (YouTube)',
    example: 'https://youtube.com/watch?v=abc123',
  })
  @IsString()
  @IsOptional()
  videoPitch?: string;

  @ApiPropertyOptional({
    description: 'Website',
    example: 'https://technova.com.br',
  })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'URL HTTPS oficial do LinkedIn',
    example: 'https://linkedin.com/company/technova',
  })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @IsOptional()
  linkedin?: string;

  @ApiPropertyOptional({
    description: 'URL HTTPS oficial do Instagram',
    example: 'https://instagram.com/technova',
  })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @IsOptional()
  instagram?: string;

  @ApiPropertyOptional({
    description: 'URL HTTPS oficial do X/Twitter',
    example: 'https://x.com/technova',
  })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @IsOptional()
  twitter?: string;

  @ApiProperty({ description: 'Nome do titular da conta bancária' })
  @IsString()
  @Length(2, 255)
  titular!: string;

  @ApiProperty({ description: 'Nome do banco' })
  @IsString()
  @Length(2, 100)
  banco!: string;

  @ApiProperty({ description: 'Código da agência' })
  @IsString()
  @Length(1, 20)
  agencia!: string;

  @ApiProperty({ description: 'Número da conta' })
  @IsString()
  @Length(1, 20)
  conta!: string;

  @ApiProperty({ description: 'Dígito da conta' })
  @IsString()
  @Length(1, 5)
  digito!: string;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ do titular da conta' })
  @IsString()
  @IsOptional()
  documentoTitular?: string;

  @ApiPropertyOptional({ description: 'Chave Pix da conta' })
  @IsString()
  @IsOptional()
  chavePix?: string;

  @ApiPropertyOptional({
    description: 'Tipo da conta: corrente ou poupança',
    example: 'corrente',
  })
  @IsString()
  @IsOptional()
  tipoConta?: string;
}
