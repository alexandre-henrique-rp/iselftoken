import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DataChangeField } from '@prisma/client';

/**
 * DTO para criação de solicitação de alteração de dados bloqueados.
 *
 * Usado pelo fundador para solicitar alteração de CNPJ, Razão Social ou País
 * após rodada de investimento.
 */
export class CreateDataChangeRequestDto {
  @ApiProperty({
    description: 'Campo bloqueado a ser alterado',
    enum: DataChangeField,
    example: DataChangeField.CNPJ,
  })
  @IsEnum(DataChangeField)
  @IsNotEmpty({ message: 'field é obrigatório' })
  field!: DataChangeField;

  @ApiProperty({
    description: 'Novo valor solicitado para o campo',
    example: '12345678000199',
  })
  @IsString()
  @IsNotEmpty({ message: 'requestedValue é obrigatório' })
  @MinLength(1, { message: 'requestedValue não pode ser vazio' })
  requestedValue!: string;
}
