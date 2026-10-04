import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({
    description: 'Nome para o plano',
    type: () => String,
    example: 'Plano de teste',
  })
  @IsString({ message: 'Nome deve ser uma string' })
  // Nome exibido para o plano
  nome: string;

  @ApiProperty({
    description: 'Slug para o plano',
    type: () => String,
    example: 'plano-teste',
  })
  @IsString({ message: 'Slug deve ser uma string' })
  // Identificador amigável para URL
  slug: string;

  @ApiProperty({
    description: 'Descrição detalhada do plano',
    type: () => String,
    example: 'Descrição do plano',
    required: false,
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  // Texto descritivo do plano
  descricao?: string;

  @ApiProperty({
    description: 'Preço do plano em reais',
    type: () => Number,
    example: 49.9,
    required: false,
  })
  @IsNumber({}, { message: 'Preço deve ser um número' })
  @IsOptional()
  // Valor monetário do plano
  preco: number;

  @ApiProperty({
    description: 'Quantidade de meses de duração do plano',
    type: () => Number,
    example: 12,
  })
  @IsNumber({}, { message: 'Período em meses deve ser um número' })
  // Duração do plano em meses
  periodoMeses: number;

  @ApiProperty({
    description: 'Tipo do período (ex: mensal, anual)',
    type: () => String,
    example: 'anual',
  })
  @IsString({ message: 'Período deve ser uma string' })
  // Nome do período exibido para o usuário
  periodo: string;

  @ApiProperty({
    description: 'Ícone do plano',
    type: () => String,
    example: 'star',
    required: false,
  })
  @IsString({ message: 'Ícone deve ser uma string' })
  @IsOptional()
  // Ícone ou referência visual do plano
  icon?: string;

  @ApiProperty({
    description: 'Benefícios do plano (texto livre)',
    type: () => [String],
    example: ['Benefício 1', 'Benefício 2'],
    required: false,
  })
  @IsArray({ message: 'Benefícios deve ser um array' })
  @IsString({ each: true, message: 'Cada benefício deve ser uma string' })
  @IsOptional()
  // Benefícios apresentados ao usuário
  beneficios?: string[];

  @ApiProperty({
    description: 'Define se o plano é visível para usuários',
    type: () => Boolean,
    example: true,
  })
  @IsBoolean({ message: 'Visível deve ser booleano sendo true ou false' })
  // Indica se o plano aparece nas listagens
  visivel: boolean;

  @ApiProperty({
    description: 'Indica se o plano está ativo no sistema',
    type: () => Boolean,
    example: true,
  })
  @IsBoolean({ message: 'Ativo deve ser booleano sendo true ou false' })
  // Controla se o plano pode ser utilizado
  isActive: boolean;

  @ApiProperty({
    description: 'Indica se o plano é recomendado',
    type: () => Boolean,
    example: false,
  })
  @IsBoolean({ message: 'Recomendado deve ser booleano sendo true ou false' })
  // Marca o plano como destaque
  recomendado: boolean;

  @ApiProperty({
    description: 'Texto do botão de aquisição exibido no /pricing',
    example: 'Começar agora',
    required: false,
    nullable: true,
  })
  @IsString({ message: 'Texto do botão deve ser uma string' })
  @MaxLength(60, { message: 'Texto do botão deve ter no máximo 60 caracteres' })
  @IsOptional()
  textoBotao?: string;
}
