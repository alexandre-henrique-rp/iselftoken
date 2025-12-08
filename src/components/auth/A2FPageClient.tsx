'use client';

import { useSession } from '@/hooks/useSession';
import generateA2fCode from '@/lib/a2f';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import ButtonPremium from './ui/ButtonPremium';
import InputPremium from './ui/InputPremium';

// Constantes do componente
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 3;
const EXPIRATION_MINUTES = 5;
const EXPIRATION_MS = EXPIRATION_MINUTES * 60 * 1000;

interface A2FInputs {
  code: string;
}

// Definir um tipo para formData para evitar 'any'
interface FormData {
  nome?: string;
  email?: string;
  // Adicione outras propriedades que formData possa ter
}

interface NewCodeRequestBody {
  nome?: string;
  email?: string;
  codigo: string;
}

const A2FPageClient = () => {
  const router = useRouter();
  const { loading } = useSession();
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [expirationTime, setExpirationTime] = useState<number | null>(null);
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);
  const [tentativasRestantes, setTentativasRestantes] = useState(MAX_ATTEMPTS);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [method, setMethod] = useState<string | null>(null);

  // Array de referências para os 6 inputs
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Schema de validação
  const a2fSchema = z.object({
    code: z
      .string()
      .length(CODE_LENGTH, `O código deve ter ${CODE_LENGTH} dígitos`)
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

  // Inicializa o tempo de expiração e carrega dados do localStorage
  useEffect(() => {
    setExpirationTime(Date.now() + EXPIRATION_MS);

    // Carregar dados do localStorage apenas no cliente
    if (typeof window !== 'undefined') {
      setFormData(JSON.parse(localStorage.getItem('formData') || '{}'));
      setCodigo(localStorage.getItem('codigo'));
      setRedirect(localStorage.getItem('redirect'));
      setMethod(localStorage.getItem('method'));
    }

    setIsLoading(false);
  }, []);

  // Função responsável por solicitar um novo código de verificação e atualizar o estado do componente
  const solicitarNovoCodigo = useCallback(async () => {
    if (!formData) {
      toast('Dados incompletos', {
        description: 'Tente fazer login novamente',
      });
      return;
    }

    try {
      const generatedCode = generateA2fCode();
      const requestBody: NewCodeRequestBody = {
        nome: formData?.nome,
        email: formData?.email,
        codigo: generatedCode,
      };

      const response = await fetch('/api/newcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      if (!response.ok) {
        toast('Não foi possível enviar o código', {
          description: responseData.message,
        });
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('codigo', generatedCode);
      }

      setCodigo(generatedCode);
      setExpirationTime(Date.now() + EXPIRATION_MS);
      setShowExpiredMessage(false);
      setTentativasRestantes(MAX_ATTEMPTS);

      toast('Código reenviado', {
        description: 'Verifique seu e-mail',
      });
    } catch (error) {
      console.error('Erro ao solicitar código:', error);
      toast('Erro ao solicitar código', {
        description: 'Tente novamente mais tarde',
      });
    }
  }, [formData]);

  // Countdown timer
  useEffect(() => {
    if (!expirationTime) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diffMs = expirationTime - now;
      const secs = Math.max(0, Math.floor(diffMs / 1000));
      setRemainingSeconds(secs);

      if (secs === 0) {
        // Mostrar mensagem de expiração em vez de toast
        setShowExpiredMessage(true);
      }
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [expirationTime]);

  // Obter valor completo do código
  const getCodeValue = useCallback(() => {
    return Array.from({ length: CODE_LENGTH })
      .map((_, i) => inputsRef.current[i]?.value ?? '')
      .join('');
  }, []);

  // Handler para mudança nos inputs
  const handleChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, 1);
      if (inputsRef.current[index]) {
        inputsRef.current[index]!.value = value;
        setValue('code', getCodeValue());

        if (value && index < CODE_LENGTH - 1) {
          inputsRef.current[index + 1]?.focus();
        }
      }
    },
    [setValue, getCodeValue],
  );

  // Handler para colar código completo
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const raw = e.clipboardData.getData('text') ?? '';
      const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH).split('');

      for (let i = 0; i < CODE_LENGTH; i++) {
        const ch = digits[i] ?? '';
        const input = inputsRef.current[i];
        if (input) input.value = ch;
      }

      const codeNow = getCodeValue();
      setValue('code', codeNow, { shouldValidate: true, shouldDirty: true });

      const nextIndex = Math.min(digits.length, CODE_LENGTH - 1);
      inputsRef.current[nextIndex]?.focus();
    },
    [setValue, getCodeValue],
  );

  // Handler para teclado
  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === 'Backspace' &&
        !inputsRef.current[index]?.value &&
        index > 0
      ) {
        inputsRef.current[index - 1]?.focus();
      }
    },
    [],
  );

  // Submissão do formulário
  const onSubmit = useCallback(
    async (data: A2FInputs) => {
      try {
        const storedCode =
          typeof window !== 'undefined' ? localStorage.getItem('codigo') : null;
        const activeCode = codigo ?? storedCode;

        if (!activeCode) {
          toast('Nenhum código ativo', {
            description: 'Solicitando um novo código...',
          });
          await solicitarNovoCodigo();
          return;
        }

        if (data.code !== activeCode) {
          const novasTentativas = tentativasRestantes - 1;
          setTentativasRestantes(novasTentativas);

          if (novasTentativas > 0) {
            toast('Código inválido', {
              description: `Tentativas restantes: ${novasTentativas}`,
            });
          } else {
            throw new Error('Tentativas esgotadas');
          }
          return;
        }

        // Ativar A2F após validação bem-sucedida
        try {
          const a2fResponse = await fetch('/api/auth/a2f', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!a2fResponse.ok) {
            throw new Error('Erro ao ativar autenticação de dois fatores');
          }
        } catch (a2fError) {
          console.error('Erro ao ativar A2F:', a2fError);
          toast('Erro na autenticação', {
            description:
              'Não foi possível ativar a verificação de dois fatores',
          });
          return;
        }

        // Sucesso - redirecionar
        toast('Código verificado com sucesso!', {
          description: 'Redirecionando para o dashboard...',
        });

        // Limpar dados sensíveis do localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('codigo');
          localStorage.removeItem('formData');
          localStorage.removeItem('redirect');
        }

        setTimeout(() => {
          router.push(redirect || '/login');
        }, 2000);
      } catch (error) {
        console.error('Erro na requisição:', error);
        toast(
          error instanceof Error ? error.message : 'Erro ao verificar código',
          {
            action: { label: 'Reenviar código', onClick: solicitarNovoCodigo },
          },
        );
      }
    },
    [
      codigo,
      method,
      solicitarNovoCodigo,
      tentativasRestantes,
      formData,
      router,
      redirect,
    ],
  );

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!codigo) {
    // Mostrar formulário mesmo sem código pré-existente
    // O usuário pode solicitar um novo código
  }

  return (
    <div className="relative">
      {/* Mensagem de expiração no meio da tela */}
      {showExpiredMessage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-black/80">
          <div className="mx-4 max-w-sm space-y-6 rounded-xl border border-gray-700 bg-gray-900 p-8 text-center">
            <div className="space-y-3">
              <div className="text-6xl">⏰</div>
              <h3 className="text-xl font-semibold text-white">
                Código expirado
              </h3>
              <p className="text-gray-400">
                Seu código de verificação expirou. Solicite um novo código para
                continuar.
              </p>
            </div>

            <ButtonPremium
              type="button"
              variant="primary"
              size="lg"
              onClick={solicitarNovoCodigo}
              className="w-full bg-[#d500f9] text-white hover:bg-[#d500f9]/50 hover:text-[#d500f9]/50"
            >
              Solicitar novo código
            </ButtonPremium>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className={`space-y-6 transition-all duration-300 ${showExpiredMessage ? 'blur-sm' : ''}`}
      >
        {/* Timer de expiração */}
        {typeof remainingSeconds === 'number' && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/50 px-4 py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500"></div>
              <span className="text-sm text-gray-400">
                Expira em: {Math.floor(remainingSeconds / 60)}:
                {String(remainingSeconds % 60).padStart(2, '0')}
              </span>
            </div>
          </div>
        )}

        {/* Inputs do código de 6 dígitos */}
        <div className="flex justify-center gap-8">
          {Array.from({ length: CODE_LENGTH }).map((_, index) => (
            <InputPremium
              key={index}
              id={`code-${index}`}
              label=""
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="h-12 w-12 text-center font-mono text-xl"
              ref={(el: HTMLInputElement | null) => {
                if (el) {
                  inputsRef.current[index] = el;
                }
              }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange(index, e)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                handleKeyDown(index, e)
              }
              onPaste={index === 0 ? handlePaste : undefined}
            />
          ))}
        </div>

        {/* Mensagem de erro */}
        {errors.code && (
          <div className="text-center">
            <p className="text-sm text-red-400">{errors.code.message}</p>
          </div>
        )}

        {/* Botão de verificação */}
        <ButtonPremium
          type="submit"
          variant="primary"
          size="lg"
          className="w-full bg-[#d500f9] text-white hover:bg-[#d500f9]/50 hover:text-[#d500f9]/50"
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
            className="flex-1 border-2 border-[#d500f9] text-[#d500f9] shadow-lg shadow-[#d500f9] hover:border-[#d500f9]/50 hover:text-[#d500f9]/50 hover:shadow-[#d500f9]/50"
          >
            Reenviar código
          </ButtonPremium>

          <ButtonPremium
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex-1 border-2 border-[#d500f9] text-[#d500f9] shadow-lg shadow-[#d500f9] hover:border-[#d500f9]/50 hover:text-[#d500f9]/50 hover:shadow-[#d500f9]/50"
          >
            ← Voltar
          </ButtonPremium>
        </div>
      </form>
    </div>
  );
};

export default A2FPageClient;
