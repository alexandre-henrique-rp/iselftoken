/**
 * Componente ButtonPremium - Botões elegantes com loading sofisticado
 * Animações suaves e feedback visual premium
 */

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonPremiumProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante visual do botão */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
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

    // Configurações de variante
    const variantStyles = {
      primary: {
        background: '#d500f9',
        color: 'white',
        border: 'none',
        hover: 'hover:bg-purple-600 active:bg-purple-700',
        shadow: 'shadow-2xl shadow-purple-500/60 hover:shadow-2xl hover:shadow-purple-500/70'
      },
      secondary: {
        background: 'oklch(0.120 0.004 49.25)',
        color: 'oklch(0.920 0.004 49.25)',
        border: '1px solid oklch(0.180 0.004 49.25)',
        hover: 'hover:bg-gray-800 hover:border-gray-600',
        shadow: 'shadow-md'
      },
      secoutline: {
        background: 'transparent',
        color: '#d500f9',
        border: '1px solid #d500f9',
        hover: 'hover:bg-purple-500 hover:text-white active:bg-purple-600',
        shadow: 'shadow-md hover:shadow-lg hover:shadow-purple-500/30'
      },
      ghost: {
        background: 'transparent',
        color: 'oklch(0.650 0.004 49.25)',
        border: 'none',
        hover: 'hover:bg-gray-800/50 hover:text-gray-300',
        shadow: 'none'
      },
      outline: {
        background: 'transparent',
        color: '#d500f9',
        border: '1px solid #d500f9',
        hover: 'hover:bg-purple-500 hover:text-white active:bg-purple-600',
        shadow: 'shadow-md hover:shadow-lg hover:shadow-purple-500/30'
      }
    };

    const currentVariant = variantStyles[variant];
    const currentSize = sizeStyles[size];

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center',
          'font-medium rounded-md transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transform hover:scale-[1.02] active:scale-[0.98]',
          
          // Size
          currentSize,
          
          // Variant
          currentVariant.background,
          currentVariant.color,
          currentVariant.border,
          currentVariant.hover,
          currentVariant.shadow,
          
          // Focus ring
          'focus:ring-purple-500/50',
          
          className
        )}
        style={{
          letterSpacing: '0.5px',
          backdropFilter: 'blur(10px)',
          // Box-shadow customizado para envolver todo o botão
          boxShadow: variant === 'primary' 
            ? '0 4px 20px rgba(213, 0, 249, 0.6), 0 -2px 10px rgba(213, 0, 249, 0.3)'
            : undefined,
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