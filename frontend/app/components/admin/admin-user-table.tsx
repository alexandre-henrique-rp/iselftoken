import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Power,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { InitialsImage } from "~/components/ui/initials-image";
import { useUpdateUserStatusMutation } from "~/hooks/use-update-user-status-mutation";
import type { AdminUser } from "~/lib/queries";
import { getUploadWebUrl } from "~/lib/upload-url";
import { cn } from "~/lib/utils";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminUserTableProps {
  users: AdminUser[];
  pagination: Pagination;
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const KYC_STATUS_LABEL: Record<string, string> = {
  PENDING: "KYC pendente",
  UNDER_REVIEW: "KYC em análise",
  APPROVED: "KYC aprovado",
  REJECTED: "KYC rejeitado",
  NEEDS_RESUBMISSION: "KYC precisa reenviar",
};

type KycVisual = "approved" | "warning" | "destructive";

function kycVisual(status: string | null | undefined): KycVisual {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "destructive";
  return "warning";
}

const KYC_VISUAL_CLASSES: Record<KycVisual, { icon: string; text: string }> = {
  approved: { icon: "text-primary", text: "text-primary/80" },
  warning: { icon: "text-warning", text: "text-warning" },
  destructive: { icon: "text-destructive", text: "text-destructive" },
};

const KYC_ICON: Record<KycVisual, typeof ShieldCheck> = {
  approved: ShieldCheck,
  warning: ShieldAlert,
  destructive: ShieldAlert,
};

function AdminUserIdentity({ user }: { user: AdminUser }) {
  const kycStatus = user.avatar?.status;
  const visual = kycVisual(kycStatus);
  const KycIcon = KYC_ICON[visual];
  const kycLabel = KYC_STATUS_LABEL[kycStatus ?? ""] ?? "KYC sem status";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <InitialsImage
        name={user.nome}
        src={getUploadWebUrl(user.avatar)}
        alt={user.nome}
        className="size-9 shrink-0 rounded-full ring-2 ring-primary/20 transition group-hover:ring-primary/60"
        fallbackClassName="bg-primary/15"
        fallbackTextClassName="text-xs font-black"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {user.nome}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {user.role && (
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              {user.role}
            </span>
          )}
          {kycStatus && (
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1 text-xs font-medium",
                KYC_VISUAL_CLASSES[visual].text,
              )}
              aria-label={kycLabel}
            >
              <KycIcon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  KYC_VISUAL_CLASSES[visual].icon,
                )}
                aria-hidden
              />
              <span className="truncate">{kycLabel}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold",
        isActive
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-destructive/20 bg-destructive/10 text-destructive",
      )}
    >
      {isActive ? "Ativo" : "Suspenso"}
    </span>
  );
}

interface AdminUserActionsProps {
  user: AdminUser;
  isActive: boolean;
  isPending: boolean;
  onToggle: () => void;
  className?: string;
}

function AdminUserActions({
  user,
  isActive,
  isPending,
  onToggle,
  className,
}: AdminUserActionsProps) {
  const visual = kycVisual(user.avatar?.status);
  const KycIcon = KYC_ICON[visual];

  return (
    <div className={cn("flex shrink-0 gap-1.5", className)}>
      <Link
        to={`/admin/kyc?userId=${user.id}`}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          visual === "destructive"
            ? "border-destructive/20 text-destructive hover:bg-destructive/10"
            : visual === "warning"
              ? "border-warning/20 text-warning hover:bg-warning/10"
              : "border-primary/20 text-primary hover:bg-primary/10",
        )}
        title="Revisar KYC"
        aria-label={`Revisar KYC de ${user.nome}`}
      >
        <KycIcon className="h-4 w-4" aria-hidden />
      </Link>
      <Link
        to={`/admin/users/${user.id}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-foreground transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="Detalhes do usuário"
        aria-label={`Ver detalhes de ${user.nome}`}
      >
        <Eye className="h-4 w-4" aria-hidden />
      </Link>
      <button
        type="button"
        disabled={isPending}
        onClick={onToggle}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
          isActive
            ? "border-destructive/20 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            : "border-primary/20 text-muted-foreground hover:bg-primary/10 hover:text-primary",
        )}
        title={isActive ? "Suspender usuário" : "Reativar usuário"}
        aria-label={
          isActive ? `Suspender ${user.nome}` : `Reativar ${user.nome}`
        }
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Power className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}

interface AdminUserItemProps {
  user: AdminUser;
  isPending: boolean;
  onToggle: () => void;
}

function AdminUserRow({ user, isPending, onToggle }: AdminUserItemProps) {
  const isActive = user.isActive !== false;

  return (
    <tr className="group transition-colors hover:bg-white/[0.03]">
      <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-primary/80 lg:px-6">
        #{String(user.id).padStart(6, "0")}
      </td>
      <td className="px-4 py-4 lg:px-6">
        <AdminUserIdentity user={user} />
      </td>
      <td className="max-w-[260px] truncate px-4 py-4 text-sm text-muted-foreground lg:px-6">
        {user.email}
      </td>
      <td className="px-4 py-4 text-center lg:px-6">
        <AccountStatusBadge isActive={isActive} />
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground lg:px-6">
        {dateFmt.format(new Date(user.createdAt))}
      </td>
      <td className="px-4 py-4 lg:px-6">
        <AdminUserActions
          user={user}
          isActive={isActive}
          isPending={isPending}
          onToggle={onToggle}
          className="justify-end"
        />
      </td>
    </tr>
  );
}

function AdminUserCard({ user, isPending, onToggle }: AdminUserItemProps) {
  const isActive = user.isActive !== false;

  return (
    <article className="group rounded-2xl border border-white/10 bg-accent/10 p-4 shadow-sm transition-colors hover:border-primary/20 hover:bg-accent/20">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <AdminUserIdentity user={user} />
        </div>
        <AccountStatusBadge isActive={isActive} />
      </header>

      <dl className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            E-mail
          </dt>
          <dd className="mt-1 break-words text-sm text-foreground">
            {user.email}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Cadastro
          </dt>
          <dd className="mt-1 text-sm text-foreground">
            {dateFmt.format(new Date(user.createdAt))}
          </dd>
        </div>
      </dl>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            ID do usuário
          </p>
          <p className="mt-1 font-mono text-xs font-bold text-primary/80">
            #{String(user.id).padStart(6, "0")}
          </p>
        </div>
        <AdminUserActions
          user={user}
          isActive={isActive}
          isPending={isPending}
          onToggle={onToggle}
          className="justify-end"
        />
      </footer>
    </article>
  );
}

export function AdminUserTable({ users, pagination }: AdminUserTableProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const updateStatus = useUpdateUserStatusMutation();
  const primeiro =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const ultimo = Math.min(pagination.page * pagination.limit, pagination.total);

  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(page));
    }
    setSearchParams(next, { replace: true });
  };

  const toggleStatus = (user: AdminUser) => {
    updateStatus.mutate({
      userId: user.id,
      isActive: user.isActive === false,
    });
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/10 bg-card/70 shadow-lg"
      aria-label="Lista de usuários"
    >
      <div className="space-y-3 p-3 sm:p-4 lg:hidden">
        {users.map((user) => (
          <AdminUserCard
            key={user.id}
            user={user}
            isPending={updateStatus.isPending}
            onToggle={() => toggleStatus(user)}
          />
        ))}
      </div>

      <div
        className="hidden overflow-x-auto lg:block"
        tabIndex={0}
        aria-label="Tabela rolável de usuários"
      >
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-accent/20">
              {[
                ["ID", "text-left"],
                ["Usuário", "text-left"],
                ["E-mail", "text-left"],
                ["Status", "text-center"],
                ["Cadastro", "text-left"],
                ["Ações", "text-right"],
              ].map(([label, alignment]) => (
                <th
                  key={label}
                  scope="col"
                  className={cn(
                    "px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground lg:px-6",
                    alignment,
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <AdminUserRow
                key={user.id}
                user={user}
                isPending={updateStatus.isPending}
                onToggle={() => toggleStatus(user)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/10 bg-accent/10 px-4 py-4 sm:flex-row sm:text-left lg:px-6">
        <div className="text-center text-xs text-muted-foreground sm:text-left">
          Exibindo{" "}
          <span className="font-semibold text-foreground">
            {primeiro}–{ultimo}
          </span>{" "}
          de{" "}
          <span className="font-semibold text-foreground">
            {pagination.total.toLocaleString("pt-BR")}
          </span>{" "}
          usuários
        </div>
        <nav
          className="flex shrink-0 items-center gap-2"
          aria-label="Paginação de usuários"
        >
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => goToPage(pagination.page - 1)}
            aria-label="Página anterior"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-accent/40 text-muted-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20">
            {pagination.page}
          </span>
          <span className="text-xs text-muted-foreground">
            de {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => goToPage(pagination.page + 1)}
            aria-label="Próxima página"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-accent/40 text-muted-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </nav>
      </footer>
    </section>
  );
}
