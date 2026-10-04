import { useRouteLoaderData } from "react-router";
import { Mail, Phone, Calendar, FileText, User } from "lucide-react";
import type { loader } from "./compliance-user-detail";

const GENERO_LABELS: Record<string, string> = {
  HOMEM: "Homem",
  MULHER: "Mulher",
  OUTRO: "Outro",
};

const DOC_LABELS: Record<string, string> = {
  CPF: "CPF",
  CNH: "CNH",
  PASSAPORTE: "Passaporte",
  CÉDULA_IDENTIDADE: "Cédula de Identidade",
  CARTEIRA_MOTORISTA: "Carteira de Motorista",
  DNI: "DNI (Espanha)",
  CUIT: "CUIT (Argentina)",
  RUT: "RUT (Chile/Uruguai)",
  SSN: "SSN (EUA)",
  NATIONAL_ID: "ID Nacional",
  BIRTH_CERTIFICATE: "Certidão de Nascimento",
};

export function meta() {
  return [
    { title: "Dados Pessoais | Compliance | iSelfToken" },
  ];
}

export default function ComplianceUserDetailIdentidadePage() {
  const user = useRouteLoaderData<typeof loader>("routes/private/compliance-user-detail");

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        {/* Dados Pessoais */}
        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            Dados Pessoais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Nome Completo
              </label>
              <p className="text-foreground font-medium">{user.nome || "—"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <p className="text-foreground font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                {user.email || "—"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Telefone
              </label>
              <p className="text-foreground font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {user.telefone || "—"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Data de Nascimento
              </label>
              <p className="text-foreground font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {user.data_nascimento ? new Date(user.data_nascimento).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Gênero
              </label>
              <p className="text-foreground font-medium">
                {user.genero ? GENERO_LABELS[user.genero] || user.genero : "—"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Tipo de Documento
              </label>
              <p className="text-foreground font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                {user.tipo_documento ? DOC_LABELS[user.tipo_documento] || user.tipo_documento : "—"}
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Número do Documento
              </label>
              <p className="text-foreground font-medium font-mono">
                {user.reg_documento ? `***${user.reg_documento.slice(-4)}` : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Status da Conta */}
        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            Status da Conta
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </label>
              <p className={`font-black uppercase tracking-widest text-xs ${user.isActive ? "text-green-400" : "text-red-400"}`}>
                {user.isActive ? "Ativo" : "Inativo"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Criado em
              </label>
              <p className="text-foreground font-medium">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/5 to-transparent border border-white/5 space-y-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">
            Informações
          </span>
          <p className="text-xs text-muted-foreground/60">
            Estes dados são somente leitura. Para alterar, utilize os formulários de edição.
          </p>
        </div>
      </aside>
    </div>
  );
}