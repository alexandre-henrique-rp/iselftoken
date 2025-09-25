'use client'

import { Control, UseFormGetValues, useWatch } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
import { Controller } from 'react-hook-form'
import { currency, unMask } from 'remask'

interface InvestimentoSectionProps {
  control: Control<any>
  getValues: UseFormGetValues<any>
}

export function InvestimentoSection({
  control,
  getValues,
}: InvestimentoSectionProps) {
  const router = useRouter()

  const metaCaptacao = useWatch({
    control,
    name: 'meta_captacao',
  })

  const equityOferecido = useWatch({
    control,
    name: 'equity_oferecido',
  })

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
    router.push('/checkout')
  }

  return (
    <Card className="bg-card text-card-foreground border-border border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-foreground text-xl">
          Informações de Investimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-3">
          <Controller
            control={control}
            name="meta_captacao"
            render={({ field, fieldState: { error } }) => (
              <FormItem className="h-full">
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
              <FormItem className="h-full">
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
                {error && <FormMessage>{error.message}</FormMessage>}
              </FormItem>
            )}
          />

          <div className="flex h-full items-end">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full font-medium transition-colors"
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