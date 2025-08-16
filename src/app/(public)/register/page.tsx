'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InvestorForm from '@/components/register/InvestorForm';
import { StartupForm } from '@/components/register/StartupForm';

type TipoCadastro = 'investidor' | 'startup';

export default function RegisterPage() {
  const [openModal, setOpenModal] = useState(true);
  const [tipo, setTipo] = useState<TipoCadastro | null>(null);

  function escolher(tipoEscolhido: TipoCadastro) {
    setTipo(tipoEscolhido);
    setOpenModal(false);
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* Imagem à direita para variar do login */}
      <div className="flex flex-col gap-4 p-4 sm:p-6 md:p-10">
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
          <div className="w-full max-w-lg">
            <Card>
              <CardHeader>
                <CardTitle>Crie sua conta</CardTitle>
              </CardHeader>
              <CardContent>
                {!tipo && (
                  <div className="text-muted-foreground text-sm">
                    Escolha o tipo de cadastro no modal para começar.
                  </div>
                )}

                {tipo === 'investidor' && (
                  <InvestorForm />
                )}

                {tipo === 'startup' && (
                  <StartupForm />
                )}

                {tipo && (
                  <>
                    <div className="pt-4 text-center text-sm">
                      <Link
                        href="/login"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        ← Voltar para o login
                      </Link>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Modal de escolha */}
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Como você quer se registrar?</DialogTitle>
              <DialogDescription>
                Escolha uma opção para mostrar o formulário adequado.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" onClick={() => escolher('investidor')}>
                Sou Investidor
              </Button>
              <Button onClick={() => escolher('startup')}>Sou Startup</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/image-05.jpg"
          alt="Image"
          fill
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.4]"
        />
      </div>
    </div>
  );
}
