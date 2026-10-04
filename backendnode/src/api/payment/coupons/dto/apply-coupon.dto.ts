/**
 * DTO para aplicação de cupom a um pagamento.
 */
import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsCouponCode } from './coupon-custom-validators';

export class ApplyCouponDto {
  @ApiProperty({
    description: 'Código do cupom de desconto',
    example: 'DESCONTO20',
  })
  @IsString()
  @IsCouponCode()
  couponCode: string;

  @ApiProperty({
    description: 'ID do pagamento ao qual aplicar o cupom',
    example: 123,
  })
  @IsInt()
  @Min(1)
  paymentId: number;
}
