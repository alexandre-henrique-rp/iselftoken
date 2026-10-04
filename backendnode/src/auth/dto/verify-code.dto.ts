import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({
    description: 'Código de verificação de 6 dígitos',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  codigo: string;
}
