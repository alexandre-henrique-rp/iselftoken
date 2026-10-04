/**
 * DTO para PATCH /admin/configs/:key
 *
 * Recebe apenas o `value` (numérico). A chave vem na URL.
 * Validação de forma — limites de regra de negócio são
 * responsabilidade do chamador/admin.
 */
import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiProperty({
    description: 'Novo valor numérico da configuração',
    example: 0.25,
  })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0, { message: 'O valor deve ser maior ou igual a zero.' })
  value!: number;
}
