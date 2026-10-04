// PSEUDOCÓDIGO
// 1. Criar classe para o payload interno (data) do login
// 2. Criar classe para a resposta completa do login
// 3. Documentar campos com Swagger

import { ApiProperty } from '@nestjs/swagger';

export class LoginDataEntity {
  @ApiProperty({ example: 1, description: 'ID do usuário autenticado' })
  id: number;

  @ApiProperty({
    example: 'email@email.com',
    description: 'Email do usuário autenticado',
  })
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Nome do usuário autenticado',
  })
  nome: string;

  @ApiProperty({ example: 'USER', description: 'Perfil de acesso do usuário' })
  role: string;

  @ApiProperty({ example: true, description: 'Indica se o usuário está ativo' })
  isActive: boolean;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9(com expiração em 30mim)',
    description: 'Token JWT de acesso',
  })
  token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9(com expiração em 7 dias)',
    description: 'Token JWT de renovação',
  })
  refreshToken: string;

  @ApiProperty({
    example: 1769433824,
    description: 'Timestamp de expiração do refresh token',
  })
  exp: number;
}

export class LoginResponseEntity {
  @ApiProperty({ example: false, description: 'Indica se houve erro' })
  error: boolean;

  @ApiProperty({
    example: 'Login realizado com sucesso',
    description: 'Mensagem de retorno',
  })
  message: string;

  @ApiProperty({ example: 200, description: 'Código HTTP da resposta' })
  codigo: number;

  @ApiProperty({ type: LoginDataEntity, description: 'Payload do login' })
  data: LoginDataEntity;
}
