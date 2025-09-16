/**
 * Gera um código de verificação A2F de 6 dígitos.
 */
export default function generateA2fCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}