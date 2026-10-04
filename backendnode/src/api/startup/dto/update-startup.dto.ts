import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayUnique,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsUrl,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsCnpj } from '../../../common/validators/cnpj.validator';

// Enum baseado no schema Prisma
export enum StartupStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Classes para objetos aninhados
export class SocioDto {
  @ApiProperty({ description: 'Nome do sócio' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'Percentagem de participação' })
  @IsNumber()
  participacao: number;

  @ApiPropertyOptional({ description: 'Cargo do sócio na startup' })
  @IsString()
  @IsOptional()
  cargo?: string;

  @ApiPropertyOptional({ description: 'URL do perfil LinkedIn' })
  @IsString()
  @IsOptional()
  linkedin?: string;

  @ApiPropertyOptional({ description: 'Biografia do sócio (até 160 chars)' })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  bio?: string;

  @ApiPropertyOptional({ description: 'URL da foto do sócio' })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  fotoUrl?: string;

  @ApiPropertyOptional({
    description: 'Dedicação: "integral" | "parcial" | ""',
  })
  @IsString()
  @IsOptional()
  dedicacao?: string;
}

export class TeamMemberDto {
  @ApiProperty({ description: 'Nome do membro' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'Cargo do membro' })
  @IsString()
  cargo: string;

  @ApiPropertyOptional({ description: 'URL do perfil LinkedIn' })
  @IsString()
  @IsOptional()
  linkedin?: string;

  @ApiPropertyOptional({
    description: 'Dedicação: "integral" | "parcial" | ""',
  })
  @IsString()
  @IsOptional()
  dedicacao?: string;

  @ApiPropertyOptional({ description: 'URL da foto do membro' })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  fotoUrl?: string;
}

export class UsoRecursosDto {
  @ApiProperty({ description: 'Descrição do uso' })
  @IsString()
  descricao: string;

  @ApiProperty({ description: 'Valor destinado' })
  @IsNumber()
  valor: number;
}

export class PaisDto {
  @ApiProperty({ description: 'Nome do país' })
  @IsString()
  nome: string;

  @ApiProperty({ description: 'Código do país' })
  @IsString()
  codigo: string;

  @ApiPropertyOptional({ description: 'Emoji da bandeira do país' })
  @IsString()
  @IsOptional()
  @MaxLength(8)
  emoji?: string;

  @ApiPropertyOptional({ description: 'CEP da sede (apenas dígitos)' })
  @IsString()
  @IsOptional()
  @MaxLength(9)
  cep?: string;

  @ApiPropertyOptional({ description: 'Cidade da sede' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  cidade?: string;

  @ApiPropertyOptional({ description: 'UF da sede (2 letras)' })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  uf?: string;

  @ApiPropertyOptional({ description: 'Logradouro da sede' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  logradouro?: string;

  @ApiPropertyOptional({ description: 'Número da sede' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  numero?: string;

  @ApiPropertyOptional({ description: 'Complemento da sede' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  complemento?: string;

  @ApiPropertyOptional({ description: 'Bairro da sede' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  bairro?: string;
}

export class RedesSociaisDto {
  @ApiPropertyOptional({ description: 'URL HTTPS oficial do LinkedIn' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @IsOptional()
  linkedin?: string;

  @ApiPropertyOptional({ description: 'Facebook' })
  @IsString()
  @IsOptional()
  facebook?: string;

  @ApiPropertyOptional({ description: 'URL HTTPS oficial do Instagram' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @IsOptional()
  instagram?: string;

  @ApiPropertyOptional({ description: 'URL HTTPS oficial do X/Twitter' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @IsOptional()
  twitter?: string;
}

export class UpdateStartupDto {
  /**
   * @deprecated Campo legado — será removido após migração completa.
   * Usar categoryId + areaAtuacaoId (ADR-007).
   */
  @ApiPropertyOptional({
    description:
      '[DEPRECATED] Use categoryId + areaAtuacaoId. Status legado do enum StartupCategory.',
    enum: StartupStatus,
  })
  @IsEnum(StartupStatus)
  @IsOptional()
  @ValidateIf((obj) => Object.keys(obj).length > 0)
  category?: StartupStatus;

  // Dados Básicos
  @ApiPropertyOptional({ description: 'Nome da startup', type: () => String })
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  @MaxLength(255)
  nome?: string;

  @ApiPropertyOptional({
    description: 'Slug único da startup',
    type: () => String,
  })
  @IsString({ message: 'Slug deve ser uma string' })
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Razão social', type: () => String })
  @IsString({ message: 'Razão social deve ser uma string' })
  @IsOptional()
  razao_social?: string;

  @ApiPropertyOptional({ description: 'CNPJ' })
  @IsOptional()
  @IsCnpj({ alphanumeric: true })
  cnpj?: string;

  @ApiPropertyOptional({ description: 'Telefone' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  telefone?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Site' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  site?: string;

  @ApiPropertyOptional({ type: PaisDto, description: 'Dados do país' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PaisDto)
  pais?: PaisDto;

  @ApiPropertyOptional({ type: RedesSociaisDto, description: 'Redes sociais' })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => RedesSociaisDto)
  redes_sociais?: RedesSociaisDto;

  // Pitch
  /**
   * ID da Categoria (filtro de marketplace) — campo opcional na atualização.
   * Ver GET /categories para lista de categorias disponíveis.
   */
  @ApiPropertyOptional({
    description: 'ID da Categoria (filtro marketplace) - ver GET /categories',
    example: 1,
  })
  @IsInt({ message: 'A categoria deve ser um número inteiro.' })
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({
    description:
      'IDs das áreas de atuação; todas devem pertencer à categoria informada.',
    example: [3, 4],
    type: [Number],
  })
  @IsArray({ message: 'As áreas de atuação devem ser uma lista.' })
  @ArrayUnique({ message: 'As áreas de atuação não podem se repetir.' })
  @IsInt({
    each: true,
    message: 'Cada área de atuação deve ser um número inteiro.',
  })
  @Min(1, { each: true, message: 'A área de atuação deve ser positiva.' })
  @IsOptional()
  areaAtuacaoIds?: number[];

  /** Campo legado aceito durante a migração. */
  @ApiPropertyOptional({ deprecated: true, example: 3 })
  @IsInt()
  @Min(1)
  @IsOptional()
  areaAtuacaoId?: number;

  @ApiPropertyOptional({ description: 'Estágio da startup' })
  @IsString()
  @IsOptional()
  estagio?: string;

  @ApiPropertyOptional({ description: 'Descrição da startup' })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Problema resolvido' })
  @IsString()
  @IsOptional()
  problema?: string;

  @ApiPropertyOptional({ description: 'Solução proposta' })
  @IsString()
  @IsOptional()
  solucao?: string;

  @ApiPropertyOptional({ description: 'Modelo de receita' })
  @IsString()
  @IsOptional()
  modelo_receita?: string;

  @ApiPropertyOptional({ description: 'Descritivo básico' })
  @IsString()
  @IsOptional()
  descritivo_basico?: string;

  @ApiPropertyOptional({ description: 'URL do vídeo no YouTube' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  youtube_url?: string;

  // Estrutura
  @ApiPropertyOptional({ type: [SocioDto], description: 'Lista de sócios' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SocioDto)
  socios?: SocioDto[];

  @ApiPropertyOptional({ type: [TeamMemberDto], description: 'Equipe' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  teams?: TeamMemberDto[];

  @ApiPropertyOptional({
    type: [UsoRecursosDto],
    description: 'Uso dos recursos',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UsoRecursosDto)
  uso_recursos?: UsoRecursosDto[];

  // Dados Bancários
  @ApiPropertyOptional({ description: 'Banco' })
  @IsString()
  @IsOptional()
  banco?: string;

  @ApiPropertyOptional({ description: 'Agência' })
  @IsString()
  @IsOptional()
  agencia?: string;

  @ApiPropertyOptional({ description: 'Conta' })
  @IsString()
  @IsOptional()
  conta?: string;

  @ApiPropertyOptional({ description: 'Tipo da conta: corrente ou poupança' })
  @IsString()
  @IsOptional()
  tipo_conta?: string;

  @ApiPropertyOptional({ description: 'Chave PIX' })
  @IsString()
  @IsOptional()
  pix_key?: string;

  @ApiPropertyOptional({ description: 'Titular da conta' })
  @IsString()
  @IsOptional()
  titular?: string;

  // Outros
  @ApiPropertyOptional({ description: 'Data de fundação', type: String })
  @IsString()
  @IsOptional()
  data_fundacao?: string;

  @ApiPropertyOptional({
    description: 'ID do logo (KYCProfile) - relacionamento permanente',
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  logo_id?: number;

  @ApiPropertyOptional({
    description: 'ID do cover/banner (KYCProfile) - relacionamento permanente',
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  cover_id?: number;

  @ApiPropertyOptional({
    description: 'Status da startup',
    enum: StartupStatus,
  })
  @IsEnum(StartupStatus)
  @IsOptional()
  status?: StartupStatus;
}
