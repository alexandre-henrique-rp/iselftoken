/**
 * @description Filtros do extrato de transacoes (PRD item 4.4).
 *
 * - status filtra por PaymentStatus (PAID/PENDING/CANCELED/REFUNDED)
 * - startDate/endDate filtra por createdAt (ISO8601)
 * - referenceType filtra por purpose (legacy ate Fase B do PRD)
 * - limit/offset para paginacao offset-based (PRD nao menciona cursor)
 */
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CheckoutReferenceType } from './create-checkout.dto';

export enum PaymentStatusFilter {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
  REFUNDED = 'REFUNDED',
}

export class ListTransactionsDto {
  @IsOptional()
  @IsEnum(PaymentStatusFilter)
  status?: PaymentStatusFilter;

  @IsOptional()
  @IsDateString({}, { message: 'startDate deve ser ISO8601' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate deve ser ISO8601' })
  endDate?: string;

  @IsOptional()
  @IsEnum(CheckoutReferenceType)
  referenceType?: CheckoutReferenceType;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser inteiro' })
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset deve ser inteiro' })
  @Min(0)
  offset?: number;
}
