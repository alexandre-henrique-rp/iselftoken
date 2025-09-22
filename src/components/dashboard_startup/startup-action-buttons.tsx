'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Edit, Trash2, History, Users, MoreHorizontal } from 'lucide-react'
import { Startup } from '@/types/startup'
import { DeleteStartupDialog } from './delete-startup-dialog'
import { StartupHistoryModal } from './startup-history-modal'
import { StartupInvestorsModal } from './startup-investors-modal'

interface StartupActionButtonsProps {
  startup: Startup
}

export function StartupActionButtons({ startup }: StartupActionButtonsProps) {
  const router = useRouter()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isInvestorsModalOpen, setIsInvestorsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleEdit = () => {
    router.push(`/dashboard_startups/startup/${startup.id}`)
  }

  const handleDelete = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleViewHistory = () => {
    setIsHistoryModalOpen(true)
  }

  const handleViewInvestors = () => {
    setIsInvestorsModalOpen(true)
  }


  const handleDeleteConfirm = async () => {
    setIsLoading(true)
    
    console.log('API Call: DELETE /api/startups/' + startup.id)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setIsDeleteDialogOpen(false)
      
      // TODO: Add toast notification
      // toast.success('Startup excluída com sucesso!')
      
      // TODO: Refresh parent data
      // router.refresh()
      
    } catch (error) {
      console.error('Erro ao excluir startup:', error)
      // TODO: Add error toast
      // toast.error('Erro ao excluir startup. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Abrir menu de ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleViewHistory}>
            <History className="mr-2 h-4 w-4" />
            Histórico de Captações
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewInvestors}>
            <Users className="mr-2 h-4 w-4" />
            Investidores
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>


      {/* Delete Dialog */}
      <DeleteStartupDialog
        startup={startup}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        isLoading={isLoading}
      />

      {/* History Modal */}
      <StartupHistoryModal
        startup={startup}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Investors Modal */}
      <StartupInvestorsModal
        startup={startup}
        isOpen={isInvestorsModalOpen}
        onClose={() => setIsInvestorsModalOpen(false)}
      />
    </>
  )
}