<<<<<<< Updated upstream
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from '@/hooks/useSession';
import { FourSquareLoader } from '@/components/ui/four-square-loader';
import { toast } from 'sonner';

// Conjunto de imagens em escopo de módulo para estabilidade entre SSR/CSR
const tema = [
  '/image-01.jpg',
  '/image-02.jpg',
  '/image-03.jpg',
  '/image-04.jpg',
];

export default function A2FPage() {
  const { user, loading } = useSession();
  const requestedRef = useRef(false);
  const [Code, setCode] = useState('');

  const heroImage = tema[Math.floor(Math.random() * tema.length)];
  // Quando houver sessão e email disponível, dispara solicitação para enviar código A2F
  useEffect(() => {
    if (loading) return;
    const email = user?.email ?? undefined;
    if (!email) return;
    if (requestedRef.current) return;
    requestedRef.current = true;

    const sendCode = async () => {
      try {
        const res = await fetch('/api/auth/a2f', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });
        if (!res.ok) {
          console.error('Falha ao solicitar código A2F', await res.text());
        }
        const data = await res.json();
        console.log('🚀 ~ sendCode ~ data:', data);
        setCode(data.codigo);
      } catch (err) {
        console.error('Erro ao solicitar código A2F', err);
      }
    };
    sendCode();
  }, [loading, user]);

  // Schema de validação para o código A2F
  const a2fSchema = z.object({
    code: z
      .string()
      .length(6, 'O código deve ter 6 dígitos')
      .regex(/^\d{6}$/, 'O código deve conter apenas números'),
  });

  type A2FInputs = z.infer<typeof a2fSchema>;

  const {
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<A2FInputs>({
    resolver: zodResolver(a2fSchema),
    defaultValues: {
      code: '',
    },
  });

  // Array de referências para os 6 inputs
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 1);
    if (inputsRef.current[index]) {
      inputsRef.current[index]!.value = value;
      setValue('code', getCodeValue());

      if (value && index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  }

  // Permite colar o código completo (até 6 dígitos) e preencher todos os campos
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const raw = e.clipboardData.getData('text') ?? '';
    const digits = raw.replace(/\D/g, '').slice(0, 6).split('');

    for (let i = 0; i < 6; i++) {
      const ch = digits[i] ?? '';
      const input = inputsRef.current[i];
      if (input) input.value = ch;
    }

    // Atualiza o valor agregado no formulário
    const codeNow = getCodeValue();
    setValue('code', codeNow, { shouldValidate: true, shouldDirty: true });

    // Foca no próximo vazio ou no último preenchido
    const nextIndex = Math.min(digits.length, 5);
    inputsRef.current[nextIndex]?.focus();
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      e.key === 'Backspace' &&
      !inputsRef.current[index]?.value &&
      index > 0
    ) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function getCodeValue() {
    return Array.from({ length: 6 })
      .map((_, i) => inputsRef.current[i]?.value ?? '')
      .join('');
  }

  async function onSubmit(data: A2FInputs) {
    // Garante que já recebemos o código do servidor
    if (!Code || Code.length !== 6) {
      toast('Código ainda não disponível. Tente novamente.');
      return;
    }
    // Valida código digitado
    if (data.code !== Code) {
      toast('Código inválido');
      return;
    }
    try {
      const req = await fetch('/api/auth/a2f/put', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ status: true }),
      });
      if (!req.ok) {
        const err = await req.text();
        console.error('Falha na verificação A2F:', err);
        toast('Falha na verificação', {
          duration: 5000,
          description: JSON.stringify(err),
        });
        return;
      }
      const res = await req.json();
      console.log('🚀 ~ onSubmit ~ res:', res);
      toast('Código válido');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erro na requisição A2F:', error);
      toast('Erro ao verificar código');
    }
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* Imagem à esquerda */}
      <div className="bg-muted relative hidden lg:block">
        <Image
          src={heroImage}
          alt="Image"
          fill
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.4]"
        />
      </div>
      {/* Formulário à direita */}
      <div className="flex flex-col gap-4 p-4 sm:p-6 md:p-10">
        {loading ? (
          <div className="grid min-h-[60vh] w-full place-items-center">
            <FourSquareLoader size="large" />
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2 md:justify-start">
              <Link href="/" className="flex items-center gap-2 font-medium">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={1000}
                  height={500}
                  className="h-9 w-full max-w-lg object-contain"
                />
              </Link>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-y-auto py-6">
              <div className="w-full max-w-sm">
                <Card>
                  <CardHeader>
                    <CardTitle>Verificação em 2 fatores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground mb-6 text-sm">
                      Informe o código de 6 dígitos enviado para o seu e-mail.
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)}>
                      <div className="mb-6 flex justify-center gap-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <div key={index} className="relative">
                            <Input
                              ref={(el) => {
                                if (el) {
                                  inputsRef.current[index] = el;
                                }
                              }}
                              id={`code-${index}`}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              className="h-12 w-12 p-0 text-center text-2xl"
                              onChange={(e) => handleChange(index, e)}
                              onKeyDown={(e) => handleKeyDown(index, e)}
                              onPaste={handlePaste}
                            />
                          </div>
                        ))}
                      </div>
                      {errors.code && (
                        <p className="mb-4 text-center text-sm text-red-500">
                          {errors.code.message}
                        </p>
                      )}
                      <Button type="submit" className="w-full">
                        Verificar
                      </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                      <Link
                        href="/login"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        ← Voltar para o login
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
=======
import A2FPageClient from '@/components/auth/A2FPageClient';
import AuthLayoutPremium from '@/components/auth/layout/AuthLayoutPremium';

export default async function A2FPage() {

  return (
    <AuthLayoutPremium
      title="iSelfToken"
      backgroundImage="/image-05.jpg"
      showLoginLink={false}
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-light text-white mb-2">
            Verificação em dois fatores
          </h2>
          <p className="text-sm text-gray-400">
            Informe o código de 6 dígitos enviado para seu e-mail
          </p>
        </div>
        
        <A2FPageClient />
      </div>
    </AuthLayoutPremium>
  );
}
>>>>>>> Stashed changes
