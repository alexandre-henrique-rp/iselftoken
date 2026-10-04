import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestCodeDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'email@email.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'URL de redirecionamento',
    example: 'https://exemplo.com',
  })
  @IsString()
  @IsOptional()
  urlRedirect?: string;
}
