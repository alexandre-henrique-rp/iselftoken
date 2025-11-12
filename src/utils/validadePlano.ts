/**
 * Utilitários para gerenciar validade de planos
 * Calcula datas de expiração e verificações
 */

import { PlanoSelecionadoData } from '@/types/localStorage';

/**
 * Calcula a data de expiração baseada na validade em meses
 * @param validadeMeses Número de meses de validade
 * @param dataBase Data base para cálculo (opcional, padrão: agora)
 * @returns Data de expiração em formato ISO
 */
export const calcularDataExpiracao = (
  validadeMeses: number, 
  dataBase?: Date
): string => {
  const data = dataBase || new Date();
  const dataExpiracao = new Date(data);
  
  // Adiciona os meses
  dataExpiracao.setMonth(dataExpiracao.getMonth() + validadeMeses);
  
  return dataExpiracao.toISOString();
};

/**
 * Verifica se um plano está expirado
 * @param planoSelecionado Dados do plano selecionado
 * @returns true se expirado, false se válido
 */
export const planoEstaExpirado = (planoSelecionado: PlanoSelecionadoData): boolean => {
  const dataExpiracao = calcularDataExpiracao(planoSelecionado.validade, new Date(planoSelecionado.timestamp));
  const agora = new Date();
  
  return agora > new Date(dataExpiracao);
};

/**
 * Calcula os dias restantes até a expiração
 * @param planoSelecionado Dados do plano selecionado
 * @returns Número de dias restantes
 */
export const calcularDiasRestantes = (planoSelecionado: PlanoSelecionadoData): number => {
  const dataExpiracao = calcularDataExpiracao(planoSelecionado.validade, new Date(planoSelecionado.timestamp));
  const agora = new Date();
  const diffMs = new Date(dataExpiracao).getTime() - agora.getTime();
  
  // Converte milissegundos para dias
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Formata a data de expiração para exibição
 * @param planoSelecionado Dados do plano selecionado
 * @returns Data formatada (ex: "31/12/2024")
 */
export const formatarDataExpiracao = (planoSelecionado: PlanoSelecionadoData): string => {
  const dataExpiracao = calcularDataExpiracao(planoSelecionado.validade, new Date(planoSelecionado.timestamp));
  const data = new Date(dataExpiracao);
  
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Gera texto de status da validade
 * @param planoSelecionado Dados do plano selecionado
 * @returns Texto formatado do status
 */
export const gerarTextoValidade = (planoSelecionado: PlanoSelecionadoData): string => {
  if (planoEstaExpirado(planoSelecionado)) {
    return 'Plano expirado';
  }
  
  const diasRestantes = calcularDiasRestantes(planoSelecionado);
  const dataExpiracao = formatarDataExpiracao(planoSelecionado);
  
  if (diasRestantes <= 30) {
    return `Expira em ${diasRestantes} dias (${dataExpiracao})`;
  }
  
  return `Válido até ${dataExpiracao}`;
};
