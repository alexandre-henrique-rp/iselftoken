import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { InitialsImage } from "~/components/ui/initials-image";
import type { AdminUser } from "~/lib/queries";
import { cn } from "~/lib/utils";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ComplianceUserTableProps {
  users: AdminUser[];
  pagination: Pagination;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const ROLE_UI: Record<string, { label: string; className: string }> = {
  USER: {
    label: "Usuário",
    className: "border-white/10 bg-white/5 text-muted-foreground",
  },
  ADMIN: {
    label: "Admin",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  FINANCEIRO: {
    label: "Financeiro",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  COMPLIANCE: {
    label: "Compliance",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  FOUNDER: {
    label: "Fundador",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  INVESTOR: {
    label: "Investidor",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
};

const KYC_UI: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  APPROVED: {
    label: "KYC aprovado",
    className: "border-primary/20 bg-primary/10 text-primary",
    icon: CheckCircle2,
  },
  PENDING: {
    label: "KYC pendente",
    className: "border-warning/20 bg-warning/10 text-warning",
    icon: Clock,
  },
  UNDER_REVIEW: {
    label: "KYC em análise",
    className: "border-warning/20 bg-warning/10 text-warning",
    icon: Clock,
  },
  REJECTED: {
    label: "KYC reprovado",
    className: "border-destructive/20 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  NEEDS_RESUBMISSION: {
    label: "KYC precisa reenviar",
    className: "border-destructive/20 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function roleUi(role: string) {
  return (
    ROLE_UI[role] ?? {
      label: role || "Sem role",
      className: ROLE_UI.USER.className,
    }
  );
}

function planName(user: AdminUser) {
  const subscription =
    user.subscriptions?.find((item) => item.status === "ACTIVE") ??
    user.subscriptions?.[0];
  return subscription?.plan?.nome ?? "—";
}

function KycBadge({ status }: { status: string | null | undefined }) {
  const ui = status ? KYC_UI[status.toUpperCase()] : undefined;
  if (!ui) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldOff className="h-3.5 w-3.5" aria-hidden />
        Sem KYC
      </span>
    );
  }

  const Icon = ui.icon;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        ui.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {ui.label}
    </span>
  );
}

function UserIdentity({ user }: { user: AdminUser }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <InitialsImage
        name={user.nome}
        src={user.avatar?.url_sm}
        alt={`Avatar de ${user.nome}`}
        className="h-9 w-9 rounded-full ring-2 ring-primary/20"
        fallbackClassName="bg-primary/15"
        fallbackTextClassName="text-xs font-black"
      />
      <span className="min-w-0 truncate text-sm font-semibold text-foreground">
        {user.nome}
      </span>
    </div>
  );
}

function Pagination({ pagination }: { pagination: Pagination }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next, { replace: true });
  };
  const first = (pagination.page - 1) * pagination.limit + 1;
  const last = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/10 bg-accent/10 px-4 py-4 sm:flex-row lg:px-6">
      <p className="text-xs text-muted-foreground">
        Exibindo{" "}
        <strong className="text-foreground">
          {first}–{last}
        </strong>{" "}
        de{" "}
        <strong className="text-foreground">
          {pagination.total.toLocaleString("pt-BR")}
        </strong>{" "}
        usuários
      </p>
      <nav
        className="flex items-center gap-2"
        aria-label="Paginação de usuários"
      >
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => goToPage(pagination.page - 1)}
          aria-label="Página anterior"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-muted-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground">
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-muted-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </nav>
    </footer>
  );
}

export function ComplianceUserTable({
  users,
  pagination,
}: ComplianceUserTableProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/10 bg-card/70 shadow-lg"
      aria-label="Lista de usuários"
    >
      <div
        className="hidden overflow-x-auto md:block"
        tabIndex={0}
        aria-label="Tabela rolável de usuários"
      >
        <table className="w-full min-w-[920px] border-collapse text-left">
          <caption className="sr-only">
            Usuários cadastrados para análise de compliance
          </caption>
          <thead>
            <tr className="border-b border-white/10 bg-accent/20">
              {["Usuário", "E-mail", "Role", "KYC", "Plano", "Cadastro"].map(
                (label) => (
                  <th
                    key={label}
                    scope="col"
                    className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground lg:px-6"
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => {
              const role = roleUi(user.role);
              return (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <th scope="row" className="px-4 py-4 font-normal lg:px-6">
                    <Link
                      to={`/compliance/users/${user.id}`}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label={`Ver detalhes de ${user.nome}`}
                    >
                      <UserIdentity user={user} />
                    </Link>
                  </th>
                  <td className="max-w-[260px] truncate px-4 py-4 text-sm text-muted-foreground lg:px-6">
                    <span className="inline-flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {user.email}
                    </span>
                  </td>
                  <td className="px-4 py-4 lg:px-6">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                        role.className,
                      )}
                    >
                      {role.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 lg:px-6">
                    <KycBadge status={user.avatar?.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground lg:px-6">
                    {planName(user)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground lg:px-6">
                    {formatDate(user.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="space-y-3 p-3 md:hidden"
        aria-label="Lista de usuários em cartões"
      >
        {users.map((user) => {
          const role = roleUi(user.role);
          return (
            <Link
              key={user.id}
              to={`/compliance/users/${user.id}`}
              className="block rounded-xl border border-white/10 bg-accent/10 p-4 transition hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`Ver detalhes de ${user.nome}`}
            >
              <div className="flex items-start justify-between gap-3">
                <UserIdentity user={user} />
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold",
                    role.className,
                  )}
                >
                  {role.label}
                </span>
              </div>
              <p className="mt-3 flex items-center gap-2 truncate text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {user.email}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <KycBadge status={user.avatar?.status} />
                <span className="text-xs text-muted-foreground">
                  Plano: {planName(user)}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Cadastro: {formatDate(user.createdAt)}
              </p>
            </Link>
          );
        })}
      </div>
      <Pagination pagination={pagination} />
    </section>
  );
}
