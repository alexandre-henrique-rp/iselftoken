/**
 * Card de acesso restrito (sem token da startup). CTA -> pagina publica.
 */
import { Link } from "react-router";
import { FileText } from "lucide-react";

interface AccessDeniedCardProps {
  startupId: number;
}

export function AccessDeniedCard({ startupId }: AccessDeniedCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
      <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
      <h2 className="text-xl font-black tracking-tight text-foreground">
        Acesso restrito
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        A area de transparencia e exclusiva para investidores com tokens desta
        startup. Compre tokens para acompanhar atualizacoes financeiras e de
        negocio.
      </p>
      <Link
        to={`/startups/${startupId}`}
        className="inline-block mt-2 px-4 py-2 text-sm font-bold rounded bg-primary text-primary-foreground hover:opacity-90 transition"
      >
        Quero investir
      </Link>
    </div>
  );
}