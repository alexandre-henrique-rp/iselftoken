import { ResourceCategory } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO que representa uma única alocação de recurso para uma Campaign.
 * Cada alocação define uma categoria (enum ResourceCategory) e um percentual (1-100).
 * A soma dos percentuais de todas as alocações de uma Campaign deve ser exatamente 100.
 *
 * @param categoria - Categoria da alocação (ex: FUNDADOR, DESENVOLVIMENTO, etc.)
 * @param percentual - Percentual de alocação (1 a 100)
 * @param descricaoCustomizada - Obrigatório apenas quando categoria = CUSTOMIZADO
 *
 * @example
 * { categoria: 'FUNDADOR', percentual: 40 }
 * { categoria: 'CUSTOMIZADO', percentual: 15, descricaoCustomizada: 'Capacitação' }
 */
export class ResourceAllocationDto {
  @ApiProperty({
    enum: ResourceCategory,
    description: 'Categoria da alocação de recurso',
  })
  @IsEnum(ResourceCategory, {
    message:
      'Categoria inválida. Valores aceitos: FUNDADOR, DESENVOLVIMENTO, COMERCIAL, MARKETING, NUVEM, JURIDICO, RESERVA_CAIXA, CUSTOMIZADO',
  })
  categoria!: ResourceCategory;

  @ApiProperty({ description: 'Percentual de alocação (1 a 100)', example: 25 })
  @IsInt({ message: 'Percentual deve ser um número inteiro' })
  @Min(1, { message: 'Percentual mínimo é 1' })
  @Max(100, { message: 'Percentual máximo é 100' })
  percentual!: number;

  @ApiPropertyOptional({
    description:
      'Descrição customizada — obrigatória quando categoria é CUSTOMIZADO',
    maxLength: 120,
    example: 'Capacitação de equipe',
  })
  @IsString({ message: 'Descrição customizada deve ser uma string' })
  @IsOptional()
  @MaxLength(120, {
    message: 'Descrição customizada pode ter no máximo 120 caracteres',
  })
  @ValidateIf((o) => o.categoria === 'CUSTOMIZADO')
  descricaoCustomizada?: string;
}

/**
 * Valida que a soma dos percentuais de um array de ResourceAllocationDto é exatamente 100.
 * Aplica-se ao nível do array (não por item).
 *
 * @param validationOptions - Opções do class-validator
 *
 * @example
 * class CreateNewRoundDto {
 *   @ValidateNested({ each: true })
 *   @Type(() => ResourceAllocationDto)
 *   @ValidateSum100()
 *   resourceAllocations!: ResourceAllocationDto[];
 * }
 */
export function ValidateSum100(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'validateSum100',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: 'A soma das alocações deve ser exatamente 100%.',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          if (!Array.isArray(value)) return false;
          const sum = value.reduce((acc: number, item: unknown) => {
            if (
              item &&
              typeof item === 'object' &&
              'percentual' in item &&
              typeof (item as Record<string, unknown>).percentual === 'number'
            ) {
              return (
                acc + ((item as Record<string, number>).percentual as number)
              );
            }
            return acc;
          }, 0);
          return sum === 100;
        },
        defaultMessage(args: ValidationArguments): string {
          return 'A soma das alocações deve ser exatamente 100%.';
        },
      },
    });
  };
}
