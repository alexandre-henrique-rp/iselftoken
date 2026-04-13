'use client';

import Checkout from '@/components/chekout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getLimitesMetaCaptacao,
  validarMetaCaptacao,
} from '@/config/meta-captacao-limits';
import { useSession } from '@/hooks/useSession';
import { CircleDollarSignIcon } from 'lucide-react';
import { useState } from 'react';

interface NovaCampanhaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startupId: number;
  startupNome: string;
  startupEstagio?: string;
}

export function NovaCampanhaModal({
  open,
  onOpenChange,
  startupId,
  startupNome,
  startupEstagio = 'Ideação', // Valor padrão
}: NovaCampanhaModalProps) {
  const { apiUser } = useSession();
  const [metaCaptacao, setMetaCaptacao] = useState<number>(0);
  const [metaCaptacaoMasked, setMetaCaptacaoMasked] = useState<string>('');
  const [equityOferecido, setEquityOferecido] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Constantes
  const VALOR_TOKEN = 200; // R$ 200 por token (valor para investidores)
  const VALOR_RESERVA_TOKEN = 5; // R$ 5 por token (taxa de reserva)

  // Cálculos
  const metaNumerica = metaCaptacao || 0;
  const equityNumerico = parseFloat(equityOferecido) || 0;
  // 1. Meta ÷ 200 = Quantidade de tokens da campanha
  const quantidadeTokensCampanha = metaNumerica / VALOR_TOKEN;
  // 2. Quantidade de reserva = Quantidade de tokens da campanha (mesma divisão)
  const quantidadeReservaNumerica = Math.floor(quantidadeTokensCampanha);
  // 3. Quantidade × R$ 5 = Valor da reserva
  const valorTotalReserva = quantidadeReservaNumerica * VALOR_RESERVA_TOKEN;

  // Obter limites baseados no estágio
  const limitesMeta = getLimitesMetaCaptacao(startupEstagio);
  const metaValidacao = validarMetaCaptacao(metaNumerica, startupEstagio);

  // Formatação
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Validação do formulário
  const isFormValid =
    metaValidacao.valido &&
    equityNumerico >= 1 &&
    equityNumerico <= 50 &&
    metaNumerica > 0; // A quantidade de reserva é calculada automaticamente

  const handleReservarTokens = async () => {
    setIsLoading(true);

    // Capturar todos os dados do formulário
    const dadosCapturados = {
      // Dados do usuário
      usuario: {
        id: apiUser?.id?.toString() || 'unknown',
        nome: apiUser?.nome || 'Usuário não identificado',
        email: apiUser?.email || 'email@naoinformado.com',
      },
      // Dados da startup
      startup: {
        id: startupId,
        nome: startupNome,
        estagio: startupEstagio,
      },
      // Dados da campanha
      campanha: {
        metaCaptacao: metaNumerica,
        equityOferecido: equityNumerico,
        quantidadeTokensCampanha: Math.floor(quantidadeTokensCampanha),
        valorToken: VALOR_TOKEN,
      },
      // Dados da reserva
      reserva: {
        quantidadeTokens: quantidadeReservaNumerica,
        valorTotalReserva: valorTotalReserva,
        valorTokenReserva: VALOR_RESERVA_TOKEN,
        metodoPagamento: 'credit',
      },
      // Timestamp
      timestamp: new Date().toISOString(),
    };

    // Console log com todos os dados capturados
    console.log('🎯 Dados Capturados para Reserva de Tokens:', dadosCapturados);

    // Validar dados antes de enviar para checkout
    if (!apiUser?.nome || !apiUser?.id) {
      console.error('❌ Dados do usuário incompletos:', apiUser);
      alert('Dados do usuário não encontrados. Faça login novamente.');
      setIsLoading(false);
      return;
    }

    if (valorTotalReserva <= 0) {
      console.error('❌ Valor da reserva inválido:', valorTotalReserva);
      alert('Valor da reserva inválido. Verifique os dados.');
      setIsLoading(false);
      return;
    }

    if (quantidadeReservaNumerica <= 0) {
      console.error(
        '❌ Quantidade de tokens inválida:',
        quantidadeReservaNumerica,
      );
      alert('Quantidade de tokens inválida. Verifique os dados.');
      setIsLoading(false);
      return;
    }

    // Chamar função Checkout com os dados formatados
    try {
      const checkoutData = {
        userName: apiUser.nome,
        userId: apiUser.id.toString(),
        valor: `R$ ${valorTotalReserva}`, // Formatar sem pontos de milhar
        productName: `Reserva de ${quantidadeReservaNumerica} tokens - ${startupNome}`,
        productType: 'Reserva de Tokens',
        productDescription: `Reserva de ${quantidadeReservaNumerica} tokens da campanha de ${startupNome} no estágio ${startupEstagio}`,
        quantidade: quantidadeReservaNumerica,
        validity: 365, // 1 ano de validade
        obs: `Meta de captação: ${formatCurrency(metaNumerica)} | Equity: ${equityNumerico}%`,
      };
      const checkoutWindow = Checkout(checkoutData);

      if (checkoutWindow) {
        console.log('✅ Janela de checkout aberta com sucesso');
      } else {
        console.error('❌ Falha ao abrir janela de checkout');
        alert(
          'Não foi possível abrir a janela de pagamento. Verifique se o bloqueador de pop-ups está desativado.',
        );
      }
    } catch (error) {
      console.error('❌ Erro ao chamar Checkout:', error);
      alert('Ocorreu um erro ao processar o pagamento. Tente novamente.');
    }

    // Resetar e fechar modal
    setIsLoading(false);
    onOpenChange(false);

    // Resetar formulário
    setMetaCaptacao(0);
    setEquityOferecido('');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setMetaCaptacao(0);
    setEquityOferecido('');
  };

  const handleMetaCaptacaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Se estiver vazio, resetar para zero
    if (!inputValue.trim()) {
      setMetaCaptacao(0);
      setMetaCaptacaoMasked('');
      return;
    }

    // Remover todos os caracteres não numéricos
    const numerosApenas = inputValue.replace(/[^\d]/g, '');

    // Se não tiver números, resetar
    if (!numerosApenas) {
      setMetaCaptacao(0);
      setMetaCaptacaoMasked('');
      return;
    }

    // Converter para número
    const valorNumerico = parseInt(numerosApenas, 10);

    // Validar se é um número válido
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      return; // Não atualiza se for inválido
    }

    // Limitar a valores razoáveis (máximo 10 milhões)
    if (valorNumerico > 10000000) {
      return;
    }

    // Formatar como moeda brasileira (sem casas decimais)
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valorNumerico);

    setMetaCaptacao(valorNumerico);
    setMetaCaptacaoMasked(valorFormatado);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] overflow-y-auto p-0 lg:w-[85vw] xl:w-[80vw] 2xl:w-[75vw]">
        {/* Header */}
        <DialogHeader className="border-b px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Criar Campanha de Investimento
              </DialogTitle>
              <DialogDescription>
                Investimento em tokens para <strong>{startupNome}</strong>
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-8 p-8 lg:grid-cols-3">
          {/* Main Content - 2/3 width */}
          <div className="space-y-6 lg:col-span-2">
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <CircleDollarSignIcon className="h-5 w-5" />
                  Reservar Tokens
                </h3>

                {/* Product Card Style */}
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-linear-to-br from-purple-500 to-purple-600">
                        <CircleDollarSignIcon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">{startupNome}</h4>
                        <p className="text-gray-600">
                          Campanha de Captação de Tokens
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                            {startupEstagio}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid h-24 grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="meta_captacao">Meta de Captação (R$)</Label>
                    <Input
                      id="meta_captacao"
                      type="text"
                      placeholder={formatCurrency(limitesMeta.sugerido)}
                      value={metaCaptacaoMasked}
                      onChange={handleMetaCaptacaoChange}
                      min={limitesMeta.minimo}
                      max={limitesMeta.maximo}
                      required
                      className={metaValidacao.valido ? '' : 'border-red-500'}
                    />
                    {!metaValidacao.valido && (
                      <p className="text-xs text-red-500">
                        {metaValidacao.erro}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equity">Equity Oferecido (%)</Label>
                    <Input
                      id="equity"
                      type="number"
                      placeholder="15"
                      value={equityOferecido}
                      onChange={(e) => setEquityOferecido(e.target.value)}
                      min="1"
                      max="50"
                      required
                    />
                  </div>
                </div>

                {/* Preview Cards */}
                {metaNumerica > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Card className="border-purple-200 bg-purple-50">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-700">
                          {formatNumber(Math.floor(quantidadeTokensCampanha))}
                        </div>
                        <div className="text-sm text-purple-600">
                          Tokens (Campanha + Reserva)
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-700">
                          {formatCurrency(valorTotalReserva)}
                        </div>
                        <div className="text-sm text-green-600">
                          Valor da Reserva
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-end border-t pt-6">
              <Button
                onClick={handleReservarTokens}
                disabled={isLoading || !isFormValid}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading
                  ? 'Processando...'
                  : `Reservar Tokens - ${formatCurrency(valorTotalReserva)}`}
                <CircleDollarSignIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Cart Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-purple-500" />
                    Resumo da Compra
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Startup:</span>
                      <span className="text-sm font-medium">{startupNome}</span>
                    </div>

                    {metaNumerica > 0 && (
                      <>
                        <div className="my-2 border-t" />
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Meta de Captação:
                          </span>
                          <span className="text-sm font-medium">
                            {formatCurrency(metaNumerica)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Equity Oferecido:
                          </span>
                          <span className="text-sm font-medium">
                            {equityNumerico}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            Tokens (Campanha + Reserva):
                          </span>
                          <span className="text-sm font-medium">
                            {formatNumber(Math.floor(quantidadeTokensCampanha))}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="my-2 border-t" />
                    <div className="flex justify-between">
                      <span className="font-medium">Total a Pagar:</span>
                      <span className="text-lg font-bold text-purple-600">
                        {formatCurrency(valorTotalReserva)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Benefits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Benefícios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-4 w-4 rounded-full bg-green-500" />
                    <span>Tokens garantidos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-4 w-4 rounded-full bg-green-500" />
                    <span>Acesso prioritário</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-4 w-4 rounded-full bg-green-500" />
                    <span>Suporte dedicado</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
