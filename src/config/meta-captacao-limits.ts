/**
 * Configurações de limites de meta de captação por estágio da startup
 * Valores facilmente ajustáveis para regras de negócio
 */

export const META_CAPTACAO_LIMITES = {
  // Meta mínima padrão para todos os estágios
  MINIMO: 100000,

  // Limites máximos por estágio
  MAXIMO_POR_ESTAGIO: {
    'Ideação': 200000,
    'MVP': 200000,
    'Tração': 500000,
    'Crescimento': 800000,
    'Escala': 1000000,
  },

  // Valores padrão sugeridos por estágio
  SUGERIDO_POR_ESTAGIO: {
    'Ideação': 150000,
    'MVP': 180000,
    'Tração': 400000,
    'Crescimento': 600000,
    'Escala': 800000,
  },
} as const;

/**
 * Obtém os limites de meta de captação para um estágio específico
 */
export function getLimitesMetaCaptacao(estagio: string) {
  const maximo = META_CAPTACAO_LIMITES.MAXIMO_POR_ESTAGIO[estagio as keyof typeof META_CAPTACAO_LIMITES.MAXIMO_POR_ESTAGIO] || META_CAPTACAO_LIMITES.MINIMO;
  const sugerido = META_CAPTACAO_LIMITES.SUGERIDO_POR_ESTAGIO[estagio as keyof typeof META_CAPTACAO_LIMITES.SUGERIDO_POR_ESTAGIO] || META_CAPTACAO_LIMITES.MINIMO;

  return {
    minimo: META_CAPTACAO_LIMITES.MINIMO,
    maximo,
    sugerido,
  };
}

/**
 * Valida se a meta de captação está dentro dos limites permitidos
 */
export function validarMetaCaptacao(meta: number, estagio: string): { valido: boolean; erro?: string } {
  const { minimo, maximo } = getLimitesMetaCaptacao(estagio);

  if (meta < minimo) {
    return {
      valido: false,
      erro: `A meta mínima é de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minimo)}`
    };
  }

  if (meta > maximo) {
    return {
      valido: false,
      erro: `Para o estágio "${estagio}", a meta máxima é de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(maximo)}`
    };
  }

  return { valido: true };
}
