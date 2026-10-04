import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class NewCodeDto {
  @ApiProperty({
    description: 'codigo para autenticação de 2 fatores',
    example: '12341452',
  })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiProperty({
    description: 'email do usuário',
    example: 'email@email.com',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'URL de redirecionamento',
    example: 'https://exemplo.com',
  })
  @IsNotEmpty({ message: 'URL de redirecionamento é obrigatória' })
  @IsString({ message: 'URL de redirecionamento deve ser uma string' })
  urlRedirect: string;
}
