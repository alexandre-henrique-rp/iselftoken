'use client';

import { FourSquare } from 'react-loading-indicators';

/*
 * FourSquareLoader
 * Componente de loader baseado no FourSquare do react-loading-indicators.
 * Props opcionais para personalização de cor, tamanho e velocidade.
 */
export type FourSquareLoaderProps = {
  color?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
};

export function FourSquareLoader({
  color = '#3b82f6',
  size = 'large',
  className = '',
}: FourSquareLoaderProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <FourSquare
        color={color}
        size={size}
        speedPlus={1}
        text="Carregando..."
        textColor="#FFFFFF"
      />
    </div>
  );
}
