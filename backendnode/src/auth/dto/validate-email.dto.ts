import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ValidateEmailDto {
  @ApiProperty({
    description: 'Email para solicitar token de validação',
    example: 'novo@email.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @ValidateIf((o) => !o.token)
  email?: string;

  @ApiProperty({
    description: 'Token de validação (JWT) recibido por email',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Token deve ser uma string' })
  @ValidateIf((o) => !o.email)
  token?: string;
}
