import type { Route } from "./+types/verificar.$documentId";
import { ShieldCheck } from "lucide-react";
import { useDocumentoVerificacao } from "~/hooks/use-documento-verificacao";
import { DocumentoVerificacaoCard } from "~/components/founder/documento-verificacao-card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Verificacao de Assinatura Digital - iSelfToken" },
    {
      name: "description",
      content:
        "Valide a autenticidade de um documento assinado digitalmente na plataforma iSelfToken.",
    },
  ];
}

export function loader({ params }: Route.LoaderArgs) {
  return { documentId: params.documentId };
}

export default function VerificarDocumento({ loaderData }: Route.ComponentProps) {
  const { documentId } = loaderData;
  const { data, isLoading, isError, error } = useDocumentoVerificacao(documentId);

  // Erro 404 ou documento nao encontrado
  if (isError) {
    const err = error as Error & { status?: number };
    const isNotFound = err?.status === 404 || err?.message?.includes("nao encontrado");

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col">
        <PublicHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg">
            <NotFoundState isNotFound={isNotFound} />
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : data ? (
            <DocumentoVerificacaoCard data={data} />
          ) : null}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="w-full border-b border-border/20 bg-slate-950/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-black text-foreground">
            Verificacao de Assinatura Digital
          </h1>
          <p className="text-sm text-muted-foreground">
            Plataforma iSelfToken
          </p>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="w-full border-t border-border/20 bg-slate-950/80 py-6">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Sistema Iselftoken &middot; Lei 14.063/2020 &middot;{" "}
          <span className="text-amber-400/80">
            Assinatura avancada nao qualificada
          </span>
        </p>
      </div>
    </footer>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-border/30 bg-accent/10 p-6 space-y-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10" />
        <div className="space-y-2 pt-2">
          <div className="h-6 w-48 rounded bg-primary/10" />
          <div className="h-4 w-32 rounded bg-primary/5" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-primary/5" />
        <div className="h-4 w-3/4 rounded bg-primary/5" />
        <div className="h-4 w-1/2 rounded bg-primary/5" />
      </div>
      <div className="h-24 w-full rounded-xl bg-primary/5" />
      <div className="h-12 w-48 rounded-xl bg-primary/5" />
    </div>
  );
}

function NotFoundState({ isNotFound }: { isNotFound: boolean }) {
  return (
    <div className="rounded-2xl border-2 border-red-500/30 bg-red-500/5 p-8 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
        <span className="text-3xl text-red-400">&#x2717;</span>
      </div>
      <div>
        <h2 className="text-xl font-black text-red-400">
          {isNotFound ? "Documento Nao Encontrado" : "Erro na Verificacao"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {isNotFound
            ? "O documento solicitado nao foi encontrado ou ainda nao foi assinado."
            : "Nao foi possivel verificar o documento. Tente novamente mais tarde."}
        </p>
      </div>
    </div>
  );
}
