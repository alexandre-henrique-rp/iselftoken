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
import { StartupForm } from '@/components/register/StartupForm';
import AffiliateForm from '@/components/register/AffiliateForm';
import { useTranslation } from 'react-i18next';
import '@/i18n';

type TipoCadastro = 'investidor' | 'startup' | 'afiliado';

export default function RegisterFlow() {
  // Modal 1 (Localização) e Modal 2 (Perfil)
  const [openModalLocal, setOpenModalLocal] = useState(true);
  const [openModalPerfil, setOpenModalPerfil] = useState(false);
  const [openModalTermos, setOpenModalTermos] = useState(false);
  const [openModalPolitica, setOpenModalPolitica] = useState(false);

  // Seleção do formulário final
  const [tipo, setTipo] = useState<TipoCadastro | null>(null);

  // Estados do Modal 1
  const [pais, setPais] = useState<string>('');
  const [DDI, setDDI] = useState<string>('');
  const [uf, setUf] = useState<string>('');
  const [cidade, setCidade] = useState<string>('');
  const [aceitouTermos, setAceitouTermos] = useState<boolean>(false);
  const { t } = useTranslation('auth');

  // Utilitário: converte código ISO2 de país em emoji de bandeira
  function codeToFlagEmoji(iso2: string): string {
    if (!iso2 || iso2.length !== 2) return '';
    const upper = iso2.toUpperCase();
    const codePoints = [...upper].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  // Tipos locais para evitar importar do módulo no client
  type Country = { code: string; name: string; phone_code: string };
  type StateItem = { code: string; name: string };
  type CityItem = { name: string };

  // Listas carregadas da API interna
  const [paisesLista, setPaisesLista] = useState<Country[]>([]);
  const [estadosLista, setEstadosLista] = useState<StateItem[]>([]);
  const [cidadesLista, setCidadesLista] = useState<CityItem[]>([]);

  // Loading/erro
  const [loadingPaises, setLoadingPaises] = useState(false);
  const [loadingEstados, setLoadingEstados] = useState(false);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Carrega países ao abrir
  useEffect(() => {
    let mounted = true;
    if(pais && paisesLista){
      const paisSelecionado = paisesLista.find((p) => p.code === pais);
      const codigoDDI = paisSelecionado?.phone_code || '';
      setDDI(codigoDDI);
    }
    (async () => {
      try {
        setLoadingPaises(true);
        setErrorLocal(null);
        const res = await fetch('/api/location/countries');
        const json = await res.json();
        if (!res.ok || json?.status !== 'success') throw new Error(json?.message || 'Falha ao carregar países');
        if (mounted) setPaisesLista(json.data as Country[]);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Erro ao carregar países';
        if (mounted) setErrorLocal(message);
      } finally {
        if (mounted) setLoadingPaises(false);
      }
    })();
    return () => { mounted = false; };
  
  }, [pais, paisesLista]);

  // Carrega estados ao escolher país
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!pais) { setEstadosLista([]); setUf(''); setCidade(''); return; }
      try {
        setLoadingEstados(true);
        setErrorLocal(null);
        const res = await fetch(`/api/location/states?country=${encodeURIComponent(pais)}`);
        const json = await res.json();
        if (!res.ok || json?.status !== 'success') throw new Error(json?.message || 'Falha ao carregar estados');
        if (mounted) setEstadosLista(json.data as StateItem[]);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Erro ao carregar estados';
        if (mounted) setErrorLocal(message);
      } finally {
        if (mounted) setLoadingEstados(false);
      }
    })();
    return () => { mounted = false; };
  }, [pais]);

  // Carrega cidades ao escolher estado
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!pais || !uf) { setCidadesLista([]); setCidade(''); return; }
      try {
        setLoadingCidades(true);
        setErrorLocal(null);
        const res = await fetch(`/api/location/cities?country=${encodeURIComponent(pais)}&state=${encodeURIComponent(uf)}`);
        const json = await res.json();
        if (!res.ok || json?.status !== 'success') throw new Error(json?.message || 'Falha ao carregar cidades');
        if (mounted) setCidadesLista(json.data as CityItem[]);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Erro ao carregar cidades';
        if (mounted) setErrorLocal(message);
      } finally {
        if (mounted) setLoadingCidades(false);
      }
    })();
    return () => { mounted = false; };
  }, [pais, uf]);

  // Handlers para impedir fechamento dos modais obrigatórios por overlay/Escape
  const handleBlockCloseLocal = (nextOpen: boolean) => {
    if (nextOpen) setOpenModalLocal(true);
  };

  const handleBlockClosePerfil = (nextOpen: boolean) => {
    if (nextOpen) setOpenModalPerfil(true);
  };

  function avancarParaPerfil() {
    if (!pais || !uf || !cidade) return; // validação simples
    if (!aceitouTermos) return;
    setOpenModalLocal(false);
    setOpenModalPerfil(true);
  }

  function cancelarRegistro() {
    // Fecha modais e volta para home
    setOpenModalLocal(false);
    setOpenModalPerfil(false);
    window.location.href = '/';
  }

  function escolher(tipoEscolhido: TipoCadastro) {
    setTipo(tipoEscolhido);
    setOpenModalPerfil(false);
    // TODO: Pré-preencher os formulários com { pais, uf, cidade }
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
                <CardTitle>{t('register.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {!tipo && (
                  <div className="text-muted-foreground text-sm">
                    Escolha o tipo de cadastro no modal para começar.
                  </div>
                )}

                {tipo === 'investidor' && (
                  <InvestorForm cidadeInicial={cidade} ufInicial={uf} paisInicial={pais} termo={aceitouTermos} ddi={DDI} />
                )}

                {tipo === 'startup' && (
                  <StartupForm cidadeInicial={cidade} ufInicial={uf} paisInicial={pais} termo={aceitouTermos} ddi={DDI} />
                )}

                {tipo === 'afiliado' && (
                  <AffiliateForm cidadeInicial={cidade} ufInicial={uf} paisInicial={pais} termo={aceitouTermos} ddi={DDI} />
                )}

                {tipo && (
                  <>
                    {/* Info da localização selecionada (somente visual por enquanto) */}
                    {/* <div className="mb-2 text-xs text-muted-foreground">
                      <span>
                        Localização: {cidade || '-'} / {uf || '-'} - {pais || '-'}
                      </span>
                    </div> */}
                    <div className="pt-4 text-center text-sm">
                      <Link
                        href="/login"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {t('register.login.button')}
                      </Link>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Modal 1: País / Estado / Cidade + Termos */}
        <Dialog open={openModalLocal} onOpenChange={handleBlockCloseLocal}>
          <DialogContent
            className="sm:max-w-lg"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            overlayClassName="bg-black/70 backdrop-blur-sm sm:backdrop-blur"
            showCloseButton={false}
          >
            <DialogHeader>
              <DialogTitle>Informe sua localização</DialogTitle>
              <DialogDescription>
                Selecione país, estado/província e cidade. Aceite os termos para continuar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-1">
                <label className="text-sm font-medium" htmlFor="pais">País</label>
                <select
                  id="pais"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={pais}
                  onChange={(e) => {
                    setPais(e.target.value);
                    setUf('');
                    setCidade('');
                  }}
                  disabled={loadingPaises}
                >
                  <option value="" disabled>Selecione</option>
                  {paisesLista.map((p) => {
                    const flag = codeToFlagEmoji(p.code);
                    // Usa tradução com fallback para o nome original
                    const translated = t(`countries.${p.code}`, { defaultValue: p.name });
                    return (
                      <option key={p.name} value={p.code}>
                        {flag ? `${flag} ` : ''}{translated}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium" htmlFor="uf">Estado/Província</label>
                <select
                  id="uf"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={uf}
                  onChange={(e) => {
                    setUf(e.target.value);
                    setCidade('');
                  }}
                  disabled={!pais || loadingEstados}
                >
                  <option value="" disabled>Selecione</option>
                  {estadosLista.map((e) => (
                    <option key={e.code} value={e.code}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium" htmlFor="cidade">Cidade</label>
                <select
                  id="cidade"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  disabled={!uf || loadingCidades}
                >
                  <option value="" disabled>Selecione</option>
                  {cidadesLista.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {errorLocal && (
                <p className="text-xs text-red-500" role="alert">{errorLocal}</p>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="termos"
                  type="checkbox"
                  checked={aceitouTermos}
                  onChange={(e) => setAceitouTermos(e.target.checked)}
                />
                <label htmlFor="termos" className="text-sm">
                  Eu li e aceito os{' '}
                  <button type="button" className="text-primary underline" onClick={() => setOpenModalTermos(true)}>Termos de Uso</button>
                  {' '}e a{' '}
                  <button type="button" className="text-primary underline" onClick={() => setOpenModalPolitica(true)}>Política de Privacidade</button>
                </label>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={cancelarRegistro}>Cancelar</Button>
                <div className="flex items-center gap-2">
                  {/* Voltar não faz nada aqui pois é o primeiro modal */}
                  <Button onClick={avancarParaPerfil} disabled={!pais || !uf || !cidade || !aceitouTermos}>Próximo</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal 2: Seleção de Perfil */}
        <Dialog open={openModalPerfil} onOpenChange={handleBlockClosePerfil}>
          <DialogContent
            className="sm:max-w-md"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            overlayClassName="bg-black/70 backdrop-blur-sm sm:backdrop-blur"
            showCloseButton={false}
          >
            <DialogHeader>
              <DialogTitle>Como você quer se registrar?</DialogTitle>
              <DialogDescription>
                Escolha uma opção para mostrar o formulário adequado.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" onClick={() => escolher('investidor')}>Sou Investidor</Button>
              <Button onClick={() => escolher('startup')}>Sou Startup</Button>
              <Button onClick={() => escolher('afiliado')}>Sou Afiliado</Button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={cancelarRegistro}>Cancelar</Button>
              <Button variant="secondary" onClick={() => { setOpenModalPerfil(false); setOpenModalLocal(true); }}>Voltar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Termos de Uso */}
        <Dialog open={openModalTermos} onOpenChange={setOpenModalTermos}>
          <DialogContent className="sm:max-w-2xl" overlayClassName="bg-black/70 backdrop-blur-sm sm:backdrop-blur">
            <DialogHeader>
              <DialogTitle>Termos de Uso</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 text-sm">
              <p>Este é um texto de exemplo para os Termos de Uso. Substituir por conteúdo real ou i18n.</p>
              <p>Ao continuar, você concorda com as condições descritas.</p>
            </div>
            <div className="mt-2 flex justify-end">
              <Button onClick={() => setOpenModalTermos(false)}>Li os termos</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Política de Privacidade */}
        <Dialog open={openModalPolitica} onOpenChange={setOpenModalPolitica}>
          <DialogContent className="sm:max-w-2xl" overlayClassName="bg-black/70 backdrop-blur-sm sm:backdrop-blur">
            <DialogHeader>
              <DialogTitle>Política de Privacidade</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 text-sm">
              <p>Este é um texto de exemplo para a Política de Privacidade. Substituir por conteúdo real ou i18n.</p>
              <p>Detalhes sobre coleta, armazenamento e uso de dados pessoais.</p>
            </div>
            <div className="mt-2 flex justify-end">
              <Button onClick={() => setOpenModalPolitica(false)}>Li a política</Button>
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
