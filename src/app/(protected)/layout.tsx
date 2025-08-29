import { AppSidebar } from '@/components/app-sidebar';
import { 
  SidebarInset, 
  SidebarProvider, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { WhatsappHelpButton } from '@/components/WhatsappHelpButton';
import { GetSessionServer } from '@/context/auth';
import { Separator } from '@/components/ui/separator';
import { DynamicBreadcrumb } from '@/components/dynamic-breadcrumb';
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { NavUser } from '@/components/nav-user';

interface Props {
  children: React.ReactNode;
}

// Layout protegido: valida a sessão no servidor para evitar loading no client
export default async function ProtectedLayout({ children }: Props) {
 const session = await GetSessionServer()
 const role = session?.user?.role

  return (
    <SidebarProvider>
      <AppSidebar role={role ?? "all"} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <DynamicBreadcrumb />
            
            {/* Header mobile - apenas perfil e theme toggler */}
            <div className="ml-auto flex items-center gap-2">
              <AnimatedThemeToggler className="rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" />
              <div className="hidden sm:block">
                <NavUser user={{
                  name: session?.user?.name || "Usuário",
                  email: session?.user?.email || "usuario@iselftoken.com",
                  avatar: "/avatars/user.jpg"
                }} />
              </div>
              {/* Versão mobile do perfil - apenas avatar */}
              <div className="sm:hidden">
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {(session?.user?.name || "U").charAt(0).toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
        
        {/* Botão flutuante de ajuda/WhatsApp */}
        <WhatsappHelpButton />
      </SidebarInset>
    </SidebarProvider>
  );
}
