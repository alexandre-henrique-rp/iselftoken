import { Control, UseFormGetValues } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'
import { currency } from 'remask'

interface InvestimentoSectionProps {
  control: Control<any>
  getValues: UseFormGetValues<any>
}

export function InvestimentoSection({ control, getValues }: InvestimentoSectionProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatCurrencyInput = (value: string) => {
    const limpo = currency.unmask({ locale: 'pt-BR', currency: 'BRL', value: value });
    // Se não for um número válido, retorna vazio
    if (isNaN(limpo)) return '';

    // Se for 0, retorna R$ 0,00
    if (limpo === 0) return 'R$ 0,00';

    const maskedValue = currency.mask({ locale: 'pt-BR', currency: 'BRL', value: limpo });

    // Formata como moeda brasileira
    return maskedValue;
  }

  const handleCurrencyChange = (value: string, field: any) => {
    // Remove tudo que não é dígito para armazenar o valor numérico
    const numericValue = currency.unmask({
      locale: 'pt-BR',
      currency: 'BRL',
      value: value,
    });

    // Se não houver valor numérico ou for 0, define como 0
    const numberValue = numericValue || 0;

    // Atualiza o campo do formulário com o valor numérico (como float)
    field.onChange(Number(numberValue));
  }

  return (
    <Card className="bg-card text-card-foreground shadow-sm border border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-foreground text-xl">Informações de Investimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campos de investimento e botão na mesma linha */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
          <div className="flex flex-col justify-end h-full">
            <FormField
              control={control}
              name="meta_captacao"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">Meta de Captação (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      className="h-10"
                      value={formatCurrencyInput(field.value?.toString() || '')}
                      onChange={(e) => handleCurrencyChange(e.target.value, field)}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Valor mínimo: R$ 100.000,00 | Valor máximo: R$ 15.000.000,00
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col justify-end h-full">
            <FormField
              control={control}
              name="equity_oferecido"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">Equity Oferecido (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      placeholder="0.0"
                      className="h-10"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Botão liberado apenas quando os campos estiverem preenchidos */}
          <div className="flex items-end h-full">
            <Button
              className="bg-[#d500f9] hover:bg-[#d500f9]/90 text-white h-10 w-full transition-colors font-medium"
              disabled={getValues('meta_captacao') < 100000 || getValues('equity_oferecido') <= 0}
              type="button"
              onClick={() => {
                // Calcula os tokens baseado na meta de captação
                const metaCaptacao = getValues('meta_captacao');
                const tokens = Math.round(metaCaptacao / 200);

                // Calcula o valor da reserva (tokens * R$ 200)
                const valorReserva = tokens * 200;

                // Calcula o equity baseado nos tokens (20% por token)
                const equityTotal = tokens * 20;

                console.log('=== RESERVA DE TOKEN ===');
                console.log('Meta de Captação (R$):', formatCurrency(metaCaptacao));
                console.log('Tokens calculados:', tokens);
                console.log('Valor da reserva (R$):', formatCurrency(valorReserva));
                console.log('Equity total (%):', equityTotal);
                console.log('=======================');

                toast.success(`Toque reservado com sucesso! ${tokens} tokens por ${formatCurrency(valorReserva)} (${equityTotal}% de equity)`);
              }}
            >
              Reservar Toque
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-end">
          <FormField
            control={control}
            name="descricao_objetivo"
            render={({ field }) => (
              <FormItem className="h-full">
                <FormLabel className="text-sm font-medium">Objetivo do Investimento</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva como pretende usar o investimento"
                    className="resize-none min-h-[100px] h-full"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}