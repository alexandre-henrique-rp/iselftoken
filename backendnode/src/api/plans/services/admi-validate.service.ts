import { HttpException } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PayloadEntity } from 'src/common/entities/payload.entity';

export class AdminValidateService {
  constructor() {}

  /**
   * @name validate
   * @description Valida se o usuário possui permissão de administrador.
   * @param {PayloadEntity} user - Payload autenticado contendo o role do usuário
   * @returns {void} Não retorna valor quando a validação passa
   * @throws {HttpException} Lança erro 401 quando o usuário não é ADMIN
   * @example // Retorno positivo
   * // Sem retorno (não lança exceção)
   * @example // Retorno negativo
   * // HttpException: Acesso restrito para administradores
   *
   * 1. Extrai o role do usuário autenticado.
   * 2. Verifica se o role é ADMIN.
   * 3. Se não for ADMIN, lança exceção com resposta padronizada.
   */
  validate(user: PayloadEntity): void {
    // 1. Extrai o perfil do usuário para validação de acesso
    const { role } = user;

    // 2. Regra de negócio: apenas ADMIN pode acessar esta ação
    if (role !== 'ADMIN') {
      // 3. Bloqueia acesso e retorna erro padronizado
      throw new HttpException(
        ResponseDto.error('Acesso restrito para administradores', 401),
        401,
      );
    }
  }
}
