import { TermoAdesaoActions } from "~/components/founder/termo-adesao-actions";
import { TermoAdesaoContent } from "~/components/founder/termo-adesao-content";
import { TermoAdesaoLegalBanner } from "~/components/founder/termo-adesao-legal-banner";
import { TermoAdesaoSkeleton } from "~/components/founder/termo-adesao-skeleton";
import { EditorialWalletShell } from "~/components/wallet/editorial-wallet-shell";
import { TERMO_VERSAO, DATA_VERSAO } from "~/lib/termo-adesao-text";
import { loadTermoAdesaoHtml } from "~/lib/termo-adesao-loader";
import type { Route } from "./+types/texto";

const META = [
  { title: `Termo de Adesão v${TERMO_VERSAO} | iSelfToken` },
  { name: "description", content: "Texto integral do Termo de Adesão (Lei 14.063/2020)." },
  { name: "robots", content: "noindex, follow" },
];

export const meta = () => META;

export async function loader({ request }: Route.LoaderArgs) {
  return { html: await loadTermoAdesaoHtml(request) };
}

/**
 * HydrateFallback — skeleton que preserva layout da pagina final durante o
 * flash inicial (conexoes lentas / SSR streaming). Mesmo watermark TERMO e
 * mesmas dimensoes do header editorial + banner legal + corpo do termo.
 */
export const HydrateFallback = () => <TermoAdesaoSkeleton />;

export default function TermoAdesaoTextoPage({ loaderData }: Route.ComponentProps) {
  return (
    <EditorialWalletShell
      eyebrow="Documento legal"
      title="Termo de Adesão"
      description={`iSelfToken Tecnologia e Pagamentos S.A. — v${TERMO_VERSAO} (${DATA_VERSAO})`}
      watermark="TERMO"
      headerActions={<TermoAdesaoActions />}
    >
      <div className="mx-auto mb-8 w-full max-w-4xl space-y-6 md:mb-10 md:space-y-8">
        <TermoAdesaoLegalBanner />
        <TermoAdesaoContent html={loaderData.html} />
      </div>
    </EditorialWalletShell>
  );
}
