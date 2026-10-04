import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginAuthDto {
  @ApiProperty({
    description: 'Email do usuário cadastrado',
    example: 'email@email.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário cadastrado',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  senha: string;

  @ApiProperty({
    description: 'URL de redirecionamento',
    example: 'https://exemplo.com | opcional',
  })
  @IsNotEmpty({ message: 'URL de redirecionamento é obrigatória' })
  @IsOptional()
  @IsString({ message: 'URL de redirecionamento deve ser uma string' })
  urlRedirect?: string;
}
