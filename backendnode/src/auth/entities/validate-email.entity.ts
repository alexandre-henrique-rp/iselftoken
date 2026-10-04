import { ApiProperty } from '@nestjs/swagger';

export class ValidateEmailDataEntity {
  @ApiProperty({
    example: 'Email de validação enviado com sucesso',
    description: 'Mensagem de retorno',
  })
  message: string;

  @ApiProperty({
    example: 'novo@email.com',
    description: 'Email que será validado',
    required: false,
  })
  email?: string;
}

export class ValidateEmailResponseEntity {
  @ApiProperty({ example: false, description: 'Indica se houve erro' })
  error: boolean;

  @ApiProperty({
    example: 'Email validado com sucesso',
    description: 'Mensagem de retorno',
  })
  message: string;

  @ApiProperty({ example: 200, description: 'Código HTTP da resposta' })
  codigo: number;

  @ApiProperty({
    type: ValidateEmailDataEntity,
    description: 'Payload da validação',
    required: false,
  })
  data?: ValidateEmailDataEntity;
}
