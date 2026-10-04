import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Body do endpoint `POST /payment/:id/card`.
 *
 * O `paymentToken` é gerado no navegador pela biblioteca `payment-token-efi`
 * (os dados do cartão NUNCA trafegam pelo backend). O backend recebe apenas
 * o token e as parcelas para criar a cobrança one-step na EFI.
 */
export class ConfirmCardDto {
  @ApiProperty({
    description: 'payment_token gerado no frontend pela lib payment-token-efi',
    example: '47f13d72c883c1547ae4a0df11eb46194f333f85',
  })
  @IsString()
  @IsNotEmpty()
  paymentToken!: string;

  @ApiProperty({
    description: 'Número de parcelas (1 a 18)',
    example: 1,
    minimum: 1,
    maximum: 18,
  })
  @IsInt()
  @Min(1)
  @Max(18)
  installments!: number;

  @ApiPropertyOptional({
    description: 'Máscara do cartão retornada pela lib (ex: XXXXXXXXXXXX3991)',
    example: 'XXXXXXXXXXXX3991',
  })
  @IsOptional()
  @IsString()
  cardMask?: string;

  /**
   * CPF/CNPJ do titular do cartão (informado no formulário de checkout).
   *
   * A EFI exige `customer.cpf` em cobranças one-step (código 3500034
   * `validation_error` quando ausente). Quando o usuário logado NÃO tem
   * `reg_documento` cadastrado no perfil, usamos este campo como fallback
   * — o titular do cartão costuma ser o próprio pagador e o documento já
   * foi validado pela lib `payment-token-efi` durante a tokenização.
   *
   * Sanitizado para dígitos antes do envio.
   */
  @ApiPropertyOptional({
    description:
      'CPF/CNPJ do titular do cartão (fallback para customer.cpf quando ' +
      'o usuário logado não tem reg_documento)',
    example: '94271564656',
  })
  @IsOptional()
  @IsString()
  cardholderDocument?: string;
}
