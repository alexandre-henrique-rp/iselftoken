'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, CreditCard } from 'lucide-react'

interface CheckoutData {
  startupNome: string
  produto: string
  valorReserva: number
  tokens: number
  equityOferecido: number
  rotaRedirec: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const [data, setData] = useState<CheckoutData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedData = localStorage.getItem('checkoutData')
    if (storedData) {
      setData(JSON.parse(storedData))
    } else {
      // If no data, redirect to home to prevent empty checkout page
      router.replace('/')
    }
    setIsLoading(false)
  }, [router])

  const handleConfirm = () => {
    router.push('/payment')
  }

  const handleCancel = () => {
    localStorage.removeItem('checkoutData')
    router.back()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground min-h-screen w-full flex items-center justify-center p-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="bg-card text-card-foreground border-border shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Resumo da Reserva</CardTitle>
            <CardDescription className="text-muted-foreground">
              Confirme os detalhes da sua reserva de tokens para a startup {' '}
              <span className="font-semibold text-primary">{data.startupNome}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Produto</span>
                <span className="font-semibold text-right">{data.produto}</span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Quantidade de Tokens</span>
                <span className="font-semibold">{data.tokens.toLocaleString('pt-BR')}</span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Equity Oferecido</span>
                <span className="font-semibold">{data.equityOferecido}%</span>
              </div>
            </div>
            <Separator className="bg-border my-6" />
            <div className="flex justify-between items-center text-xl font-bold">
              <span className="text-foreground">Valor Total</span>
              <span className="text-primary">{formatCurrency(data.valorReserva)}</span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-4 p-6 bg-muted/20 rounded-b-xl">
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
              onClick={handleConfirm}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Confirmar e ir para Pagamento
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
