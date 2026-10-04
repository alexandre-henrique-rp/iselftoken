import { useQuery } from "@tanstack/react-query";
import { Bell, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Sidebar } from "~/components/layout/sidebar";
import { InitialsImage } from "~/components/ui/initials-image";
import { useNotificationsSocket } from "~/hooks/use-notifications-socket";
import { usePaymentConfirmedSocket } from "~/hooks/use-payment-confirmed";
import { useKycRealtime } from "~/hooks/use-kyc-realtime";
import { useUser } from "~/hooks/use-user";
import { notificationsUnreadCountQueryOptions } from "~/lib/queries";
import { getUploadWebUrl } from "~/lib/upload-url";
import type { UserData } from "~/types/auth";

/**
 * Retorna o texto de exibição do papel/plano do usuário.
 * - Roles administrativas: texto fixo
 * - Usuários com plano: nome(s) do(s) plano(s) ativo(s), separados por vírgula
 * - Sem plano ativo: fallback "Sem plano ativo"
 */
function getDisplayRole(user: UserData): string {
  // Roles administrativas têm texto fixo
  if (user.role === "ADMIN") return "Administrador";
  if (user.role === "FINANCEIRO") return "Financeiro";
  if (user.role === "COMPLIANCE") return "Compliance";

  // Para USER: exibir nome(s) do(s) plano(s) ativo(s)
  const activeNames =
    user.subscriptions
      ?.filter((sub) => sub.status === "ACTIVE")
      .map((sub) => sub.plan?.nome)
      .filter(Boolean) ?? [];

  if (activeNames.length > 0) {
    return activeNames.join(", ");
  }

  return "Sem plano ativo";
}

export function TopNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useUser();
  if (!user) return null;
  const displayRole = getDisplayRole(user);

  // Abre (e mantém viva) a conexão socket.io ÚNICA com o namespace
  // /notifications. Todos os conectores abaixo compartilham o mesmo
  // socket (singleton por userId) via useRealtimeConnection.
  // Push real-time atualiza o badge abaixo sem polling redundante.
  const { connected: wsConnected } = useNotificationsSocket();
  // Invalida [me] + transações quando pagamento do user é confirmado.
  usePaymentConfirmedSocket();
  // Reflete decisão de KYC (aprovação/rejeição) no perfil em tempo real.
  useKycRealtime();

  // Polling inteligente: para quando WS conectado, retoma 60 s quando
  // desconectado (cold start, queda de WS, scripts/curl).
  const { data: unreadCount = 0 } = useQuery({
    ...notificationsUnreadCountQueryOptions,
    refetchInterval: wsConnected ? false : 60_000,
  });
  const hasUnread = unreadCount > 0;

  return (
    <>
      <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-18rem)] h-20 z-40 bg-surface-bright/60 backdrop-blur-xl flex items-center px-6 lg:px-12 font-sans text-sm font-medium justify-between lg:justify-end">
        {/* Mobile Hamburger & Logo */}
        <div className="lg:hidden flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menu de navegação"
            className="p-2 -ml-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link
            to="/home"
            className="text-xl font-black tracking-tighter text-primary uppercase"
          >
            IST
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Link
            to="/notifications"
            aria-label={
              hasUnread
                ? `Notificações, ${unreadCount} não lida(s)`
                : "Notificações"
            }
            className="relative text-on-surface-variant hover:text-on-surface transition-colors p-1"
          >
            <Bell className="w-5 h-5" />
            {hasUnread && (
              <span
                aria-hidden="true"
                className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"
              ></span>
            )}
          </Link>

          <div className="h-6 w-px bg-outline-variant/20 mx-1 hidden sm:block"></div>

          <Link to="/profile" className="flex items-center gap-3 group">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-on-surface leading-none group-hover:text-primary transition-colors">
                {user.nome}
              </p>
              <p className="text-[10px] text-primary-dim leading-none mt-1 uppercase tracking-wider font-bold">
                {displayRole}
              </p>
            </div>
            <InitialsImage
              name={user.nome}
              src={getUploadWebUrl(user.avatar)}
              alt={`Avatar de ${user.nome}`}
              className="size-10 rounded-full border-2 border-primary/20"
              fallbackClassName="bg-primary/10"
              fallbackTextClassName="text-sm font-bold"
            />
          </Link>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-surface/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-surface-dim shadow-2xl z-50 flex flex-col">
            <div className="absolute top-5 right-4 z-50">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <Sidebar onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
