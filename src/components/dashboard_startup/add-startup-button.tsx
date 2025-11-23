'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function AddStartupButton() {
  const router = useRouter()

  const handleClick = () => {
    router.push('/dashboard/startup')
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            className="bg-[#d500f9] text-white hover:bg-[#d500f9]/90 gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Startup
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cadastrar uma nova startup na plataforma</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}