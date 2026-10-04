import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Cake,
  Calendar,
  Coins,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  Power,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react";
import { Link } from "react-router";
import { DashboardBackgroundWatermark } from "~/components/founder/dashboard-background-watermark";
import { useUpdateUserStatusMutation } from "~/hooks/use-update-user-status-mutation";
import { formatBRLCompact } from "~/lib/currency-format";
import { cn } from "~/lib/utils";
import type { NormalizedUserDetail } from "~/lib/normalize";

interface AdminUserDetailScreenProps {
  user: NormalizedUserDetail;
}

const ROLE_LABEL: Record<string, string> = {
  USER: "Usuário",
  ADMIN: "Administrador",
  FINANCEIRO: "Financeiro",
  COMPLIANCE: "Compliance",
  FOUNDER: "Fundador",
  INVESTOR: "Investidor",
};

const KYC_DOC_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  UNDER_REVIEW: "Em análise",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  NEEDS_RESUBMISSION: "Precisa reenviar",
};

const GENERO_LABEL: Record<string, string> = {
  HOMEM: "Masculino",
  MULHER: "Feminino",
  OUTRO: "Outro",
  NAO_INFORMAR: "Prefere não informar",
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateOnlyFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function AdminUserDetailScreen({ user }: AdminUserDetailScreenProps) {
  const updateStatus = useUpdateUserStatusMutation();
  const [isActive, setIsActive] = useState(user.isActive);
  const hasAddress = Boolean(user.endereco || user.cidade || user.pais?.nome);
  const hasPersonal = Boolean(
    user.telefone || user.data_nascimento || user.genero || user.tipo_documento,
  );
  const hasKycDocs = Boolean(
    user.avatar || user.comprovante || user.documento || user.biofacial,
  );
  const hasActivity = Boolean(
    user.startups.length || user.campaigns.length || user.investments.length,
  );

  const handleStatusChange = () => {
    const nextStatus = !isActive;
    updateStatus.mutate(
      { userId: user.id, isActive: nextStatus },
      { onSuccess: () => setIsActive(nextStatus) },
    );
  };

  return (
    <main className="min-h-screen px-1.5 pb-6 pt-3 md:px-0 md:pb-8 md:pt-4">
      <div className="relative mx-auto w-full max-w-7xl xl:max-w-[1400px]">
        <DashboardBackgroundWatermark />

        <Link
          to="/admin/users"
          className="mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar à gestão de usuários
        </Link>

        <header className="mb-5 space-y-2 md:mb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            Sistema administrativo
          </span>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Detalhes do usuário
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Consulte identidade, documentos, atividade e permissões sem perder o contexto operacional.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-card p-5 shadow-lg md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {user.avatar?.url ? (
                <img
                  src={user.avatar.url}
                  alt={user.nome}
                  className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-primary/30 sm:h-20 sm:w-20"
                />
              ) : (
                <AvatarFallback nome={user.nome} />
              )}
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                  Perfil #{String(user.id).padStart(6, "0")}
                </p>
                <h2 className="truncate text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  {user.nome}
                </h2>
                <p className="mt-1 flex items-center gap-2 break-all text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
              <Badge variant="primary">{ROLE_LABEL[user.role] ?? user.role}</Badge>
              <Badge variant={isActive ? "primary" : "destructive"}>
                {isActive ? "Conta Ativa" : "Conta Suspensa"}
              </Badge>
              {user.avatar?.status && (
                <Badge
                  variant={user.avatar.status === "APPROVED" ? "primary" : "destructive"}
                >
                  KYC: {KYC_DOC_LABEL[user.avatar.status] ?? user.avatar.status}
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
            <MetaItem label="ID público" value={user.publicId || "—"} mono />
            <MetaItem label="Cadastro" value={safeDateTime(user.createdAt)} />
            <MetaItem label="Tipo de acesso" value={ROLE_LABEL[user.role] ?? user.role} />
          </div>
        </section>

        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6">
          <div className="space-y-4 lg:col-span-8">
            {hasPersonal && (
              <Card title="Informações pessoais" icon={<User className="h-4 w-4" aria-hidden="true" />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoField icon={<IdCardIcon />} label="ID interno" value={`#${String(user.id).padStart(6, "0")}`} />
                  {user.telefone && <InfoField icon={<Phone className="h-4 w-4" />} label="Telefone" value={user.telefone} />}
                  {user.data_nascimento && <InfoField icon={<Cake className="h-4 w-4" />} label="Data de nascimento" value={safeDateOnly(user.data_nascimento)} />}
                  {user.genero && <InfoField icon={<User className="h-4 w-4" />} label="Gênero" value={GENERO_LABEL[user.genero] ?? user.genero} />}
                  {user.tipo_documento && (
                    <InfoField
                      icon={<FileText className="h-4 w-4" />}
                      label="Documento"
                      value={`${user.tipo_documento}${user.reg_documento ? ` · ${user.reg_documento}` : ""}`}
                    />
                  )}
                  <InfoField icon={<Calendar className="h-4 w-4" />} label="Cadastrado em" value={safeDateTime(user.createdAt)} />
                </div>
              </Card>
            )}

            {hasAddress && (
              <Card title="Endereço" icon={<MapPin className="h-4 w-4" aria-hidden="true" />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoField
                    icon={<HomeIcon />}
                    label="Logradouro"
                    value={[user.endereco, user.numero && `nº ${user.numero}`, user.complemento].filter(Boolean).join(", ") || "Não informado"}
                  />
                  {user.bairro && <InfoField icon={<MapPin className="h-4 w-4" />} label="Bairro" value={user.bairro} />}
                  <InfoField icon={<MapPin className="h-4 w-4" />} label="Cidade / UF" value={[user.cidade, user.uf].filter(Boolean).join(" / ") || "Não informado"} />
                  {user.cep && <InfoField icon={<MapPin className="h-4 w-4" />} label="CEP" value={user.cep} />}
                  {user.pais && <InfoField icon={<Globe className="h-4 w-4" />} label="País" value={`${user.pais.emoji} ${user.pais.nome}${user.pais.iso3 ? ` (${user.pais.iso3})` : ""}`} />}
                </div>
              </Card>
            )}

            {hasKycDocs && (
              <Card title="Documentos KYC" icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <KycDocCard label="Selfie (avatar)" doc={user.avatar} />
                  <KycDocCard label="Comprovante de residência" doc={user.comprovante} />
                  <KycDocCard label="Documento (RG/CNH)" doc={user.documento} />
                  <KycDocCard label="Biometria facial" doc={user.biofacial} />
                </div>
              </Card>
            )}

            {hasActivity && (
              <Card title="Atividade na plataforma" icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}>
                <div className="space-y-5">
                  {user.startups.length > 0 && (
                    <ActivitySection
                      icon={<Briefcase className="h-4 w-4" />}
                      title="Startups fundadas"
                      items={user.startups.map((startup) => ({
                        primary: startup.nome,
                        secondary: `Status: ${startup.status} · ${safeDateOnly(startup.createdAt)}`,
                      }))}
                    />
                  )}
                  {user.campaigns.length > 0 && (
                    <ActivitySection
                      icon={<Coins className="h-4 w-4" />}
                      title="Campanhas"
                      items={user.campaigns.map((campaign) => ({
                        primary: campaign.startupNome,
                        secondary: `Meta ${formatBRLCompact(campaign.targetAmount)} · ${campaign.progress}% · ${campaign.status}`,
                      }))}
                    />
                  )}
                  {user.investments.length > 0 && (
                    <ActivitySection
                      icon={<TrendingUp className="h-4 w-4" />}
                      title="Investimentos realizados"
                      items={user.investments.map((investment) => ({
                        primary: `${investment.tokensQty} tokens em ${investment.startupNome}`,
                        secondary: `${formatBRLCompact(investment.amount)} · ${investment.status} · ${safeDateOnly(investment.createdAt)}`,
                      }))}
                    />
                  )}
                </div>
              </Card>
            )}

            {!hasPersonal && !hasAddress && !hasKycDocs && !hasActivity && (
              <Card>
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Usuário sem dados de perfil complementares cadastrados.
                </p>
              </Card>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-4">
            <Card title="Resumo rápido" icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<Briefcase className="h-4 w-4" />} label="Startups" value={user.startups.length.toString()} />
                <StatCard icon={<Coins className="h-4 w-4" />} label="Campanhas" value={user.campaigns.length.toString()} />
                <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Investimentos" value={user.investments.length.toString()} />
                <StatCard icon={<FileText className="h-4 w-4" />} label="Notas admin" value={user.notes.length.toString()} />
              </div>
            </Card>

            <Card title="Ações administrativas" icon={<Power className="h-4 w-4" aria-hidden="true" />}>
              <div className="space-y-3">
                <Link
                  to={`/admin/kyc?userId=${user.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Revisar KYC</p>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {user.avatar?.status ? KYC_DOC_LABEL[user.avatar.status] ?? user.avatar.status : "Sem KYC"}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" aria-hidden="true" />
                </Link>

                <button
                  type="button"
                  disabled={updateStatus.isPending}
                  onClick={handleStatusChange}
                  className={cn(
                    "flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
                    isActive
                      ? "border-white/10 bg-black/20 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      : "border-white/10 bg-black/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
                  )}
                  title={isActive ? "Suspender usuário" : "Reativar usuário"}
                >
                  <span className="flex items-center gap-3">
                    <Power className="h-5 w-5" aria-hidden="true" />
                    <span className="text-sm font-bold">
                      {isActive ? "Suspender conta" : "Reativar conta"}
                    </span>
                  </span>
                  <span className={cn("rounded border px-2 py-1 text-[9px] font-black uppercase tracking-widest", isActive ? "border-destructive/30 text-destructive" : "border-primary/30 text-primary")}>
                    {updateStatus.isPending ? "..." : isActive ? "OFF" : "ON"}
                  </span>
                </button>
              </div>
            </Card>

            <Card title="Acesso avançado" icon={<ExternalLink className="h-4 w-4" aria-hidden="true" />}>
              <Link
                to={`/compliance/users/${user.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div>
                  <p className="text-sm font-bold text-foreground">Perfil completo (Compliance)</p>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                    Identidade, endereço, KYC, atividade e auditoria.
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" aria-hidden="true" />
              </Link>
            </Card>

            {updateStatus.isError && (
              <div className="rounded-2xl border border-red-500/20 bg-card p-4" role="alert">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold text-destructive">Erro ao atualizar status.</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {(updateStatus.error as Error)?.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Card({ title, icon, children }: { title?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-card p-5 shadow-lg md:p-6">
      {title && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">{title}</h2>
        </div>
      )}
      {children}
    </section>
  );
}

function Badge({ variant, children }: { variant: "primary" | "destructive"; children: ReactNode }) {
  return (
    <span className={cn("rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest", variant === "primary" ? "border-primary/20 bg-primary/10 text-primary" : "border-destructive/20 bg-destructive/10 text-destructive")}>
      {children}
    </span>
  );
}

function AvatarFallback({ nome }: { nome: string }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xl font-black text-primary ring-2 ring-primary/30 sm:h-20 sm:w-20">
      {nome.slice(0, 1).toUpperCase()}
    </div>
  );
}

function MetaItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-xs font-bold text-foreground", mono && "font-mono text-primary")}>{value}</p>
    </div>
  );
}

function InfoField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-primary/80">{icon}</span>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2 text-primary">
        {icon}
        <span className="text-xl font-black tabular-nums text-foreground">{value}</span>
      </div>
      <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </div>
  );
}

function KycDocCard({ label, doc }: { label: string; doc: NormalizedUserDetail["avatar"] }) {
  if (!doc) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4">
        <ImageIcon className="mb-2 h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">Não enviado</p>
      </div>
    );
  }

  const isApproved = doc.status === "APPROVED";
  const needsAttention = doc.status === "REJECTED" || doc.status === "NEEDS_RESUBMISSION";
  return (
    <div className={cn("rounded-xl border bg-black/20 p-4", isApproved ? "border-primary/25" : needsAttention ? "border-destructive/30" : "border-warning/30")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <span className={cn("shrink-0 rounded px-2 py-1 text-[8px] font-black uppercase tracking-widest", isApproved ? "bg-primary/15 text-primary" : needsAttention ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning")}>
          {KYC_DOC_LABEL[doc.status] ?? doc.status}
        </span>
      </div>
      <a
        href={doc.url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
      >
        Ver documento
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  );
}

function ActivitySection({ icon, title, items }: { icon: ReactNode; title: string; items: Array<{ primary: string; secondary: string }> }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {title} <span className="text-foreground/40">({items.length})</span>
      </p>
      <ul className="space-y-2">
        {items.slice(0, 5).map((item, index) => (
          <li key={`${item.primary}-${index}`} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="truncate text-xs font-bold text-foreground">{item.primary}</span>
              <span className="text-[10px] text-muted-foreground sm:text-right">{item.secondary}</span>
            </div>
          </li>
        ))}
        {items.length > 5 && <li className="text-center text-[10px] text-muted-foreground/60">+ {items.length - 5} mais</li>}
      </ul>
    </div>
  );
}

function IdCardIcon() {
  return <FileText className="h-4 w-4" />;
}

function HomeIcon() {
  return <MapPin className="h-4 w-4" />;
}

function safeDateOnly(value: string): string {
  try {
    return dateOnlyFmt.format(new Date(value));
  } catch {
    return value;
  }
}

function safeDateTime(value: string): string {
  try {
    return dateFmt.format(new Date(value));
  } catch {
    return value;
  }
}
