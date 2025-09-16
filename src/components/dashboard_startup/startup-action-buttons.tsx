'use client'

import { useState } from 'react'
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
import { StartupFormModal } from './startup-form-modal'
import { DeleteStartupDialog } from './delete-startup-dialog'
import { StartupHistoryModal } from './startup-history-modal'
import { StartupInvestorsModal } from './startup-investors-modal'

interface StartupActionButtonsProps {
  startup: Startup
}

export function StartupActionButtons({ startup }: StartupActionButtonsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isInvestorsModalOpen, setIsInvestorsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleEdit = () => {
    setIsEditModalOpen(true)
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

  const handleEditSubmit = async (data: any) => {
    setIsLoading(true)
    
    console.log('API Call: PUT /api/startups/' + startup.id, data)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setIsEditModalOpen(false)
      
      // TODO: Add toast notification
      // toast.success('Startup atualizada com sucesso!')
      
      // TODO: Refresh parent data
      // router.refresh()
      
    } catch (error) {
      console.error('Erro ao atualizar startup:', error)
      // TODO: Add error toast
      // toast.error('Erro ao atualizar startup. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
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

      {/* Edit Modal */}
      <StartupFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        isLoading={isLoading}
        initialData={startup}
        mode="edit"
      />

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