import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAuthDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@exemplo.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
  })
  @IsNotEmpty()
  @IsString()
  nome: string;

  @ApiProperty({
    description:
      'Senha do usuário (mínimo 8 caracteres, letra maiúscula + número)',
    example: 'Senha123',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  senha: string;

  @ApiProperty({
    description: 'Confirmação da senha',
    example: 'Senha123',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  senhaConfirmacao: string;

  @ApiProperty({
    description: 'Role do usuário: INVESTOR, FOUNDER ou USER (default)',
    example: 'INVESTOR',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?:
    | 'USER'
    | 'INVESTOR'
    | 'FOUNDER'
    | 'ADMIN'
    | 'FINANCEIRO'
    | 'COMPLIANCE';

  @ApiProperty({
    description: 'Telefone do usuário',
    example: '1234567890',
  })
  @IsNotEmpty()
  @IsString({ message: 'Telefone deve ser uma string' })
  @Transform(({ value }) => value.replace(/\D/g, ''))
  @MinLength(9, { message: 'Telefone deve ter pelo menos 9 caracteres' })
  telefone: string;

  @ApiProperty({
    description: 'Termos e condições aceitos',
    example: true,
  })
  @IsBoolean({ message: 'Termos e condições devem ser booleanos' })
  termosAceitos: boolean;

  @ApiProperty({
    description: 'Política de privacidade aceita',
    example: true,
  })
  @IsBoolean({ message: 'Política de privacidade deve ser booleana' })
  politicaAceita: boolean;

  @ApiProperty({
    description:
      'Campo legado opcional. O código de verificação é sempre gerado pelo servidor.',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Código de verificação deve ser uma string' })
  codigo?: string;

  @ApiProperty({
    description: 'URL de redirecionamento',
    example: 'https://exemplo.com',
  })
  @IsNotEmpty({ message: 'URL de redirecionamento é obrigatória' })
  @IsString({ message: 'URL de redirecionamento deve ser uma string' })
  urlRedirect: string;
}
