export const dynamic = 'force-dynamic'

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StartupForm } from '@/components/dashboard_startup/startup-form'

export const metadata: Metadata = {
  title: 'Editar Startup | iSelfToken',
  description: 'Edite as informações da sua startup',
}

interface EditarStartupPageProps {
  params: Promise<{ id: string }>
}

const getStartup = async (id: string) => {
  try {
    const response = await fetch(`http://localhost:3000/api/startup/${id}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Erro ao buscar startup')
    }

    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar startup:', error)
    throw error
  }
}

export default async function EditarStartupPage({ params }: EditarStartupPageProps) {
  const { id } = await params

  const startup = await getStartup(id)

  if (!startup) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Editar Startup</h1>
            <p className="text-muted-foreground text-lg">
              Edite as informações da startup <strong className="text-foreground">{startup.nome}</strong>
            </p>
          </div>

          {/* Form */}
          <StartupForm mode="edit" initialData={startup} />
        </div>
      </div>
    </div>
  )
}