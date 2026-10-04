import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'NovaSenha@123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
  })
  senha: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    example: 'NovaSenha@123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'A confirmação da senha é obrigatória' })
  confirmarSenha: string;
}
