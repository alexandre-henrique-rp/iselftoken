/**
 * Interface para armazenamento de chaves privadas criptograficas.
 * Implementacoes: VaultProductionKeyStorage (producao) e InMemoryKeyStorage (dev/stub).
 *
 * @interface IKeyStorageService
 * @description Abstrai o acesso a chaves privadas. A chave privada JAMAIS
 * deve ser armazenada em plaintext no banco de dados ou em arquivos
 * sem criptografia. O KeyStorageService garante que a chave seja
 * protegida por criptografia AES-256-GCM.
 */
export interface IKeyStorageService {
  /**
   * Armazena uma chave privada criptografada.
   *
   * @param key - Caminho de referencia (ex: 'iselftoken/pki/root/private')
   * @param privateKeyPem - Chave privada em formato PEM (plaintext original)
   * @returns path - O path onde a chave foi armazenada
   */
  store(key: string, privateKeyPem: string): Promise<string>;

  /**
   * Recupera uma chave privada.
   *
   * @param key - Caminho de referencia (ex: 'iselftoken/pki/root/private')
   * @returns A chave privada em formato PEM (descriptografada)
   * @throws {Error} Se a chave nao for encontrada
   */
  retrieve(key: string): Promise<string>;

  /**
   * Remove uma chave privada.
   *
   * @param key - Caminho de referencia
   */
  delete(key: string): Promise<void>;

  /**
   * Verifica se uma chave existe.
   *
   * @param key - Caminho de referencia
   * @returns true se a chave existe
   */
  exists(key: string): Promise<boolean>;
}
