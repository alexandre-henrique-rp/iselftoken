'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { StartupFormModal } from './startup-form-modal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function AddStartupButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSubmit = async (data: unknown) => {
    setIsLoading(true)
    
    console.log('API Call: POST /api/startups', data)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Success - close modal and refresh data
      setIsModalOpen(false)
      
      // TODO: Add toast notification
      // toast.success('Startup criada com sucesso!')
      
      // TODO: Refresh parent data
      // router.refresh()
      
    } catch (error) {
      console.error('Erro ao criar startup:', error)
      // TODO: Add error toast
      // toast.error('Erro ao criar startup. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={handleOpenModal} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Startup
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Cadastrar uma nova startup na plataforma</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <StartupFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </>
  )
}