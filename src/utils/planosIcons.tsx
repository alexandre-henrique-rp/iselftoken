/**
 * Utilitário para renderizar ícones dos planos
 * Converte strings de ícones em componentes JSX
 */

import { TrendingUp, Rocket, Handshake } from 'lucide-react';
import { IconePlano } from '@/types/planos';

/**
 * Mapeamento de ícones para renderização JSX
 */
export const iconesMap = {
  Handshake: <Handshake size={64} />,
  TrendingUp: <TrendingUp size={64} />,
  Rocket: <Rocket size={64} />
};

/**
 * Função para obter ícone JSX pelo nome
 * @param icone Nome do ícone
 * @returns Componente JSX do ícone
 */
export const getIconePlano = (icone: IconePlano) => {
  return iconesMap[icone];
};
