import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteStartupDto {
  @ApiProperty({
    description: 'Motivo da exclusao (minimo 10 caracteres)',
    example:
      'Startup duplicada - mesma empresa registrada duas vezes no sistema',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'Motivo deve ter pelo menos 10 caracteres' })
  reason: string;
}
