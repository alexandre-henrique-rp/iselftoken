'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface NovaCampanhaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startupId: number;
  startupNome: string;
}

export function NovaCampanhaModal({
  open,
  onOpenChange,
  startupId,
  startupNome,
}: NovaCampanhaModalProps) {
  const [metaCaptacao, setMetaCaptacao] = useState<string>('');
  const [equityOferecido, setEquityOferecido] = useState<string>('');
  const [quantidadeTokensReserva, setQuantidadeTokensReserva] =
    useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Constantes
  const VALOR_TOKEN = 200; // R$ 200 por token (campanha)
  const VALOR_RESERVA_TOKEN = 5; // R$ 5 por token (reserva)

  // Cálculos
  const metaNumerica = parseFloat(metaCaptacao) || 0;
  const equityNumerico = parseFloat(equityOferecido) || 0;
  const quantidadeTokensCampanha = metaNumerica / VALOR_TOKEN;
  const quantidadeReservaNumerica = parseInt(quantidadeTokensReserva) || 0;
  const valorTotalReserva = quantidadeReservaNumerica * VALOR_RESERVA_TOKEN;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validações
    if (!metaCaptacao || !equityOferecido || !quantidadeTokensReserva) {
      alert('Por favor, preencha todos os campos.');
      setIsLoading(false);
      return;
    }

    if (metaNumerica < 10000) {
      alert('A meta de captação deve ser de no mínimo R$ 10.000.');
      setIsLoading(false);
      return;
    }

    if (equityNumerico < 1 || equityNumerico > 50) {
      alert('O equity oferecido deve estar entre 1% e 50%.');
      setIsLoading(false);
      return;
    }

    if (quantidadeReservaNumerica < 1) {
      alert('A quantidade de tokens de reserva deve ser de no mínimo 1.');
      setIsLoading(false);
      return;
    }

    if (quantidadeReservaNumerica > quantidadeTokensCampanha) {
      alert(
        `A quantidade de tokens de reserva não pode ser maior que a quantidade de tokens da campanha (${formatNumber(Math.floor(quantidadeTokensCampanha))}).`,
      );
      setIsLoading(false);
      return;
    }

    // Simulação de criação da campanha e compra de reserva
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Dados da campanha
    const novaCampanha = {
      startupId,
      meta_captacao: metaNumerica,
      equity_oferecido: equityNumerico,
      quantidade_tokens: quantidadeTokensCampanha,
      valor_token: VALOR_TOKEN,
      quantidade_reserva_tokens: quantidadeReservaNumerica,
      valor_reserva_total: valorTotalReserva,
      status: 'Em Análise',
      dt_inicio: new Date().toISOString().split('T')[0],
      dt_fim: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 6 meses
    };

    console.log('Nova campanha criada:', novaCampanha);

    // Fechar modal e limpar formulário
    onOpenChange(false);
    setMetaCaptacao('');
    setEquityOferecido('');
    setQuantidadeTokensReserva('');
    setIsLoading(false);

    // Mostrar mensagem de sucesso
    alert(
      `Campanha criada com sucesso!\n\nResumo:\n• Meta: ${formatCurrency(metaNumerica)}\n• Equity: ${equityNumerico}%\n• Tokens da Campanha: ${formatNumber(Math.floor(quantidadeTokensCampanha))}\n• Tokens de Reserva: ${formatNumber(quantidadeReservaNumerica)}\n• Valor da Reserva: ${formatCurrency(valorTotalReserva)}\n• Valor por Token (Campanha): ${formatCurrency(VALOR_TOKEN)}\n• Valor por Token (Reserva): ${formatCurrency(VALOR_RESERVA_TOKEN)}`,
    );
  };

  const handleCancel = () => {
    onOpenChange(false);
    setMetaCaptacao('');
    setEquityOferecido('');
    setQuantidadeTokensReserva('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Nova Campanha de Captação
                </h2>
                <p className="text-sm text-gray-500">
                  Crie uma nova campanha para <strong>{startupNome}</strong>
                </p>
              </div>
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
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Dados da Campanha */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Calculator className="h-5 w-5" />
              Dados da Campanha
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="meta_captacao">Meta de Captação (R$)</Label>
                <Input
                  id="meta_captacao"
                  type="number"
                  placeholder="500000"
                  value={metaCaptacao}
                  onChange={(e) => setMetaCaptacao(e.target.value)}
                  min="10000"
                  step="1000"
                  required
                />
                <p className="text-muted-foreground text-xs">
                  Mínimo: R$ 10.000
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equity_oferecido">Equity Oferecido (%)</Label>
                <Input
                  id="equity_oferecido"
                  type="number"
                  placeholder="15"
                  value={equityOferecido}
                  onChange={(e) => setEquityOferecido(e.target.value)}
                  min="1"
                  max="50"
                  step="0.1"
                  required
                />
                <p className="text-muted-foreground text-xs">Entre 1% e 50%</p>
              </div>
            </div>
          </div>

          {/* Cálculos de Tokens da Campanha */}
          {metaNumerica > 0 && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Calculator className="h-5 w-5" />
                Tokens da Campanha
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-muted-foreground text-sm font-medium">
                      Quantidade de Tokens
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatNumber(Math.floor(quantidadeTokensCampanha))}
                    </div>
                    <CardDescription className="text-xs">
                      Tokens disponíveis para investimento
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-muted-foreground text-sm font-medium">
                      Valor por Token
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(VALOR_TOKEN)}
                    </div>
                    <CardDescription className="text-xs">
                      Valor fixo por token na campanha
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-muted-foreground text-sm font-medium">
                      Equity por Token
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {(
                        equityNumerico / Math.floor(quantidadeTokensCampanha)
                      ).toFixed(4)}
                      %
                    </div>
                    <CardDescription className="text-xs">
                      % da empresa por token
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Reserva de Tokens */}
          {quantidadeTokensCampanha > 0 && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <ShoppingCart className="h-5 w-5" />
                Compra de Reserva de Tokens
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quantidade_reserva">
                    Quantidade de Tokens para Reserva
                  </Label>
                  <Input
                    id="quantidade_reserva"
                    type="number"
                    placeholder="10"
                    value={quantidadeTokensReserva}
                    onChange={(e) => setQuantidadeTokensReserva(e.target.value)}
                    min="1"
                    max={Math.floor(quantidadeTokensCampanha)}
                    required
                  />
                  <p className="text-muted-foreground text-xs">
                    Máximo: {formatNumber(Math.floor(quantidadeTokensCampanha))}{' '}
                    tokens
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Valor Total da Reserva</Label>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(valorTotalReserva)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatCurrency(VALOR_RESERVA_TOKEN)} por token
                  </p>
                </div>
              </div>

              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-800">
                        Resumo da Compra:
                      </span>
                    </div>
                    <div className="ml-6 space-y-1 text-orange-700">
                      <div>
                        • Tokens de Reserva:{' '}
                        {formatNumber(quantidadeReservaNumerica)}
                      </div>
                      <div>
                        • Valor por Token: {formatCurrency(VALOR_RESERVA_TOKEN)}
                      </div>
                      <div>
                        • Valor Total: {formatCurrency(valorTotalReserva)}
                      </div>
                      <div>
                        • Tokens Restantes para Campanha:{' '}
                        {formatNumber(
                          Math.floor(quantidadeTokensCampanha) -
                            quantidadeReservaNumerica,
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Fórmula do Cálculo */}
          {metaNumerica > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">Fórmulas:</span>
                  </div>
                  <div className="text-muted-foreground ml-6 space-y-1">
                    <div>• Tokens da Campanha = Meta de Captação ÷ R$ 200</div>
                    <div>
                      • Tokens da Campanha = {formatCurrency(metaNumerica)} ÷{' '}
                      {formatCurrency(VALOR_TOKEN)} ={' '}
                      {formatNumber(Math.floor(quantidadeTokensCampanha))}{' '}
                      tokens
                    </div>
                    <div>• Valor da Reserva = Tokens de Reserva × R$ 5</div>
                    <div>
                      • Valor da Reserva ={' '}
                      {formatNumber(quantidadeReservaNumerica)} ×{' '}
                      {formatCurrency(VALOR_RESERVA_TOKEN)} ={' '}
                      {formatCurrency(valorTotalReserva)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !metaCaptacao ||
                !equityOferecido ||
                !quantidadeTokensReserva
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? 'Processando...' : 'Criar Campanha e Pagar Reserva'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
