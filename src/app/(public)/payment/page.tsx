'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Clipboard, Loader2 } from 'lucide-react'

interface CheckoutData {
  valorReserva: number
  rotaRedirec: string
}

type PaymentStatus = 'pending' | 'confirmed'

export default function PaymentPage() {
  const router = useRouter()
  const [data, setData] = useState<CheckoutData | null>(null)
  const [status, setStatus] = useState<PaymentStatus>('pending')
  const [isLoading, setIsLoading] = useState(true)

  const pixCode = '00020126330014br.gov.bcb.pix01111234567890125204000053039865802BR5913NOME DO VENDEDOR6008BRASILIA62070503***6304E4A9'

  useEffect(() => {
    const storedData = localStorage.getItem('checkoutData')
    if (storedData) {
      const parsedData: CheckoutData = JSON.parse(storedData)
      setData(parsedData)
    } else {
      router.replace('/')
      return
    }
    setIsLoading(false)
  }, [router])

  useEffect(() => {
    if (data) {
      const interval = setInterval(() => {
        // Simulate payment confirmation
        setStatus('confirmed')
        clearInterval(interval)
      }, 5000) // 5-second delay to simulate payment processing

      return () => clearInterval(interval)
    }
  }, [data])

  useEffect(() => {
    if (status === 'confirmed' && data) {
      toast.success('Pagamento confirmado com sucesso!')
      const redirectTimeout = setTimeout(() => {
        localStorage.removeItem('checkoutData')
        router.push(data.rotaRedirec)
      }, 2000) // 2-second delay to show success message

      return () => clearTimeout(redirectTimeout)
    }
  }, [status, data, router])

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode).then(() => {
      toast.success('Código PIX copiado para a área de transferência!')
    })
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
      <div className="container mx-auto max-w-md">
        <Card className="bg-card text-card-foreground border-border shadow-lg rounded-xl overflow-hidden">
          {status === 'pending' ? (
            <>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">Efetue o Pagamento PIX</CardTitle>
                <CardDescription className="text-muted-foreground text-center">
                  Escaneie o QR Code ou copie o código abaixo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 py-6 flex flex-col items-center">
                <Image
                  src="https://placehold.co/300x300/png?text=QRCode"
                  alt="QR Code PIX"
                  width={300}
                  height={300}
                  className="rounded-lg border-4 border-border p-2"
                />
                <div className="w-full space-y-4">
                  <p className="text-sm font-medium text-muted-foreground text-center">Ou copie a linha digitável:</p>
                  <div className="bg-muted/30 border-border border rounded-lg p-3 text-center text-sm break-all">
                    {pixCode}
                  </div>
                  <Button
                    className="bg-blue text-blue-foreground hover:bg-blue/90 w-full"
                    onClick={handleCopy}
                  >
                    <Clipboard className="mr-2 h-4 w-4" />
                    Copiar Código
                  </Button>
                </div>
                <Separator className="bg-border my-6" />
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Aguardando confirmação de pagamento...</span>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <CheckCircle className="h-24 w-24 text-green" />
                <h2 className="text-2xl font-bold text-green">Pagamento Aprovado!</h2>
                <p className="text-muted-foreground text-center">
                  Você será redirecionado em breve.
                </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}