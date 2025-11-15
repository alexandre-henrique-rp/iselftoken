/**
 * Componente InputPremium - Design minimalista e sofisticado
 * Segue padrões de acessibilidade e UX modernos
 */

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputPremiumProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Rótulo do campo */
  label: string;
  /** Mensagem de erro */
  error?: string;
  /** Indica se campo é obrigatório */
  required?: boolean;
  /** Estado de loading (desabilita input) */
  loading?: boolean;
}

const InputPremium = forwardRef<HTMLInputElement, InputPremiumProps>(
  ({ label, error, required = false, loading = false, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {/* Label com indicador visual obrigatório */}
        <label 
          className={cn(
            "text-sm font-medium leading-relaxed",
            error 
              ? "text-red-400" 
              : "text-gray-300"
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-purple-400" aria-label="Campo obrigatório">
              *
            </span>
          )}
        </label>

        {/* Input com design premium */}
        <input
          ref={ref}
          className={cn(
            // Base styles
            "w-full px-4 py-3 text-sm rounded-md",
            "transition-all duration-300 ease-out",
            "placeholder:text-gray-500",
            "focus:outline-none focus:ring-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            
            // Background e borda
            "bg-gray-900/50 border border-gray-800",
            "hover:bg-gray-900/70 hover:border-gray-700",
            
            // Focus states
            "focus:bg-gray-900 focus:border-purple-500/50 focus:ring-purple-500/20",
            
            // Error states
            error && [
              "border-red-500/30 bg-red-950/20",
              "hover:bg-red-950/30 hover:border-red-500/40",
              "focus:bg-red-950/40 focus:border-red-500/50 focus:ring-red-500/20"
            ],
            
            className
          )}
          style={{
            color: 'oklch(0.920 0.004 49.25)',
            backdropFilter: 'blur(10px)',
          }}
          disabled={loading}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />

        {/* Mensagem de erro */}
        {error && (
          <p 
            id={`${props.id}-error`}
            className="text-xs text-red-400 flex items-center gap-1"
            role="alert"
          >
            <svg 
              className="h-3 w-3 shrink-0" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            {error}
          </p>
        )}

        {/* Indicador de loading */}
        {loading && (
          <div className="absolute right-3 top-9">
            <svg 
              className="h-4 w-4 animate-spin text-purple-400" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }
);

InputPremium.displayName = 'InputPremium';

export default InputPremium;