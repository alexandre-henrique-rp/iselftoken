/**
 * @name PayloadAf2Type
 * @description Define o payload criptografado usado na validação AF2.
 * @property {string} codigo - Código de verificação AF2 gerado para o usuário.
 * @property {string} path - Caminho de redirecionamento após validação bem-sucedida.
 * @property {string} email - E-mail do usuário associado ao processo de AF2.
 * @property {Date} createdAt - Data/hora de criação do payload para controle de validade.
 * @property {Date} expiresAt - Data/hora de expiração do código AF2.
 *
 * @example
 * const payload: PayloadAf2Type = {
 *   codigo: "123456",
 *   path: "/home",
 *   email: "user@email.com",
 *   createdAt: new Date(),
 *   expiresAt: new Date(Date.now() + 5 * 60 * 1000),
 * };
 *
 * Fluxo de execução:
 * 1. A aplicação gera o payload com dados do usuário.
 * 2. O payload é criptografado e enviado no redirect para /auth.
 * 3. A rota /auth descriptografa e valida os dados de expiração.
 */
export interface PayloadAf2Type {
  /** Código de verificação AF2 gerado para o usuário. */
  codigo: string;
  /** Caminho de redirecionamento após validação bem-sucedida. */
  path: string;
  /** E-mail do usuário associado ao processo de AF2. */
  email: string;
  /** Data/hora de criação do payload para controle de validade. */
  createdAt: Date;
  /** Data/hora de expiração do código AF2. */
  expiresAt: Date;
}
