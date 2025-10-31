export const dynamic = 'force-dynamic'

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StartupFormEdit } from '@/components/dashboard_startup/startup-form-edit'
import { Skeleton } from '@/components/ui/skeleton'
import { Suspense } from 'react'

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

// Componente de loading para Skeleton
function StartupFormSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Skeleton className="h-8 sm:h-10 w-20 sm:w-24" />
      <div className="space-y-3 sm:space-y-4">
        <Skeleton className="h-10 sm:h-12 w-full" />
        <Skeleton className="h-[400px] sm:h-[500px] lg:h-[600px] w-full" />
        <Skeleton className="h-9 sm:h-10 w-28 sm:w-32 ml-auto" />
      </div>
    </div>
  )
}

export default async function EditarStartupPage({ params }: EditarStartupPageProps) {
  const { id } = await params

  const startup = await getStartup(id)

  if (!startup) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Editar Startup</h1>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
              Atualize as informações da startup <strong className="text-foreground">{startup.nome}</strong>
            </p>
          </div>

          {/* Form com Suspense para skeleton */}
          <Suspense fallback={<StartupFormSkeleton />}>
            <StartupFormEdit mode="edit" initialData={startup} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}