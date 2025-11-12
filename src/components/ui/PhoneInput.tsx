/**
 * Componente de Input de Telefone com máscara automática brasileira
 * Componente reutilizável seguindo Clean Architecture
 */

'use client';

import React, { forwardRef } from 'react';
import { usePhoneMask } from '@/hooks/usePhoneMask';

interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label do campo */
  label?: string;
  /** Mensagem de erro */
  error?: string;
  /** Placeholder customizado */
  placeholder?: string;
  /** Referência do input */
  ref?: React.Ref<HTMLInputElement>;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, placeholder = "(XX) XXXXX-XXXX", className = "", ...props }, ref) => {
    const { handlePhoneChange } = usePhoneMask();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formattedValue = handlePhoneChange(e.target.value);
      props.onChange?.(e);
      
      // Atualiza o valor formatado
      if (e.target) {
        e.target.value = formattedValue;
      }
    };

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-300"
          >
            {label}
          </label>
        )}
        
        <input
          {...props}
          ref={ref}
          type="tel"
          placeholder={placeholder}
          onChange={handleChange}
          className={`
            w-full bg-gray-900 border border-gray-700 rounded-lg px-5 py-4 
            text-white placeholder-gray-500 
            focus:border-purple-600 focus:outline-none transition-colors
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          maxLength={15} // (XX) XXXXX-XXXX = 15 caracteres
        />
        
        {error && (
          <p className="text-red-500 text-sm mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
