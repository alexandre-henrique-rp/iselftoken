import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Uma instrução de prova de vida e se foi satisfeita. */
export class LivenessInstructionDto {
  @ApiProperty({ example: 'look_left' })
  @IsString()
  @MaxLength(32)
  id!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  satisfied!: boolean;
}

/**
 * Telemetria agregada da prova de vida capturada no cliente. NÃO contém
 * template biométrico (isso é a Fase 5). Persistida para auditoria/Compliance.
 */
export class CreateLivenessTelemetryDto {
  @ApiPropertyOptional({
    description: 'ID do upload biofacial associado a esta captura.',
    example: 123,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  kycProfileId?: number;

  @ApiProperty({ description: 'A gravação foi aceita (sem rejeições).' })
  @IsBoolean()
  passed!: boolean;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  blinkCount?: number;

  @ApiPropertyOptional({ nullable: true, example: false })
  @IsOptional()
  @IsBoolean()
  hasGlasses?: boolean | null;

  @ApiPropertyOptional({ example: 14.2 })
  @IsOptional()
  @IsNumber()
  maxYawDeg?: number;

  @ApiPropertyOptional({ example: 9.7 })
  @IsOptional()
  @IsNumber()
  maxPitchDeg?: number;

  @ApiPropertyOptional({ example: 0.62 })
  @IsOptional()
  @IsNumber()
  landmarkMovement?: number;

  @ApiPropertyOptional({ example: 0.31 })
  @IsOptional()
  @IsNumber()
  avgRelativeMovement?: number;

  @ApiPropertyOptional({ example: 8200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @ApiPropertyOptional({ example: 'video/mp4' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  mimeType?: string;

  @ApiPropertyOptional({ type: [LivenessInstructionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LivenessInstructionDto)
  instructions?: LivenessInstructionDto[];

  @ApiPropertyOptional({
    description: 'Tempo de resposta (ms) por desafio concluído.',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  challengeResponseMs?: { id: string; ms: number }[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rejectionReasons?: string[];

  @ApiPropertyOptional({
    description: 'Suspeita de câmera virtual/injeção (heurística).',
  })
  @IsOptional()
  @IsBoolean()
  injectionSuspicious?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  injectionReasons?: string[];
}
