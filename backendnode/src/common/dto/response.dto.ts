/**
 * DTO padrão para todas as respostas da API.
 *
 * Campos:
 * - error: boolean, indica se houve erro.
 * - message: string, mensagem de resposta (sucesso ou erro).
 * - codigo: number, código HTTP/status.
 * - data?: any, payload de sucesso (opcional).
 * - detalhe?: any, detalhes do erro (opcional, apenas se error=true).
 * - total?: number, total de registros (opcional, para listas).
 * - pagina?: number, página atual (opcional, para paginação).
 */
export class ResponseDto<T = any> {
  error: boolean;
  message: string;
  codigo: number;
  data?: T;
  detalhe?: any;
  token?: string;
  refreshToken?: string;
  exp?: number;
  total?: number;
  pagina?: number;
  redirect?: string;

  /**
   * Cria uma resposta de sucesso.
   *
   * Parâmetros:
   * - message: mensagem de sucesso.
   * - codigo: código HTTP (padrão 200).
   * - data: payload (opcional).
   * - total: total de registros (opcional).
   * - pagina: página atual (opcional).
   *
   * Retorno:
   * - ResponseDto configurado como sucesso.
   */
  static success<T>(
    message: string,
    codigo = 200,
    data?: T,
    total?: number,
    pagina?: number,
    redirect?: string,
  ): ResponseDto<T> {
    return {
      error: false,
      message,
      codigo,
      data,
      total,
      pagina,
      redirect,
    };
  }

  /**
   * Cria uma resposta de erro.
   *
   * Parâmetros:
   * - message: mensagem de erro.
   * - codigo: código HTTP (padrão 400).
   * - detalhe: detalhes do erro (opcional).
   *
   * Retorno:
   * - ResponseDto configurado como erro.
   */
  static error(message: string, codigo = 400, detalhe?: any): ResponseDto {
    return {
      error: true,
      message,
      codigo,
      detalhe,
    };
  }
}
