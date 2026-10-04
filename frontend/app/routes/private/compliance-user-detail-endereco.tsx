import { useRouteLoaderData } from "react-router";
import { MapPin, Globe } from "lucide-react";
import type { loader } from "./compliance-user-detail";

export function meta() {
  return [
    { title: "Endereço | Compliance | iSelfToken" },
  ];
}

export default function ComplianceUserDetailEnderecoPage() {
  const user = useRouteLoaderData<typeof loader>("routes/private/compliance-user-detail");

  if (!user) {
    return <div>Carregando...</div>;
  }

  const hasAddress = user.endereco || user.cidade || user.uf;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            Endereço
          </h2>

          {!hasAddress ? (
            <p className="text-muted-foreground text-sm">Nenhum endereço cadastrado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Endereço
                </label>
                <p className="text-foreground font-medium">
                  {user.endereco}
                  {user.numero && `, ${user.numero}`}
                  {user.complemento && ` - ${user.complemento}`}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Bairro
                </label>
                <p className="text-foreground font-medium">{user.bairro || "—"}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  CEP
                </label>
                <p className="text-foreground font-medium font-mono">{user.cep || "—"}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Cidade
                </label>
                <p className="text-foreground font-medium">{user.cidade || "—"}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Estado (UF)
                </label>
                <p className="text-foreground font-medium">{user.uf || "—"}</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  País
                </label>
                <p className="text-foreground font-medium flex items-center gap-2">
                  {user.pais ? (
                    <>
                      <span>{user.pais.emoji}</span>
                      <span>{user.pais.nome}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/5 to-transparent border border-white/5 space-y-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">
            Endereço
          </span>
          <p className="text-xs text-muted-foreground/60">
            Endereço completo do usuário para correspondência e verificação de identidade.
          </p>
        </div>
      </aside>
    </div>
  );
}