import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ResponseEntity {
  @ApiProperty({
    description: 'Indica se houve erro',
    example: false,
  })
  @IsBoolean()
  error: boolean;

  @ApiProperty({
    description: 'Mensagem de resposta',
    example: 'mensagem',
  })
  message: string;

  @ApiProperty({
    description: 'Código de resposta',
    example: 200,
  })
  codigo: number;

  @ApiProperty({
    description: 'Dados da resposta',
    example: {},
  })
  data?: any;

  @ApiProperty({
    description: 'Detalhes do erro',
    example: {},
  })
  detalhe?: any;
}
