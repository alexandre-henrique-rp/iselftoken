import { AppSidebar } from '@/components/app-sidebar';
import { DynamicBreadcrumb } from '@/components/dynamic-breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { WhatsappHelpButton } from '@/components/WhatsappHelpButton';
import { GetSessionServer, UserSessionData } from '@/context/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface Props {
  children: React.ReactNode;
}

/**
 * Layout protegido: valida a sessão no servidor para evitar loading no client
 * Também valida se o usuário possui um plano ativo
 */
export default async function ProtectedLayout({ children }: Props) {
  const sessionData = await GetSessionServer();
  const UserData = await UserSessionData();

  // Validação de sessão
  if (!sessionData || !UserData) {
    redirect('/login');
  }

  // Obter URL atual do middleware
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  // Validação de plano: redireciona se não tiver plano ativo
  // Não redireciona se já estiver na página de planos
  const hasActivePlan =
    UserData.planos &&
    Array.isArray(UserData.planos) &&
    UserData.planos.length > 0;
  const isOnPlansPage = pathname.includes('/business/plans');

  console.log('🚀 ~ ProtectedLayout ~ hasActivePlan:', hasActivePlan);
  console.log('🚀 ~ ProtectedLayout ~ isOnPlansPage:', isOnPlansPage);

  if (!hasActivePlan && !isOnPlansPage) {
    console.log('🚀 ~ Redirecionando para /business/plans');
    redirect('/business/plans');
  }

  const session = sessionData;
  const role = session.user?.role;

  return (
    <SidebarProvider>
      <AppSidebar role={role || ''} session={session.user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <DynamicBreadcrumb role={role || ''} />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>

        {/* Botão flutuante de ajuda/WhatsApp */}
        <WhatsappHelpButton />
      </SidebarInset>
    </SidebarProvider>
  );
}
