/**
 * Componente PasswordStrength - Indicador visual de força de senha
 * Feedback elegante e intuitivo para o usuário
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { calculatePasswordStrength, getPasswordStrengthLabel, getPasswordStrengthColor } from '../RegisterForm/validation';

interface PasswordStrengthProps {
  /** Senha para análise */
  password: string;
  /** Mostrar texto descritivo */
  showLabel?: boolean;
  /** Altura da barra */
  height?: 'sm' | 'md' | 'lg';
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ 
  password, 
  showLabel = true, 
  height = 'md' 
}) => {
  const strength = calculatePasswordStrength(password);
  const label = getPasswordStrengthLabel(strength);
  const color = getPasswordStrengthColor(strength);
  
  // Configurações de altura
  const heightStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  // Configurações de borda
  const radiusStyles = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg'
  };

  const currentHeight = heightStyles[height];
  const currentRadius = radiusStyles[height];

  return (
    <div className="space-y-2">
      {/* Barra de progresso */}
      <div 
        className={cn(
          'w-full overflow-hidden transition-all duration-300',
          currentHeight,
          currentRadius
        )}
        style={{
          backgroundColor: 'oklch(0.160 0.004 49.25)',
        }}
      >
        <div 
          className={cn(
            'h-full transition-all duration-500 ease-out',
            currentRadius
          )}
          style={{ 
            width: `${(strength / 4) * 100}%`,
            backgroundColor: color,
            boxShadow: strength > 2 ? `0 0 10px ${color}40` : 'none',
          }}
        />
      </div>

      {/* Label descritivo */}
      {showLabel && label && (
        <div className="flex items-center justify-between">
          <p 
            className="text-xs transition-colors duration-300"
            style={{ 
              color: strength > 0 ? color : 'oklch(0.450 0.004 49.25)',
              fontWeight: strength > 2 ? '500' : '400'
            }}
          >
            Força: {label}
          </p>
          
          {/* Dicas visuais */}
          {strength < 4 && (
            <p className="text-xs text-gray-500">
              {strength < 2 && 'Adicione caracteres especiais'}
              {strength === 2 && 'Boa! Adicione mais números'}
              {strength === 3 && 'Forte! Use símbolos únicos'}
            </p>
          )}
        </div>
      )}

      {/* Requisitos visuais */}
      {password && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={cn(
            'flex items-center gap-1',
            password.length >= 12 ? 'text-green-400' : 'text-gray-500'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              password.length >= 12 ? 'bg-green-400' : 'bg-gray-600'
            )} />
            12+ caracteres
          </div>
          
          <div className={cn(
            'flex items-center gap-1',
            /[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-400' : 'text-gray-500'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              /[A-Z]/.test(password) && /[a-z]/.test(password) ? 'bg-green-400' : 'bg-gray-600'
            )} />
            Letras maiúsculas/minúsculas
          </div>
          
          <div className={cn(
            'flex items-center gap-1',
            /[0-9]/.test(password) ? 'text-green-400' : 'text-gray-500'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              /[0-9]/.test(password) ? 'bg-green-400' : 'bg-gray-600'
            )} />
              Números
          </div>
          
          <div className={cn(
            'flex items-center gap-1',
            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-400' : 'text-gray-500'
          )}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'bg-green-400' : 'bg-gray-600'
            )} />
            Caracteres especiais
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrength;