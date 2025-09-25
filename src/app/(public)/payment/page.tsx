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
import { CheckCircle, Clipboard, Loader2, RefreshCw } from 'lucide-react'

import { TrText } from '@/components/tr-text'

interface CheckoutData {
  valorReserva: number
  rotaRedirec: string
}

type PaymentStatus = 'pending' | 'confirmed' | 'expired'

export default function PaymentPage() {
  const router = useRouter()
  const [data, setData] = useState<CheckoutData | null>(null)
  const [status, setStatus] = useState<PaymentStatus>('pending')
  const [isLoading, setIsLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isVerifying, setIsVerifying] = useState(false)

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

  // Contador regressivo de 30 segundos
  useEffect(() => {
    if (status === 'pending' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (status === 'pending' && timeLeft === 0) {
      setStatus('expired')
    }
  }, [status, timeLeft])

  // Simular confirmação de pagamento após 30 segundos (para demonstração)
  useEffect(() => {
    if (data && status === 'pending') {
      const interval = setTimeout(() => {
        setStatus('confirmed')
      }, 30000) // 30 segundos

      return () => clearInterval(interval)
    }
  }, [data, status])

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode).then(() => {
      toast.success('Código PIX copiado para a área de transferência!')
    })
  }

  const handleVerifyPayment = async () => {
    setIsVerifying(true)
    try {
      // Simular verificação de pagamento
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (status === 'confirmed') {
        toast.success('Pagamento confirmado com sucesso!')
        localStorage.removeItem('checkoutData')
        // Fechar a aba atual
        window.close()
      } else {
        toast.error('Pagamento ainda não foi confirmado. Tente novamente em alguns instantes.')
      }
    } catch {
      toast.error('Erro ao verificar pagamento. Tente novamente.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleRevalidatePix = () => {
    setStatus('pending')
    setTimeLeft(30)
    toast.success('PIX revalidado! Tempo reiniciado.')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
                <CardTitle className="text-2xl font-bold text-center">
                  <TrText k="payment.title" />
                </CardTitle>
                <CardDescription className="text-muted-foreground text-center">
                  <TrText k="payment.description" />
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
                  <p className="text-sm font-medium text-muted-foreground text-center">
                    <TrText k="payment.copy_code" />
                  </p>
                  <div className="bg-muted/30 border-border border rounded-lg p-3 text-center text-sm break-all">
                    {pixCode}
                  </div>
                  <Button
                    className="bg-blue text-blue-foreground hover:bg-blue/90 w-full"
                    onClick={handleCopy}
                  >
                    <Clipboard className="mr-2 h-4 w-4" />
                    <TrText k="payment.copy_button" />
                  </Button>
                </div>
                <Separator className="bg-border my-6" />
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>
                    <TrText k="payment.waiting_confirmation" /> {formatTime(timeLeft)}
                  </span>
                </div>
                <Button
                  className="bg-green text-green-foreground hover:bg-green/90 w-full"
                  onClick={handleVerifyPayment}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  <TrText k="payment.verify_button" />
                </Button>
              </CardContent>
            </>
          ) : status === 'expired' ? (
            <>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center text-orange-600">
                  <TrText k="payment.expired_title" />
                </CardTitle>
                <CardDescription className="text-muted-foreground text-center">
                  <TrText k="payment.expired_description" />
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 py-6 flex flex-col items-center">
                <div className="w-full space-y-4">
                  <Button
                    className="bg-blue text-blue-foreground hover:bg-blue/90 w-full"
                    onClick={handleRevalidatePix}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <TrText k="payment.revalidate_button" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <CheckCircle className="h-24 w-24 text-green" />
                <h2 className="text-2xl font-bold text-green">
                  <TrText k="payment.success_title" />
                </h2>
                <p className="text-muted-foreground text-center">
                  <TrText k="payment.success_message" />
                </p>
                <Button
                  className="bg-green text-green-foreground hover:bg-green/90"
                  onClick={handleVerifyPayment}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  <TrText k="payment.close_tab_button" />
                </Button>
              </div>
          )}
        </Card>
      </div>
    </div>
  )
}