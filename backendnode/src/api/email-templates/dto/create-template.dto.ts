import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({
    description: 'Nome legível do template',
    example: 'Confirmação de Reserva',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Slug único em kebab-case',
    example: 'confirmacao-reserva',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug deve conter apenas letras minúsculas, números e hifens (ex: meu-template)',
  })
  slug!: string;

  @ApiProperty({
    description: 'Descrição da finalidade do template',
    example: 'E-mail enviado ao investidor após reserva de tokens',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Assunto do e-mail',
    example: 'Sua reserva de tokens foi confirmada!',
  })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({
    description: 'Corpo do e-mail em formato HTML',
    required: false,
  })
  @IsOptional()
  @IsString()
  htmlTemplate?: string;

  @ApiProperty({
    description: 'Corpo alternativo em texto puro',
    required: false,
  })
  @IsOptional()
  @IsString()
  textTemplate?: string;

  @ApiProperty({
    description: 'JSON Schema das variáveis dinâmicas',
    required: false,
  })
  @IsOptional()
  variablesSchema?: Record<string, any>;
}
