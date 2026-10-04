import { UnprocessableEntityException } from '@nestjs/common';

/**
 * Catálogo de erros de cupom - 11 códigos 422.
 *
 * Cada erro possui:
 * - code: identificador único para logs e debug
 * - severity: default | warning | critical
 * - userMessage: mensagem em PT-BR para exibir ao usuário
 *
 * @catalog CouponErrors
 */
export const COUPON_ERRORS = {
  cupom_nao_encontrado: {
    code: 'cupom_nao_encontrado',
    severity: 'default' as const,
    userMessage: 'Este cupom não existe. Verifique o código e tente novamente.',
  },
  cupom_inativo: {
    code: 'cupom_inativo',
    severity: 'default' as const,
    userMessage: 'Este cupom está desativado.',
  },
  cupom_expirado: {
    code: 'cupom_expirado',
    severity: 'default' as const,
    userMessage: 'Este cupom expirou.',
  },
  cupom_ainda_nao_valido: {
    code: 'cupom_ainda_nao_valido',
    severity: 'default' as const,
    userMessage: 'Este cupom ainda não é válido.',
  },
  cupom_esgotado: {
    code: 'cupom_esgotado',
    severity: 'default' as const,
    userMessage: 'Este cupom atingiu o limite de usos.',
  },
  cupom_ja_aplicado: {
    code: 'cupom_ja_aplicado',
    severity: 'default' as const,
    userMessage: 'Este cupom já foi aplicado a este pagamento.',
  },
  pagamento_com_cupom_aplicado: {
    code: 'pagamento_com_cupom_aplicado',
    severity: 'default' as const,
    userMessage:
      'Este pagamento já possui um cupom aplicado. Crie uma nova ordem para usar outro cupom.',
  },
  pagamento_nao_pendente: {
    code: 'pagamento_nao_pendente',
    severity: 'default' as const,
    userMessage: 'O pagamento não está pendente.',
  },
  cobranca_ja_emitida: {
    code: 'cobranca_ja_emitida',
    severity: 'warning' as const,
    userMessage:
      'O cupom só pode ser aplicado antes de gerar o PIX ou a cobrança no cartão.',
  },
  pagamento_expirado: {
    code: 'pagamento_expirado',
    severity: 'warning' as const,
    userMessage: 'Este pagamento expirou. Crie uma nova ordem para continuar.',
  },
  pagamento_valor_invalido: {
    code: 'pagamento_valor_invalido',
    severity: 'critical' as const,
    userMessage:
      'Este pagamento possui um valor inválido para aplicar o cupom.',
  },
} as const;

export type CouponErrorCode = keyof typeof COUPON_ERRORS;

export interface CouponError {
  code: string;
  severity: 'default' | 'warning' | 'critical';
  userMessage: string;
}

/**
 * Retorna as informações do erro de cupom.
 */
export function getCouponError(code: CouponErrorCode): CouponError {
  return COUPON_ERRORS[code];
}

/**
 * Lança um erro de regra de cupom com contrato HTTP 422 estruturado.
 */
export function throwCouponError(code: CouponErrorCode): never {
  const error = getCouponError(code);
  const exception = new UnprocessableEntityException({
    code: error.code,
    message: error.userMessage,
  }) as UnprocessableEntityException & { code: string };

  // Mantém compatibilidade com consumidores internos que já observavam a
  // propriedade diretamente na instância da exceção.
  exception.code = error.code;
  throw exception;
}
