import * as jose from "jose";

/**
 * Chave secreta para criptografia de payload
 * Em produção, deve vir de variável de ambiente
 */
const getPayloadSecret = () => {
  const secret = process.env.COOKIE_SECRET || "default-secret-key-change-me-32chars";
  return new TextEncoder().encode(secret);
};

/**
 * Payload de transação (estrutura base)
 */
export interface TransactionPayload {
  userId: number;
  transactionId: string;
  amount: string;
  type: "BUY" | "SELL" | "TRANSFER";
  timestamp: number;
  [key: string]: unknown;
}

/**
 * @name encryptTransactionPayload
 * @description Criptografa um payload de transação usando JWT (JWE).
 * Não expõe dados sensíveis - o payload é totalmente criptografado.
 *
 * @param payload - Dados da transação a serem criptografados
 * @returns Hash/token criptografado
 *
 * @example
 * const hash = await encryptTransactionPayload({
 *   userId: 1,
 *   transactionId: "tx_123",
 *   amount: "100.00",
 *   type: "BUY",
 *   timestamp: Date.now()
 * });
 */
export async function encryptTransactionPayload(
  payload: TransactionPayload
): Promise<string> {
  const secret = getPayloadSecret();

  const jwe = await new jose.EncryptJWT({ payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("1h") // Transações expiram em 1 hora
    .setJti(crypto.randomUUID()) // ID único para a transação
    .encrypt(secret);

  return jwe;
}

/**
 * @name decryptTransactionPayload
 * @description Descriptografa um payload de transação.
 *
 * @param encryptedPayload - Hash/token criptografado
 * @returns Payload original ou null se inválido/expirado
 *
 * @example
 * const payload = await decryptTransactionPayload(hash);
 * if (payload) {
 *   console.log(payload.transactionId);
 * }
 */
export async function decryptTransactionPayload(
  encryptedPayload: string
): Promise<TransactionPayload | null> {
  try {
    const secret = getPayloadSecret();
    const { payload } = await jose.jwtDecrypt(encryptedPayload, secret);
    return payload.payload as TransactionPayload;
  } catch {
    return null;
  }
}

/**
 * @name generateTransactionHash
 * @description Gera um hash único para identificação de transação.
 * Útil para rastreamento sem expor dados sensíveis.
 *
 * @param transactionId - ID da transação
 * @param userId - ID do usuário
 * @returns Hash único da transação
 */
export async function generateTransactionHash(
  transactionId: string,
  userId: number
): Promise<string> {
  const data = `${transactionId}:${userId}:${Date.now()}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

// ============================================
// Funções Genéricas de Criptografia
// ============================================

/**
 * Opções para criptografia genérica
 */
export interface EncryptOptions {
  /** Tempo de expiração (formato jose: "1h", "7d", "30m", etc.) */
  expiresIn?: string;
  /** Incluir ID único (jti) */
  includeJti?: boolean;
}

/**
 * @name encryptPayload
 * @description Criptografa qualquer payload usando JWT (JWE).
 * Função genérica que aceita qualquer tipo de dados.
 *
 * @param data - Dados a serem criptografados (qualquer tipo)
 * @param options - Opções de criptografia
 * @returns Hash/token criptografado
 *
 * @example
 * // Criptografar objeto simples
 * const hash = await encryptPayload({ userId: 1, action: "verify" });
 *
 * // Com tempo de expiração customizado
 * const hash = await encryptPayload(
 *   { code: "123456", email: "user@email.com" },
 *   { expiresIn: "15m" }
 * );
 *
 * // Sem expiração (cuidado!)
 * const hash = await encryptPayload(data, { expiresIn: undefined });
 */
export async function encryptPayload<T>(
  data: T,
  options: EncryptOptions = {}
): Promise<string> {
  const { expiresIn = "1h", includeJti = true } = options;
  const secret = getPayloadSecret();

  let jwt = new jose.EncryptJWT({ data })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt();

  if (expiresIn) {
    jwt = jwt.setExpirationTime(expiresIn);
  }

  if (includeJti) {
    jwt = jwt.setJti(crypto.randomUUID());
  }

  return jwt.encrypt(secret);
}

/**
 * @name decryptPayload
 * @description Descriptografa um payload genérico.
 *
 * @param encrypted - Hash/token criptografado
 * @returns Dados originais ou null se inválido/expirado
 *
 * @example
 * const data = await decryptPayload<{ userId: number }>(hash);
 * if (data) {
 *   console.log(data.userId);
 * }
 */
export async function decryptPayload<T>(encrypted: string): Promise<T | null> {
  try {
    const secret = getPayloadSecret();
    const { payload } = await jose.jwtDecrypt(encrypted, secret);
    return payload.data as T;
  } catch {
    return null;
  }
}

/**
 * @name isPayloadValid
 * @description Verifica se um payload criptografado é válido (não expirado).
 *
 * @param encrypted - Hash/token criptografado
 * @returns true se válido, false se inválido ou expirado
 *
 * @example
 * if (await isPayloadValid(hash)) {
 *   // Token ainda é válido
 * }
 */
export async function isPayloadValid(encrypted: string): Promise<boolean> {
  const result = await decryptPayload(encrypted);
  return result !== null;
}
