import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ResourceAllocationDto } from './resource-allocation.dto';

/**
 * DTO de entrada para substituicao completa das alocacoes de recursos de uma campanha.
 *
 * @example
 * { resourceAllocations: [{ categoria: 'FUNDADOR', percentual: 40 }, { categoria: 'DESENVOLVIMENTO', percentual: 60 }] }
 */
export class UpdateResourcesDto {
  @ApiProperty({
    type: [ResourceAllocationDto],
    description: 'Array de alocacoes de recurso (soma deve ser 100%)',
  })
  @IsArray({ message: 'resourceAllocations deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => ResourceAllocationDto)
  resourceAllocations!: ResourceAllocationDto[];
}
