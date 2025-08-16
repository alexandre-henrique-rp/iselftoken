import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">404 - Página Não Encontrada</h1>
      <p className="text-lg mt-4">A página que você procura não existe.</p>
      <Button asChild className="mt-6">
        <Link href="/">Voltar para a Home</Link>
      </Button>
    </div>
  )
}

