'use client'

import { Control, UseFormGetValues, useWatch } from 'react-hook-form'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Controller } from 'react-hook-form'
import { currency, unMask } from 'remask'
import { TrendingUp } from 'lucide-react'

interface InvestimentoSectionProps {
  control: Control<any>
  getValues: UseFormGetValues<any>
}

export function InvestimentoSection({
  control,
  getValues,
}: InvestimentoSectionProps) {

  const metaCaptacao = useWatch({
    control,
    name: 'meta_captacao',
  })

  const equityOferecido = useWatch({
    control,
    name: 'equity_oferecido',
  })

  // Cálculo do valuation: meta_captacao / (equity_oferecido / 100)
  const valuation = useMemo(() => {
    if (!metaCaptacao || !equityOferecido || equityOferecido === 0) {
      return 0
    }
    return metaCaptacao / (equityOferecido / 100)
  }, [metaCaptacao, equityOferecido])

  const isButtonEnabled = metaCaptacao >= 100000 && equityOferecido > 0

  const handleReserveClick = () => {
    const startupNome = getValues('nome')
    const meta = getValues('meta_captacao')
    const equity = getValues('equity_oferecido')

    if (!startupNome) {
      toast.error('Por favor, preencha o nome da startup primeiro.')
      return
    }

    const tokens = Math.round(meta / 200)
    const valorReserva = tokens * 200

    const checkoutData = {
      startupNome,
      produto: `Reserva de ${tokens} Tokens iSelf para ${startupNome}`,
      valorReserva,
      tokens,
      equityOferecido: equity,
      rotaRedirec: '/dashboard_startups',
    }

    localStorage.setItem('checkoutData', JSON.stringify(checkoutData))
    window.open('/checkout', '_blank')

  }

  return (
    <Card className="bg-card text-card-foreground border-border border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-foreground text-xl">
          Informações de Investimento
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Defina os valores de captação e participação societária oferecida
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Controller
            control={control}
            name="meta_captacao"
            render={({ field, fieldState: { error } }) => (
              <FormItem className="flex h-full flex-col gap-2">
                <FormLabel className="text-sm font-medium">
                  Meta de Captação (R$)
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="R$ 0,00"
                    className="h-10"
                    value={currency.mask({
                      locale: 'pt-BR',
                      currency: 'BRL',
                      value: field.value,
                    })}
                    onChange={(e) => {
                      const unmaskedValue = currency.unmask({
                        locale: 'pt-BR',
                        currency: 'BRL',
                        value: e.target.value,
                      })
                      field.onChange(Number(unmaskedValue))
                    }}
                  />
                </FormControl>
                <p className="text-muted-foreground text-xs">
                  Consulte a validação de acordo com o estágio.
                </p>
                {error && <FormMessage>{error.message}</FormMessage>}
              </FormItem>
            )}
          />

          <Controller
            control={control}
            name="equity_oferecido"
            render={({ field, fieldState: { error } }) => (
              <FormItem className="flex h-full flex-col gap-2">
                <FormLabel className="text-sm font-medium">
                  Equity Oferecido (%)
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="0%"
                    className="h-10"
                    value={field.value}
                    onChange={(e) => {
                      const numericValue = unMask(e.target.value)
                      field.onChange(Number(numericValue))
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Percentual de participação societária oferecida aos investidores
                </FormDescription>
                {error && <FormMessage>{error.message}</FormMessage>}
              </FormItem>
            )}
          />

          {/* Campo Calculado: Valuation */}
          <div className="lg:col-span-2">
            <FormItem className="flex h-full flex-col gap-2">
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Valuation Calculado
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    readOnly
                    value={currency.mask({
                      locale: 'pt-BR',
                      currency: 'BRL',
                      value: valuation,
                    })}
                    className="h-10 bg-muted/50 text-foreground font-semibold text-lg cursor-not-allowed"
                  />
                  {valuation > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="text-xs text-primary font-medium">Auto-calculado</span>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Valor de avaliação da empresa (Fórmula: Meta de Captação ÷ Equity Oferecido)
              </FormDescription>
            </FormItem>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-2 lg:flex-row lg:items-center lg:justify-end">
            <Button
              className="bg-[#d500f9] text-white hover:bg-[#d500f9]/90 h-10 w-full font-medium transition-colors lg:w-auto"
              disabled={!isButtonEnabled}
              type="button"
              onClick={handleReserveClick}
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
                <FormLabel className="text-sm font-medium">
                  Objetivo do Investimento
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva como pretende usar o investimento"
                    className="h-full min-h-[100px] resize-none"
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