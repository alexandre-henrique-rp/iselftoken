/**
 * A2FPageClient - Componente de autenticação 2 fatores premium
 * Design minimalista seguindo padrões iSelfToken
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import InputPremium from './ui/InputPremium';
import ButtonPremium from './ui/ButtonPremium';
import { useSession } from '@/hooks/useSession';

interface A2FPageClientProps {
  token: string;
}

interface A2FInputs {
  code: string;
}

const A2FPageClient: React.FC<A2FPageClientProps> = ({ token }) => {
  const router = useRouter();
  const { loading, user } = useSession();
  const [currentToken, setCurrentToken] = useState<string>(token);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [expirationTime, setExpirationTime] = useState<number | null>(null);

  // Array de referências para os 6 inputs
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Schema de validação
  const a2fSchema = z.object({
    code: z
      .string()
      .length(6, 'O código deve ter 6 dígitos')
      .regex(/^\d{6}$/, 'O código deve conter apenas números'),
  });

  const {
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<A2FInputs>({
    resolver: zodResolver(a2fSchema),
    defaultValues: { code: '' },
  });

  // Inicializa o tempo de expiração
  useEffect(() => {
    setExpirationTime(Date.now() + 5 * 60 * 1000);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!expirationTime) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diffMs = expirationTime - now;
      const secs = Math.max(0, Math.floor(diffMs / 1000));
      setRemainingSeconds(secs);
      
      if (secs === 0) {
        toast('Código expirado', { 
          description: 'Solicite um novo código.',
          action: { label: 'Reenviar', onClick: solicitarNovoCodigo }
        });
      }
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [expirationTime, solicitarNovoCodigo]);

  // Solicitar novo código
  const solicitarNovoCodigo = useCallback(async () => {
    try {
      const res = await fetch('/api/newcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          nome: user?.name,
          email: user?.email,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        toast('Não foi possível enviar o código', {
          description: data.message,
        });
        return;
      }
      
      setCurrentToken(data.token);
      setExpirationTime(data.expiration || Date.now() + 5 * 60 * 1000);
      toast('Novo código enviado', { description: 'Verifique seu e-mail.' });
    } catch (err) {
      console.error('Erro ao solicitar código', err);
      toast('Erro ao enviar código');
    }
  }, [user?.email, user?.name]);

  // Obter valor completo do código
  const getCodeValue = useCallback(() => {
    return Array.from({ length: 6 })
      .map((_, i) => inputsRef.current[i]?.value ?? '')
      .join('');
  }, []);

  // Handler para mudança nos inputs
  const handleChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 1);
    if (inputsRef.current[index]) {
      inputsRef.current[index]!.value = value;
      setValue('code', getCodeValue());

      if (value && index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  }, [setValue, getCodeValue]);

  // Handler para colar código completo
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const raw = e.clipboardData.getData('text') ?? '';
    const digits = raw.replace(/\D/g, '').slice(0, 6).split('');

    for (let i = 0; i < 6; i++) {
      const ch = digits[i] ?? '';
      const input = inputsRef.current[i];
      if (input) input.value = ch;
    }

    const codeNow = getCodeValue();
    setValue('code', codeNow, { shouldValidate: true, shouldDirty: true });

    const nextIndex = Math.min(digits.length, 5);
    inputsRef.current[nextIndex]?.focus();
  }, [setValue, getCodeValue]);

  // Handler para teclado
  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inputsRef.current[index]?.value && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }, []);

  // Submissão do formulário
  const onSubmit = useCallback(async (data: A2FInputs) => {
    try {
      const req = await fetch('/api/auth/a2f', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ token: currentToken, client_code: data.code }),
      });
      
      const res = await req.json();
      if (!req.ok) {
        toast('Erro ao verificar código', {
          description: res.message,
        });
        return;
      }
      
      toast('Código verificado com sucesso!', {
        description: 'Redirecionando para o dashboard...',
      });
      
      setTimeout(() => {
        router.push(res.url || '/');
      }, 2000);
    } catch (error) {
      console.error('Erro na requisição:', error);
      toast('Erro ao verificar código', {
        action: { label: 'Reenviar código', onClick: solicitarNovoCodigo },
      });
    }
  }, [currentToken, router, solicitarNovoCodigo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Timer de expiração */}
      {typeof remainingSeconds === 'number' && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">
              Expira em: {Math.floor(remainingSeconds / 60)}:
              {String(remainingSeconds % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {/* Inputs do código de 6 dígitos */}
      <div className="flex justify-center gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <InputPremium
            key={index}
            id={`code-${index}`}
            label=""
            type="text"
            inputMode="numeric"
            maxLength={1}
            className="w-12 h-12 text-center text-xl font-mono"
            ref={(el: HTMLInputElement | null) => {
              if (el) {
                inputsRef.current[index] = el;
              }
            }}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(index, e)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            required
          />
        ))}
      </div>

      {/* Mensagem de erro */}
      {errors.code && (
        <div className="text-center">
          <p className="text-sm text-red-400">
            {errors.code.message}
          </p>
        </div>
      )}

      {/* Botão de verificação */}
      <ButtonPremium
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
      >
        Verificar código
      </ButtonPremium>

      {/* Ações secundárias */}
      <div className="flex items-center justify-between gap-4">
        <ButtonPremium
          type="button"
          variant="ghost"
          size="sm"
          onClick={solicitarNovoCodigo}
          className="flex-1"
        >
          Reenviar código
        </ButtonPremium>
        
        <ButtonPremium
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex-1"
        >
          ← Voltar
        </ButtonPremium>
      </div>
    </form>
  );
};

export default A2FPageClient;