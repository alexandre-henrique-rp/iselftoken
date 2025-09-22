export const dynamic = 'force-dynamic'

import { Metadata } from 'next'
import { StartupForm } from '@/components/dashboard_startup/startup-form'

export const metadata: Metadata = {
  title: 'Nova Startup | iSelfToken',
  description: 'Cadastre uma nova startup na plataforma',
}

export default function NovaStartupPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nova Startup</h1>
            <p className="text-muted-foreground text-lg">
              Cadastre sua startup na plataforma para começar a captar investimentos
            </p>
          </div>

          {/* Form */}
          <StartupForm mode="create" />
        </div>
      </div>
    </div>
  )
}