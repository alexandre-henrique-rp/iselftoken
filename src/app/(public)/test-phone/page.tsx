/**
 * Página de teste para máscara de telefone
 * Demonstração funcional do hook usePhoneMask
 */

'use client';

import React, { useState } from 'react';
import PhoneInput from '@/components/ui/PhoneInput';
import { usePhoneMask } from '@/hooks/usePhoneMask';

export default function TestPhonePage() {
  const [phone, setPhone] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const { validatePhone, unformatPhone, formatPhone } = usePhoneMask();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhone(value);
    
    // Valida se tem pelo menos 14 caracteres (formato completo)
    if (value.length >= 14) {
      setIsValid(validatePhone(value));
    } else {
      setIsValid(null);
    }
  };

  const handleValidate = () => {
    const valid = validatePhone(phone);
    setIsValid(valid);
  };

  const handleShowClean = () => {
    const clean = unformatPhone(phone);
    alert(`Telefone limpo: ${clean}`);
  };

  const handleTestFormat = () => {
    const testNumbers = ['11987654321', '21912345678', '1134567890'];
    const formatted = testNumbers.map(num => formatPhone(num));
    alert(`Teste de formatação:\n${formatted.join('\n')}`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-light mb-8">Teste de Máscara de Telefone</h1>
        
        <div className="space-y-8">
          {/* Input Principal */}
          <div>
            <PhoneInput
              id="phone-test"
              label="Telefone com Máscara Automática"
              value={phone}
              onChange={handlePhoneChange}
              error={isValid === false ? 'Telefone inválido' : undefined}
              placeholder="(XX) XXXXX-XXXX"
            />
            
            {isValid === true && (
              <p className="text-green-500 text-sm mt-2">✓ Telefone válido</p>
            )}
            
            {isValid === false && (
              <p className="text-red-500 text-sm mt-2">✗ Telefone inválido</p>
            )}
          </div>

          {/* Informações */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-light mb-4">Informações</h2>
            <div className="space-y-2 text-gray-300">
              <p><strong>Valor atual:</strong> {phone || '(vazio)'}</p>
              <p><strong>Tamanho:</strong> {phone.length} caracteres</p>
              <p><strong>Status:</strong> {isValid === null ? 'Não validado' : isValid ? 'Válido' : 'Inválido'}</p>
            </div>
          </div>

          {/* Botões de Teste */}
          <div className="flex gap-4">
            <button
              onClick={handleValidate}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Validar Telefone
            </button>
            
            <button
              onClick={handleShowClean}
              className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Mostrar Limpo
            </button>
            
            <button
              onClick={handleTestFormat}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Testar Formatação
            </button>
          </div>

          {/* Instruções */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-light mb-4">Como Testar</h2>
            <ul className="space-y-2 text-gray-300">
              <li>• Digite números para ver a máscara automática</li>
              <li>• Formato celular: (XX) XXXXX-XXXX</li>
              <li>• Formato fixo: (XX) XXXX-XXXX</li>
              <li>• Máximo de 11 dígitos</li>
              <li>• Validação automática de DDI e formato</li>
            </ul>
          </div>

          {/* Exemplos */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-light mb-4">Exemplos para Testar</h2>
            <div className="grid grid-cols-2 gap-4 text-gray-300">
              <div>
                <p className="font-medium text-purple-400 mb-2">Celular</p>
                <ul className="space-y-1 text-sm">
                  <li>11987654321 → (11) 98765-4321</li>
                  <li>21912345678 → (21) 91234-5678</li>
                  <li>81987654321 → (81) 98765-4321</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-purple-400 mb-2">Fixo</p>
                <ul className="space-y-1 text-sm">
                  <li>1134567890 → (11) 3456-7890</li>
                  <li>2123456789 → (21) 2345-6789</li>
                  <li>3134567890 → (31) 3456-7890</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
