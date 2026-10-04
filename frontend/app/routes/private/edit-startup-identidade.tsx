import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouteLoaderData } from "react-router";
import type { SectionStatus } from "~/components/founder/_section-props";
import {
  CorporateIdentity,
  type CnpjLookupResponse,
} from "~/components/founder/corporate-identity";
import { TipCard } from "~/components/founder/edit-startup-rail";
import { LocationFields } from "~/components/founder/location-fields";
import { PublicPreviewCard } from "~/components/founder/public-preview-card";
import { SocialLinks } from "~/components/founder/social-links";
import { StartupBranding } from "~/components/founder/startup-branding";
import { useStartupIdentityQuery } from "~/hooks/use-startup-identity";
import { useEditStartupForm } from "~/lib/edit-startup-form-context";
import { countriesQueryOptions, type Country } from "~/lib/queries";
import type { Route } from "./+types/edit-startup-identidade";
import type { loader as layoutLoader } from "./edit-startup-layout";

// S6-T01 — Esta aba apenas REGISTRA valores via registerSectionGetValues.
// O save consolidado vive no layout (edit-startup-layout.tsx).

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Identidade | Editar Startup | iSelfToken" },
    {
      name: "description",
      content:
        "Edite a identidade legal, branding e localização da sua startup.",
    },
  ];
}

const SECTION_LABELS: Record<string, string> = {
  "corporate-identity": "Identidade Legal",
  "startup-branding": "Branding",
  "social-links": "Links & Social",
  "location-fields": "Localização",
};

export default function EditStartupIdentidadePage() {
  const startup = useRouteLoaderData<typeof layoutLoader>(
    "routes/private/edit-startup-layout",
  );
  const {
    setDirtyCount,
    registerSectionReset,
    registerSectionGetValues,
  } = useEditStartupForm();
  const [statuses, setStatuses] = useState<Record<string, SectionStatus>>({});
  // Último lookup de CNPJ — propagado para Localização preencher cep/cidade/uf.
  const [cnpjLookup, setCnpjLookup] = useState<CnpjLookupResponse | null>(null);

  const { data: countries = [] } = useQuery<Country[]>(countriesQueryOptions);

  // STATE-02D — query opcional para identidade (camada adicional sobre o loader da rota pai).
  const rawId = startup?.id;
  const startupId =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string" && Number.isFinite(Number(rawId))
        ? Number(rawId)
        : null;
  const identityQuery = useStartupIdentityQuery(
    startupId !== null && startupId > 0 ? startupId : null,
  );
  void identityQuery;

  const reportStatus = useCallback((next: SectionStatus) => {
    setStatuses((prev) => {
      const current = prev[next.id];
      if (
        current &&
        current.dirty === next.dirty &&
        current.filled === next.filled &&
        current.total === next.total
      ) {
        return prev;
      }
      return { ...prev, [next.id]: next };
    });
  }, []);

  useEffect(() => {
    const total = Object.values(statuses).reduce((sum, s) => sum + s.dirty, 0);
    setDirtyCount(total);
  }, [statuses, setDirtyCount]);

  const completenessSections = Object.keys(SECTION_LABELS).map((id) => {
    const s = statuses[id];
    return {
      label: SECTION_LABELS[id],
      filled: s?.filled ?? 0,
      total: s?.total ?? 0,
    };
  });

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-5 xl:gap-6">
      <div className="min-w-0 space-y-5">
        <CorporateIdentity
          startup={startup}
          reportStatus={reportStatus}
          registerReset={registerSectionReset}
          registerGetValues={registerSectionGetValues}
          onLookup={setCnpjLookup}
        />
        <StartupBranding
          startup={startup}
          reportStatus={reportStatus}
          registerReset={registerSectionReset}
        />
        <SocialLinks
          startup={startup}
          reportStatus={reportStatus}
          registerReset={registerSectionReset}
          registerGetValues={registerSectionGetValues}
        />
        <LocationFields
          startup={startup}
          reportStatus={reportStatus}
          registerReset={registerSectionReset}
          registerGetValues={registerSectionGetValues}
          lookupData={cnpjLookup}
        />
      </div>

      <aside className="h-fit w-full self-start space-y-4 lg:sticky lg:top-24">
        <TipCard>
          Startups com logo + cover preenchidos recebem{" "}
          <strong>3,2× mais cliques</strong> no marketplace. Capricha aqui.
        </TipCard>
        <PublicPreviewCard startup={startup} />
      </aside>
    </div>
  );
}
