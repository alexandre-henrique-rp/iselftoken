/**
 * Componente CheckboxPremium - Checkbox minimalista e elegante
 * Design sofisticado com feedback visual premium
 */

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CheckboxPremiumProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** Rótulo do checkbox */
  label: React.ReactNode;
  /** Mensagem de erro */
  error?: string;
  /** Indica se é obrigatório */
  required?: boolean;
  /** Handler customizado para mudança de estado */
  onChange?: (checked: boolean) => void;
}

const CheckboxPremium = forwardRef<HTMLInputElement, CheckboxPremiumProps>(
  ({ label, error, required = false, checked, onChange, ...props }, ref) => {
    // Handler para o input nativo
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e.target.checked);
      }
    };

    return (
      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer group">
          {/* Checkbox customizado */}
          <div className="relative">
            <input
              ref={ref}
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={handleInputChange}
              style={{ accentColor: '#d500f9' }}
              {...props}
            />
            
            {/* Visual custom do checkbox */}
            <div
              className={cn(
                'w-5 h-5 rounded-md border-2 transition-all duration-300',
                'flex items-center justify-center',
                'group-hover:border-purple-400/50',
                checked 
                  ? 'bg-purple-500 border-purple-500 shadow-lg shadow-purple-500/25' 
                  : 'bg-gray-900/50 border-gray-700'
              )}
              style={{
                backdropFilter: 'blur(10px)',
              }}
            >
              {checked && (
                <Check 
                  className="w-3 h-3 text-white transition-all duration-300 scale-100" 
                  strokeWidth={3}
                />
              )}
            </div>
          </div>

          {/* Label com texto */}
          <span 
            className={cn(
              'text-sm leading-relaxed select-none',
              'transition-colors duration-300',
              error 
                ? 'text-red-400' 
                : 'text-gray-300 group-hover:text-gray-200'
            )}
          >
            {label}
            {required && (
              <span className="ml-1 text-purple-400" aria-label="Campo obrigatório">
                *
              </span>
            )}
          </span>
        </label>

        {/* Mensagem de erro */}
        {error && (
          <p 
            className="text-xs text-red-400 flex items-center gap-1 ml-8"
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
      </div>
    );
  }
);

CheckboxPremium.displayName = 'CheckboxPremium';

export default CheckboxPremium;