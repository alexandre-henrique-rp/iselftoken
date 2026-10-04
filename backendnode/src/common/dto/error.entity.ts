import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO padrão para respostas de erro da API.
 */
export class ErrorEntity {
  @ApiProperty({
    description: 'Indica se houve erro',
    example: true,
  })
  error: boolean;

  @ApiProperty({
    description: 'Mensagem de erro',
    example: 'Erro de validação',
  })
  message: string;

  @ApiProperty({
    description: 'Código HTTP/status',
    example: 400,
  })
  codigo: number;

  @ApiProperty({
    description: 'Detalhes do erro (opcional)',
    required: false,
  })
  detalhe?: any;

  @ApiProperty({
    description: 'Total de registros (opcional, apenas para listas)',
    required: false,
  })
  total?: number;

  @ApiProperty({
    description: 'Página atual (opcional, apenas para paginação)',
    required: false,
  })
  pagina?: number;
}
