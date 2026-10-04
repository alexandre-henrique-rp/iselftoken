/**
 * @description Payload do checkout unificado (PRD Hub v2 item 4.1).
 *
 * O Hub nao precisa entender o dominio — recebe referenceType + referenceId
 * (par polimórfico) e delegates para o modulo certo via listener interno.
 * Para a sprint atual, mantemos o enum legacy durante a fase de transição.
 */
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Tipos de referência aceitos. Mapeamento para enum legado do schema atual:
 * - SUBSCRIPTION -> PaymentPurpose.SUBSCRIPTION
 * - INVESTMENT   -> PaymentPurpose.INVESTMENT
 * - TOKEN_RESERVATION -> PaymentPurpose.TOKEN_RESERVATION
 * - EARLY_ACCESS -> PaymentPurpose.EARLY_ACCESS
 * - P2P_BUY -> PaymentPurpose.P2P_BUY
 *
 * Numa sprint futura (Fase B do PRD), vira `referenceType: string`
 * puro para suportar modulos novos sem migration Prisma.
 */
export enum CheckoutReferenceType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  INVESTMENT = 'INVESTMENT',
  TOKEN_RESERVATION = 'TOKEN_RESERVATION',
  EARLY_ACCESS = 'EARLY_ACCESS',
  P2P_BUY = 'P2P_BUY',
}

/**
 * Dados do pagador enviados para a tela do C6 Checkout. O C6 aceita
 * esses campos para pre-preencher o formulario, aumentando a taxa
 * de conversao (PRD item 3).
 *
 * LGPD: trafega em HTTPS com payload seguro. NUNCA deve ser logado
 * em plaintext pelo Hub.
 */
export class PayerDto {
  @IsString()
  @IsNotEmpty({ message: 'payer.name e obrigatorio' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'payer.document e obrigatorio (CPF ou CNPJ)' })
  document!: string;

  @IsString()
  @IsNotEmpty({ message: 'payer.email e obrigatorio' })
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateCheckoutDto {
  /**
   * Valor em reais (BRL). Sera enviado como amount ao C6 Checkout.
   */
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'amount deve ser numerico com ate 2 casas decimais' },
  )
  @Min(0.01, { message: 'amount minimo de R$ 0,01' })
  amount!: number;

  /**
   * Tipo da referencia (ex: SUBSCRIPTION, INVESTMENT). Aguarda Fase B
   * (polimorfismo) para virar string livre.
   */
  @IsEnum(CheckoutReferenceType, {
    message: 'referenceType invalido',
  })
  referenceType!: CheckoutReferenceType;

  /**
   * ID da entidade referenciada (subscriptionId, investmentId, etc).
   * Mantido como string para comapt futuro com UUIDs (Fase B).
   */
  @IsString()
  @IsNotEmpty({ message: 'referenceId obrigatorio' })
  referenceId!: string;

  /**
   * Dados do pagador (pre-preenche tela do C6).
   */
  @ValidateNested()
  @Type(() => PayerDto)
  @IsObject()
  payer!: PayerDto;

  /**
   * Contexto adicional exibido no checkout (ex: "Plano Premium", "Campanha M9").
   */
  @IsOptional()
  metadata?: Record<string, unknown>;
}
