/**
 * @description Payload do payout (PRD item 4.5).
 *
 * Gera uma chave de idempotência local (endToEndId) para garantir
 * que chamadas duplicadas nao gerem repasses duplicados na API do C6.
 */
import {
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePayoutDto {
  /**
   * Conta bancaria cadastrada para receber o PIX. Aguarda Fase B
   * (Account model UUID-based) para virar FK.
   */
  @IsUUID('4', { message: 'targetAccountId deve ser UUID v4' })
  targetAccountId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'amount minimo de R$ 0,01' })
  amount!: number;

  @IsString()
  @IsNotEmpty({ message: 'description obrigatoria (motivo do repasse)' })
  description!: string;

  /**
   * Opcional: ligacao a uma entidade de dominio (ex: campaignId).
   * Hoje o FundTransfer ja tem referenceId. Mantido opcional para
   * flexibilidade (repasses operacionais sem vinculo direto).
   */
  @IsOptional()
  @IsString()
  referenceId?: string;
}
