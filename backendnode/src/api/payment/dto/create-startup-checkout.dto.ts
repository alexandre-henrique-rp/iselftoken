import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsObject, IsOptional, Min } from 'class-validator';
import { PaymentMethodDto } from './create-payment.dto';

export class CreateStartupCheckoutDto {
  @ApiProperty({
    description:
      'Valor TOTAL do checkout consolidado em reais (reserva de tokens + ' +
      'fast track, se contratado). Quando wantsFastTrackReview=true, este ' +
      'valor é rateado entre 2 Payments (TOKEN_RESERVATION + FAST_TRACK_REVIEW) ' +
      'preservando o breakdown em originalAmount/discountAmount/paidAmount.',
    example: 500,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Método escolhido para iniciar o pagamento',
    enum: [PaymentMethodDto.PIX, PaymentMethodDto.CREDIT_CARD],
    default: PaymentMethodDto.PIX,
  })
  @IsOptional()
  @IsEnum([PaymentMethodDto.PIX, PaymentMethodDto.CREDIT_CARD])
  method: PaymentMethodDto.PIX | PaymentMethodDto.CREDIT_CARD =
    PaymentMethodDto.PIX;

  @ApiProperty({
    description:
      'Payload validado do wizard de criação da startup. Inclui `wantsFastTrackReview` ' +
      '(boolean) — quando true, o backend cria 2 Payments (TOKEN_RESERVATION + ' +
      'FAST_TRACK_REVIEW) compartilhando o mesmo PIX/txid. Nunca confiar em ' +
      'founderId/userId vindos deste objeto.',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  payload!: Record<string, unknown> & {
    wantsFastTrackReview?: boolean;
  };
}
