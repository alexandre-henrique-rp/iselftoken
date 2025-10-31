'use client';

import { useEffect, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import '@/i18n';
import { toast } from 'sonner';

interface PaisesProps {
  error: boolean;
  message: string;
  dataPaises: LocationTypes.Country[];
}

export default function RegisterFlow({
  dataPaises,
  error,
  message,
}: PaisesProps) {
  // Modal 1 (Localização) e Modal 2 (Perfil)
  const [openModalLocal, setOpenModalLocal] = useState(true);

  // Seleção do formulário final
  const [Verifique, setVerifique] = useState<boolean>(false);

  // Estados do Modal 1
  const [pais, setPais] = useState<string>('');
  const [DDI, setDDI] = useState<string>('');
  const [uf, setUf] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const { t } = useTranslation('register');

  // Listas carregadas da API interna
  const [estadosLista, setEstadosLista] = useState<LocationTypes.StateItem[]>(
    [],
  );
  const [cidadesLista, setCidadesLista] = useState<LocationTypes.CityItem[]>(
    [],
  );

  // Loading/erro
  const [loadingEstados, setLoadingEstados] = useState(false);
  const [loadingCidades, setLoadingCidades] = useState(false);

  // Carrega países ao abrir (apenas uma vez)
  useEffect(() => {
    if (error) {
      toast('error', { description: message });
    }
  }, [error, message]); // Array vazio - executa apenas uma vez

  // Atualiza DDI quando país ou lista de países mudar
  useEffect(() => {
    if (pais && Array.isArray(dataPaises) && dataPaises.length > 0) {
      const paisSelecionado = dataPaises.find((p) => p.iso3 === pais);
      const codigoDDI = paisSelecionado?.phone_code || '';
      setDDI(codigoDDI);
    }
  }, [dataPaises, pais]);

  // Carrega estados ao escolher país
  useEffect(() => {
    (async () => {
      if (!pais) {
        setEstadosLista([]);
        setUf('');
        setCidade('');
        return;
      }
      try {
        setLoadingEstados(true);
        const res = await fetch(
          `/api/location/states?country=${encodeURIComponent(pais)}`,
        );
        const json = await res.json();
        if (!res.ok || json?.error)
          throw new Error(json?.message || 'Falha ao carregar estados');
        setEstadosLista(json.data as LocationTypes.StateItem[]);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : 'Erro ao carregar estados';
        toast('erro', { description: message });
      } finally {
        setLoadingEstados(false);
      }
    })();
  }, [pais]);

  // Carrega cidades ao escolher estado
  useEffect(() => {
    (async () => {
      if (!pais || !uf) {
        setCidadesLista([]);
        setCidade('');
        return;
      }
      if (!Verifique) {
        try {
          setLoadingCidades(true);
          const res = await fetch(
            `/api/location/cities?country=${encodeURIComponent(pais)}&state=${encodeURIComponent(uf)}`,
          );
          const json = await res.json();
          if (!res.ok || json?.error)
            throw new Error(json?.message || 'Falha ao carregar cidades');
          setCidadesLista(json.data as LocationTypes.CityItem[]);
        } catch (e: unknown) {
          const message =
            e instanceof Error ? e.message : 'Erro ao carregar cidades';
          toast('erro', { description: message });
        } finally {
          setLoadingCidades(false);
        }
      }
    })();
  }, [pais, uf, Verifique]);

  // Handlers para impedir fechamento dos modais obrigatórios por overlay/Escape
  const handleBlockCloseLocal = (nextOpen: boolean) => {
    if (nextOpen) setOpenModalLocal(true);
  };

  function avancarParaPerfil() {
    if (!pais || !uf || !cidade) return; // validação simples
    const UfState = estadosLista.find((state) => state.name === uf);
    if (!UfState) return;
    setUf(UfState.iso2);
    setOpenModalLocal(false);
    setVerifique(true);
  }

  function cancelarRegistro() {
    // Fecha modais e volta para home
    setOpenModalLocal(false);
    window.location.href = '/';
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
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
                <CardTitle>{t('title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {Verifique && (
                  <InvestorForm
                    cidadeInicial={cidade}
                    ufInicial={uf}
                    paisInicial={pais}
                    ddi={DDI}
                  />
                )}

                <div className="pt-4 text-center text-sm">
                  <Link
                    href="/login"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {t('form.login_link')}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Modal 1: País / Estado / Cidade + Termos */}
        <Dialog open={openModalLocal} onOpenChange={handleBlockCloseLocal}>
          <DialogContent
            className="w-[calc(100vw-2rem)] max-w-md space-y-5 p-6 sm:max-w-lg sm:space-y-6 sm:p-8"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            showCloseButton={false}
          >
            <DialogHeader>
              <DialogTitle>Informe sua localização</DialogTitle>
              <DialogDescription>
                Selecione país, estado/província e cidade. Aceite os termos para
                continuar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-1">
                <label className="text-sm font-medium" htmlFor="pais">
                  País
                </label>
                <select
                  id="pais"
                  className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                  value={pais}
                  onChange={(e) => {
                    setPais(e.target.value);
                    setUf('');
                    setCidade('');
                  }}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {Array.isArray(dataPaises) &&
                    dataPaises.map((p) => {
                      return (
                        <option key={p.id} value={p.iso3}>
                          {p.emoji} {p.native || p.name}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium" htmlFor="uf">
                  Estado/Província
                </label>
                <select
                  id="uf"
                  className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                  value={uf}
                  onChange={(e) => {
                    setUf(e.target.value);
                    setCidade('');
                  }}
                  disabled={!pais || loadingEstados}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {estadosLista.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium" htmlFor="cidade">
                  Cidade
                </label>
                <select
                  id="cidade"
                  className="bg-background h-10 w-full rounded-md border px-3 text-sm"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  disabled={!uf || loadingCidades}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {cidadesLista.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" onClick={cancelarRegistro} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={avancarParaPerfil}
                  disabled={!pais || !uf || !cidade}
                >
                  Próximo
                </Button>
              </div>
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
