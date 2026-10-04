import { ApiProperty } from '@nestjs/swagger';

export class CnpjLookupResponseDto {
  @ApiProperty({
    example: '33000167000101',
    description: 'CNPJ apenas com dígitos',
  })
  cnpj!: string;

  @ApiProperty({ example: 'PETROLEO BRASILEIRO S A PETROBRAS' })
  razaoSocial!: string;

  @ApiProperty({ example: 'PETROBRAS - EDISE' })
  nomeFantasia!: string;

  @ApiProperty({
    example: 1967,
    description: 'Ano extraído de data_inicio_atividade da Receita',
    required: false,
  })
  anoFundacao?: number;

  @ApiProperty({
    example: 'ATIVA',
    description:
      'Situação cadastral da empresa: ATIVA, BAIXADA, SUSPENSA, INAPTA, NULA',
    required: false,
  })
  situacaoCadastral?: string;

  @ApiProperty({
    example: true,
    description:
      'true quando situacaoCadastral === "ATIVA". Frontend deve bloquear cadastro se false.',
  })
  ativa!: boolean;

  @ApiProperty({ example: 'RIO DE JANEIRO', required: false })
  cidade?: string;

  @ApiProperty({ example: 'RJ', required: false })
  uf?: string;

  @ApiProperty({ example: '20031170', required: false })
  cep?: string;

  @ApiProperty({ example: 'AVENIDA REPUBLICA DO CHILE', required: false })
  logradouro?: string;

  @ApiProperty({ example: '65', required: false })
  numero?: string;

  @ApiProperty({ example: 'ANDAR 17', required: false })
  complemento?: string;

  @ApiProperty({ example: 'CENTRO', required: false })
  bairro?: string;

  @ApiProperty({
    example: 'Extração de petróleo e gás natural',
    description: 'Descrição do CNAE fiscal principal',
    required: false,
  })
  cnaeDescricao?: string;

  @ApiProperty({
    example: 'DEMAIS',
    description: 'Porte da empresa: MEI, ME, EPP, DEMAIS',
    required: false,
  })
  porte?: string;

  @ApiProperty({
    example: false,
    description: 'true quando o resultado veio do cache Redis (não da Receita)',
  })
  cached!: boolean;
}
