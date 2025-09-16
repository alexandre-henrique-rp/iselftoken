import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { WhatsappHelpButton } from '@/components/WhatsappHelpButton';
import { DeleteSession, GetSessionServer } from '@/context/auth';
import { Separator } from '@/components/ui/separator';
import { DynamicBreadcrumb } from '@/components/dynamic-breadcrumb';
import { redirect } from 'next/navigation';

interface Props {
  children: React.ReactNode;
}

// Layout protegido: valida a sessão no servidor para evitar loading no client
export default async function ProtectedLayout({ children }: Props) {
  const sessionData = await GetSessionServer();
  if (!sessionData) {
    await DeleteSession();
    redirect('/login');
  }

  const session  = sessionData;
  const role = session.user?.role;

  return (
    <SidebarProvider>
      <AppSidebar role={role || ''} session={session.user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
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
