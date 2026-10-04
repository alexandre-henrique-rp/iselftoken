import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsString } from 'class-validator';

export enum StatusSubscript {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED',
}
export class CreateSubscriptionDto {
  @ApiProperty({ description: 'ID do usuário', example: 1, type: Number })
  @IsNumber({}, { message: 'ID do usuário deve ser um número' })
  @Transform(({ value }) => Number(value))
  userId: number;

  @ApiProperty({ description: 'ID do plano', example: 2, type: Number })
  @IsNumber({}, { message: 'ID do plano deve ser um número' })
  @Transform(({ value }) => Number(value))
  planId: number;

  @ApiProperty({
    description: 'Status da assinatura',
    example: StatusSubscript.PENDING,
    type: String,
    enum: StatusSubscript,
  })
  @IsString({ message: 'Status deve ser uma string' })
  @Transform(({ value }) => value?.toUpperCase())
  @IsEnum(StatusSubscript, { message: 'Status inválido' })
  status: StatusSubscript;
}
