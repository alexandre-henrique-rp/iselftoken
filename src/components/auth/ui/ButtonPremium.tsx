/**
 * Componente ButtonPremium - Botões elegantes com loading sofisticado
 * Animações suaves e feedback visual premium
 */

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonPremiumProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante visual do botão */
  variant?: 'primary' | 'secondary' | 'ghost' | 'cancel' | 'outline';
  /** Tamanho do botão */
  size?: 'sm' | 'md' | 'lg';
  /** Estado de loading */
  loading?: boolean;
  /** Ícone à esquerda do texto */
  leftIcon?: React.ReactNode;
  /** Ícone à direita do texto */
  rightIcon?: React.ReactNode;
}

const ButtonPremium = forwardRef<HTMLButtonElement, ButtonPremiumProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    leftIcon, 
    rightIcon, 
    children, 
    className, 
    disabled, 
    ...props 
  }, ref) => {
    // Configurações de tamanho
    const sizeStyles = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base'
    };

    // Configurações de variante conforme padrões de CSS
    const variantStyles = {
      // Botão Principal Elegante - #d500f9 com transição suave
      primary: {
        background: '#d500f9',
        color: 'white',
        border: 'none',
        hover: 'hover:bg-[#e400e5] hover:shadow-lg',
        shadow: 'shadow-md shadow-purple-500/25'
      },
      // Botão Secundário Minimalista - fundo transparente com borda sutil
      secondary: {
        background: 'transparent',
        color: 'oklch(0.850 0.004 49.25)',
        border: '1px solid oklch(0.180 0.004 49.25)',
        hover: 'hover:bg-[oklch(0.120_0.004_49.25)] hover:border-[oklch(0.220_0.004_49.25)] hover:text-[oklch(0.920_0.004_49.25)]',
        shadow: 'none'
      },
      // Botão Ghost (Invisível) - sem fundo nem borda
      ghost: {
        background: 'transparent',
        color: 'oklch(0.650 0.004 49.25)',
        border: 'none',
        hover: 'hover:text-[oklch(0.850_0.004_49.25)] hover:bg-white/5',
        shadow: 'none'
      },
      // Botão Cancelar - outline sofisticado com efeito hover magenta
      cancel: {
        background: 'transparent',
        color: 'oklch(0.650 0.004 49.25)',
        border: '1px solid oklch(0.220 0.004 49.25)',
        hover: 'hover:text-[#d500f9] hover:border-[#d500f9] hover:shadow-lg hover:shadow-purple-500/18',
        shadow: 'shadow-md shadow-black/30'
      },
      // Botão Outline - alias para cancel para compatibilidade
      outline: {
        background: 'transparent',
        color: '#d500f9',
        border: '1px solid #d500f9',
        hover: 'hover:bg-purple-500/10 hover:shadow-lg hover:shadow-purple-500/30',
        shadow: 'shadow-md shadow-purple-500/20'
      }
    };

    const currentVariant = variantStyles[variant || 'primary'];
    const currentSize = sizeStyles[size];

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'relative flex items-center justify-center',
          'font-medium rounded-[6px] transition-all duration-300 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Animações: hover e click
          'hover:scale-[1.02] active:scale-[0.98]',
          'transform hover:-translate-y-px active:translate-y-0',
          
          // Size
          currentSize,
          
          // Variant (aplicado apenas se não houver className customizado)
          !className && currentVariant.background,
          !className && currentVariant.color,
          !className && currentVariant.border,
          !className && currentVariant.hover,
          !className && currentVariant.shadow,
          
          className
        )}
        style={{
          letterSpacing: '0.5px',
        }}
        disabled={disabled || loading}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {/* Conteúdo do botão */}
        <span className={cn(
          'flex items-center gap-2 transition-opacity duration-300',
          loading && 'opacity-0'
        )}>
          {leftIcon}
          {children}
          {rightIcon}
        </span>

        {/* Efeito de brilho sutil */}
        <div 
          className="absolute inset-0 rounded-md opacity-0 hover:opacity-20 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
          }}
        />
      </button>
    );
  }
);

ButtonPremium.displayName = 'ButtonPremium';

export default ButtonPremium;