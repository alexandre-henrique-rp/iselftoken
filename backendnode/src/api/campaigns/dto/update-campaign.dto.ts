/**
 * DTO para atualizar uma Campaign existente.
 * Campos editáveis: title, deadline, description.
 * Alocações de recursos (resourceAllocations) são opcionais no update — se
 * informadas, substituem todas as alocações existentes da campanha.
 *
 * S01.2a: removidos `@Min` hardcoded de campos numericos (faturamentoMinimoLucros,
 * sociosCount). Validacao de REGRA migrara para SystemConfig no service em S01.2b.
 * Mantidos: `@IsNumber`/`@IsInt` (forma) e `@MaxLength`/`@MinLength` em textos.
 */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ResourceAllocationDto,
  ValidateSum100,
} from './resource-allocation.dto';

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Título da campanha', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ description: 'Data limite da campanha' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;

  @ApiPropertyOptional({ description: 'Descrição da campanha', maxLength: 280 })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  // === CAMPOS FINANCEIROS (S01.2b - editaveis em DRAFT) ===
  // Validacao de REGRA (min/max) delegada para SystemConfig via service.
  // DTO valida apenas FORMA (numero positivo, inteiro).

  @ApiPropertyOptional({
    description:
      'Meta de captacao (R$). Editavel apenas em campanhas DRAFT. Limites via SystemConfig.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  targetAmount?: number;

  @ApiPropertyOptional({
    description:
      'Investimento minimo (R$). Editavel apenas em campanhas DRAFT.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  minInvestment?: number;

  @ApiPropertyOptional({
    description:
      'Total de tokens emitidos. Editavel apenas em campanhas DRAFT. Limites via SystemConfig.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  totalTokens?: number;

  @ApiPropertyOptional({
    type: [ResourceAllocationDto],
    description:
      'Alocação de recursos por categoria. Substitui todas as alocações existentes. Soma deve ser 100%.',
    example: [
      { categoria: 'FUNDADOR', percentual: 50 },
      { categoria: 'COMERCIAL', percentual: 50 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Deve haver pelo menos 1 alocação de recurso' })
  @ValidateNested({ each: true })
  @Type(() => ResourceAllocationDto)
  @ValidateSum100()
  @IsOptional()
  resourceAllocations?: ResourceAllocationDto[];

  // === CAMPOS CVM/COMPLIANCE (M7-S22) ===

  @ApiPropertyOptional({
    description: 'Data de lançamento da rodada (ISO 8601)',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Data de lançamento deve ser uma data válida (ISO 8601).' },
  )
  dataLancamentoRodada?: string;

  @ApiPropertyOptional({
    description: 'Objetivo da captação (10-2000 caracteres)',
  })
  @IsOptional()
  @MinLength(10, {
    message: 'Objetivo da captação deve ter no mínimo 10 caracteres.',
  })
  @MaxLength(2000, {
    message: 'Objetivo da captação deve ter no máximo 2000 caracteres.',
  })
  @IsString()
  objetivoCaptacao?: string;

  @ApiPropertyOptional({
    description: 'O que espera alcançar com a captação (10-2000 caracteres)',
  })
  @IsOptional()
  @MinLength(10, {
    message: 'O que espera alcançar deve ter no mínimo 10 caracteres.',
  })
  @MaxLength(2000, {
    message: 'O que espera alcançar deve ter no máximo 2000 caracteres.',
  })
  @IsString()
  oQueEsperaAlcancar?: string;

  @ApiPropertyOptional({ description: 'Participação nos lucros' })
  @IsOptional()
  @IsBoolean()
  participacaoLucros?: boolean;

  @ApiPropertyOptional({
    description: 'Faturamento mínimo para participação nos lucros',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  faturamentoMinimoLucros?: number;

  @ApiPropertyOptional({
    description:
      'Política de participação nos lucros em texto livre (10-2000 chars). ' +
      'Obrigatória quando `participacaoLucros=true`.',
  })
  @IsOptional()
  @MinLength(10, {
    message: 'Política de lucros deve ter no mínimo 10 caracteres.',
  })
  @MaxLength(2000, {
    message: 'Política de lucros deve ter no máximo 2000 caracteres.',
  })
  @ValidateIf((o: any) => o.participacaoLucros === true)
  @IsString()
  politicaLucros?: string;

  @ApiPropertyOptional({ description: 'Há benefícios adicionais' })
  @IsOptional()
  @IsBoolean()
  beneficiosAdicionais?: boolean;

  @ApiPropertyOptional({
    description: 'Descrição dos benefícios adicionais (10-4000 caracteres)',
  })
  @IsOptional()
  @MinLength(10, {
    message: 'Descrição dos benefícios deve ter no mínimo 10 caracteres.',
  })
  @MaxLength(4000, {
    message: 'Descrição dos benefícios deve ter no máximo 4000 caracteres.',
  })
  @ValidateIf((o: any) => o.beneficiosAdicionais === true)
  @IsString()
  beneficiosDescricao?: string;

  @ApiPropertyOptional({ description: 'Aceite do termo de repasse' })
  @IsOptional()
  @IsBoolean()
  aceiteTermoRepasse?: boolean;

  @ApiPropertyOptional({
    description: 'Declaração de veracidade das informações',
  })
  @IsOptional()
  @IsBoolean()
  declaracaoVeracidade?: boolean;

  // BUG-FT-008 — Programa de Afiliados (Sprint S04): campo persistia via
  // `create-new-round.dto.ts` mas updateDraft (PATCH /:id/draft) não o
  // declarava nem o propagava no spread de `prisma.campaign.update`,
  // resultando em descarte silencioso. Adicionado para corrigir a tela
  // /founder/startups/:id/captacao/retornos (aceitaAfiliados + 5/10%).
  @ApiPropertyOptional({
    description:
      'Comissão do afiliado por investimento confirmado (%). 0 = sem programa ' +
      'de afiliados; 5 ou 10 quando aceito. Congelada após a ativação da rodada.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  affiliateCommissionPct?: number;

  // === CAMPOS DE CAPTAÇÃO (realocados de Startup → Campaign) ===

  @ApiPropertyOptional({
    description: 'Problema que a startup resolve (10-2000 chars)',
  })
  @IsOptional()
  @MinLength(10, { message: 'Problema deve ter no mínimo 10 caracteres.' })
  @MaxLength(2000, { message: 'Problema deve ter no máximo 2000 caracteres.' })
  @IsString()
  problema?: string;

  @ApiPropertyOptional({ description: 'Solução proposta (10-2000 chars)' })
  @IsOptional()
  @MinLength(10, { message: 'Solução deve ter no mínimo 10 caracteres.' })
  @MaxLength(2000, { message: 'Solução deve ter no máximo 2000 caracteres.' })
  @IsString()
  solucao?: string;

  @ApiPropertyOptional({ description: 'Modelo de receita (10-2000 chars)' })
  @IsOptional()
  @MinLength(10, {
    message: 'Modelo de receita deve ter no mínimo 10 caracteres.',
  })
  @MaxLength(2000, {
    message: 'Modelo de receita deve ter no máximo 2000 caracteres.',
  })
  @IsString()
  modeloReceita?: string;

  @ApiPropertyOptional({
    description: 'Diferencial competitivo (10-2000 chars)',
  })
  @IsOptional()
  @MinLength(10, { message: 'Diferencial deve ter no mínimo 10 caracteres.' })
  @MaxLength(2000, {
    message: 'Diferencial deve ter no máximo 2000 caracteres.',
  })
  @IsString()
  diferencial?: string;

  @ApiPropertyOptional({ description: 'Mercado alvo (10-2000 chars)' })
  @IsOptional()
  @MinLength(10, { message: 'Mercado alvo deve ter no mínimo 10 caracteres.' })
  @MaxLength(2000, {
    message: 'Mercado alvo deve ter no máximo 2000 caracteres.',
  })
  @IsString()
  mercadoAlvo?: string;

  @ApiPropertyOptional({ description: 'Número de sócios' })
  @IsOptional()
  @IsInt()
  sociosCount?: number;

  @ApiPropertyOptional({
    description: 'Dedicacao do fundador (integral/parcial) (2-200 chars)',
  })
  @IsOptional()
  @MinLength(2, { message: 'Dedicacao deve ter no mínimo 2 caracteres.' })
  @MaxLength(200, { message: 'Dedicacao deve ter no máximo 200 caracteres.' })
  @IsString()
  dedicacao?: string;

  @ApiPropertyOptional({
    description: 'Quem são os compradores (10-2000 chars)',
  })
  @IsOptional()
  @MinLength(10, { message: 'Compradores deve ter no mínimo 10 caracteres.' })
  @MaxLength(2000, {
    message: 'Compradores deve ter no máximo 2000 caracteres.',
  })
  @IsString()
  compradores?: string;

  @ApiPropertyOptional({
    description: 'Investimento prévio já realizado (10-2000 chars)',
  })
  @IsOptional()
  @MinLength(10, {
    message: 'Investimento prévio deve ter no mínimo 10 caracteres.',
  })
  @MaxLength(2000, {
    message: 'Investimento prévio deve ter no máximo 2000 caracteres.',
  })
  @IsString()
  investimentoPrevio?: string;

  @ApiPropertyOptional({
    description: 'Análise de concorrência (10-2000 chars)',
  })
  @IsOptional()
  @MinLength(10, { message: 'Concorrência deve ter no mínimo 10 caracteres.' })
  @MaxLength(2000, {
    message: 'Concorrência deve ter no máximo 2000 caracteres.',
  })
  @IsString()
  concorrencia?: string;
}
