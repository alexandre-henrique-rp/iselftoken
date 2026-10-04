/**
 * @description Geradores deterministicos para teste E2E (isolam runs, evitam colisao).
 */
export function generateUniqueEmail(prefix = 'e2eS04'): string {
  return `${prefix}+${Date.now()}+${Math.floor(Math.random() * 10000)}@example.com`;
}

export function generateValidPassword(): string {
  return 'SenhaE2e123'; // 11 chars, 1 maiuscula, 1 minuscula, 1 numero
}

export function generateValidPhone(): string {
  return '11987654321';
}

export function generateValidCpf(): string {
  return '52998224725'; // CPF valido pelo algoritmo mod 11
}

export function generateValidCnpj(): string {
  return '11444777000161'; // CNPJ valido pelo algoritmo mod 11
}

export function buildAuthCookie(sessionId: string): string {
  return `session_id=${sessionId}`;
}
