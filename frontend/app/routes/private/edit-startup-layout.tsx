import { AlertTriangle, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import type { LoaderFunctionArgs } from "react-router";
import { Outlet, redirect, useLoaderData, useLocation } from "react-router";
import { EditStartupActionBar } from "~/components/founder/edit-startup-action-bar";
import { EditStartupHeader } from "~/components/founder/edit-startup-header";
import { EditStartupNav } from "~/components/founder/edit-startup-nav";
import { GlobalErrorBoundary } from "~/components/system/global-error-boundary";
import {
  EditStartupFormContext,
  EditStartupFormProvider,
} from "~/lib/edit-startup-form-context";
import { countriesQueryOptions, queryKeys, type Country } from "~/lib/queries";
import { memberToSocio, memberToTeam } from "~/lib/team-payload";
import { isOfficialSocialUrl } from "~/lib/social-url";
import { useContext } from "react";
import { useTermoAdesaoStatus } from "~/hooks/use-termo-adesao-status";
import type { StartupDetail } from "~/lib/startup-loader";

/** Seção "Documentos" no nav do `edit-startup-nav.tsx` (índice 2). */
const DOCUMENTOS_NAV_INDEX = 2;

function resolveDocumentosLockedIndex(
  pathname: string,
  base: string,
): number | null {
  const normalized = pathname.replace(/\/+$/, "");
  if (normalized === `${base}/documentos` || normalized.startsWith(`${base}/documentos/`)) {
    return DOCUMENTOS_NAV_INDEX;
  }
  return null;
}

const EMPTY_COUNTRIES: Country[] = [];

export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<StartupDetail> {
  // BUG-FT-010 — guarda defensiva. Antes do fix, pais com template literal
  // quebrado (`/founder/startups/${undefined}/edit`) produziam `params.id`
  // como a string literal "undefined" — que passa `if (!id)` (truthy) e
  // dispara fetch `/api/startups/undefined` → 404 → redirect. O flash de
  // render com id inválido era desnecessário. Rejeitar string "undefined"
  // (e qualquer falsy) antes do fetch.
  const id = params.id;
  if (!id || id === "undefined") {
    throw redirect("/founder/dashboard");
  }

  const url = new URL(request.url);
  const response = await fetch(
    `${url.protocol}//${url.host}/api/startups/${encodeURIComponent(id)}`,
    {
      headers: { Cookie: request.headers.get("cookie") ?? "" },
    },
  );

  if (response.status === 404) {
    throw redirect("/founder/dashboard");
  }
  if (!response.ok) {
    throw new Response("Falha ao carregar startup", {
      status: response.status,
    });
  }

  return response.json() as Promise<StartupDetail>;
}

/**
 * Registra o save consolidado NO contexto do EditStartupFormProvider.
 * Precisa renderizar como filho do provider para que `setOnSave` atinja o
 * mesmo contexto lido pela EditStartupActionBar (o botão "Salvar").
 *
 * S6-T01 — coleta os sectionValues das abas e envia UM PATCH unificado.
 */
export function EditStartupSaveRegistrar({ startupId }: { startupId: string }) {
  const queryClient = useQueryClient();
  const { setOnSave, getAllSectionValues, setDirtyCount } = useContext(
    EditStartupFormContext,
  );
  const { data: countriesData } = useQuery<Country[]>(countriesQueryOptions);
  const countries = countriesData ?? EMPTY_COUNTRIES;

  useEffect(() => {
    setOnSave?.(async () => {
      const sections = getAllSectionValues();
      const payload: Record<string, unknown> = {};

      // Cada seção RHF registra { values, dirtyFields }. Só enviamos os
      // campos efetivamente alterados (dirty) — evita reenviar o form inteiro.
      type SectionState = {
        values?: Record<string, unknown>;
        dirtyFields?: Record<string, unknown>;
      };
      const asState = (s: unknown): SectionState => {
        const obj = (s ?? {}) as Record<string, unknown>;
        // Retrocompat: se a seção ainda registra valores "crus" (sem wrapper),
        // trata tudo como não-dirty para não vazar campos inalterados.
        if ("values" in obj || "dirtyFields" in obj) return obj as SectionState;
        return { values: obj, dirtyFields: {} };
      };

      // ----- Identidade Legal (aba Identidade) -----
      const corp = asState(sections["corporate-identity"]);
      const corporate = corp.values ?? {};
      const corpDirty = corp.dirtyFields ?? {};
      const soc = asState(sections["social-links"]);
      const social = soc.values ?? {};
      const socDirty = soc.dirtyFields ?? {};

      const str = (v: unknown): string =>
        typeof v === "string" ? v.trim() : "";
      const isDirty = (d: Record<string, unknown>, k: string): boolean =>
        Boolean(d[k]);

      if (isDirty(corpDirty, "razaoSocial")) {
        payload.razao_social = str(corporate.razaoSocial);
      }
      if (isDirty(corpDirty, "nomeFantasia")) {
        payload.nome = str(corporate.nomeFantasia);
      }
      if (isDirty(corpDirty, "cnpj")) {
        const cnpjDigits = str(corporate.cnpj).replace(/\D/g, "");
        if (cnpjDigits.length === 14) payload.cnpj = cnpjDigits;
      }
      if (isDirty(corpDirty, "estagio")) {
        payload.estagio = str(corporate.estagio);
      }
      if (isDirty(corpDirty, "anoFundacao")) {
        const anoFundacao = str(corporate.anoFundacao);
        if (anoFundacao && /^\d{4}$/.test(anoFundacao)) {
          payload.data_fundacao = `${anoFundacao}-01-01`;
        }
      }
      if (isDirty(corpDirty, "categoryId") && typeof corporate.categoryId === "number") {
        payload.categoryId = corporate.categoryId;
      }
      if (isDirty(corpDirty, "areaAtuacaoIds")) {
        const areaIds = Array.isArray(corporate.areaAtuacaoIds)
          ? corporate.areaAtuacaoIds.filter((id): id is number => typeof id === "number")
          : [];
        payload.areaAtuacaoIds = areaIds;
      }
      if (isDirty(corpDirty, "paisIso3")) {
        const paisIso3 = str(corporate.paisIso3);
        if (paisIso3) {
          // DTO backend exige { nome, codigo }. Resolve o nome pelo ISO3.
          const country = countries.find((c) => c.iso3 === paisIso3);
          payload.pais = {
            nome: country?.name ?? paisIso3,
            codigo: paisIso3,
            emoji: country?.emoji,
          };
        }
      }

      // ----- Localização (aba Identidade) -----
      // Endereço é persistido dentro do JSON `pais` (Startup não tem colunas
      // próprias de endereço). Sempre reenvia nome+codigo (exigidos pelo DTO).
      const loc = asState(sections["location-fields"]);
      const location = loc.values ?? {};
      const locDirty = loc.dirtyFields ?? {};
      const locChanged = [
        "cep",
        "logradouro",
        "numero",
        "complemento",
        "bairro",
        "cidade",
        "estado",
        "pais",
      ].some((k) => isDirty(locDirty, k));
      if (locChanged) {
        const paisNome = str(location.pais);
        const country =
          countries.find(
            (c) => c.name?.toLowerCase() === paisNome.toLowerCase(),
          ) ??
          countries.find((c) => c.iso3 === str(corporate.paisIso3));
        const existing = (payload.pais ?? {}) as Record<string, string>;
        payload.pais = {
          nome: existing.nome ?? country?.name ?? paisNome ?? "Brasil",
          codigo:
            existing.codigo ?? country?.iso3 ?? paisNome ?? "BRA",
          emoji: existing.emoji ?? country?.emoji,
          cep: str(location.cep).replace(/\D/g, ""),
          logradouro: str(location.logradouro),
          numero: str(location.numero),
          complemento: str(location.complemento),
          bairro: str(location.bairro),
          cidade: str(location.cidade),
          uf: str(location.estado).toUpperCase(),
        };
      }

      if (isDirty(socDirty, "site")) payload.site = str(social.site);
      if (isDirty(socDirty, "youtube")) {
        payload.youtube_url = str(social.youtube);
      }
      // redes_sociais: se qualquer rede mudou, reenvia o conjunto atual.
      const redesChanged =
        isDirty(socDirty, "linkedin") ||
        isDirty(socDirty, "instagram") ||
        isDirty(socDirty, "twitter");
      if (redesChanged) {
        const socialNetworks = [
          ["linkedin", "LinkedIn"],
          ["instagram", "Instagram"],
          ["twitter", "X / Twitter"],
        ] as const;
        for (const [network, label] of socialNetworks) {
          const value = str(social[network]);
          if (value && !isOfficialSocialUrl(value, network)) {
            throw new Error(`${label} deve ser uma URL HTTPS oficial da rede.`);
          }
        }
        const redes: Record<string, string> = {};
        const linkedin = str(social.linkedin);
        if (linkedin) redes.linkedin = linkedin;
        const instagram = str(social.instagram);
        if (instagram) redes.instagram = instagram;
        const twitter = str(social.twitter);
        if (twitter) redes.twitter = twitter;
        payload.redes_sociais = redes;
      }

      // ----- Time (aba Time) -----
      const founders = asState(sections["founders"]);
      const advisors = asState(sections["advisors"]);
      const employees = asState(sections["employees"]);
      const foundersRaw =
        (founders.values?.members as Array<Record<string, unknown>> | undefined) ??
        [];
      const validFounders = foundersRaw.filter(
        (m) =>
          typeof m?.nome === "string" &&
          m.nome.trim() &&
          typeof m?.cargo === "string" &&
          m.cargo.trim(),
      ).length;
      const defaultParticipacao =
        validFounders > 0 ? Math.floor(100 / validFounders) : 0;

      const socios = foundersRaw
        .map((m) => memberToSocio(m as any, defaultParticipacao))
        .filter((m) => m !== null);
      const advisorsRaw =
        (advisors.values?.members as Array<Record<string, unknown>> | undefined) ??
        [];
      const employeesRaw =
        (employees.values?.members as Array<Record<string, unknown>> | undefined) ??
        [];
      const teams = [...advisorsRaw, ...employeesRaw]
        .map((m) => memberToTeam(m as any))
        .filter((m) => m !== null);

      const teamChanged =
        Object.keys(founders.dirtyFields ?? {}).length > 0 ||
        Object.keys(advisors.dirtyFields ?? {}).length > 0 ||
        Object.keys(employees.dirtyFields ?? {}).length > 0;
      if (teamChanged) {
        // Envia arrays vazios também, permitindo remover todos os membros.
        payload.socios = socios;
        payload.teams = teams;
      }

      // Documentos + Bancario: persistem via /api/uploads ou proprio endpoint.
      // Quando esses flows existirem, integrar aqui.

      if (Object.keys(payload).length === 0) {
        toast.info("Nenhuma alteração para salvar.");
        return;
      }

      try {
        const res = await fetch(`/api/startup/${startupId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const json = (await res.json().catch(() => null)) as {
          message?: string | string[];
          data?: { id?: number | string };
        } | null;

        if (!res.ok) {
          // O backend (class-validator) pode devolver `message` como array de
          // mensagens de validação. Consolidamos em uma mensagem única, clara
          // e direta, apontando exatamente o que precisa ser corrigido.
          const raw = json?.message;
          const clear = Array.isArray(raw)
            ? raw.join(" • ")
            : (raw ?? "");
          throw new Error(
            clear.trim() ||
              (res.status === 403
                ? "Você não tem permissão para editar esta startup, ou ela não está mais em rascunho."
                : `Não foi possível salvar (erro ${res.status}). Verifique os campos e tente novamente.`),
          );
        }

        // S6-T03 — Validar que o backend persistiu de fato (response.id bate)
        const persistedId =
          typeof json?.data?.id === "string"
            ? Number(json.data.id)
            : json?.data?.id;
        if (persistedId !== Number(startupId)) {
          throw new Error(
            "Backend nao confirmou persistencia (response.id diverge).",
          );
        }

        // S6-T03 — Invalidar cache TanStack Query apos save
        queryClient.invalidateQueries({
          queryKey: queryKeys.startup.detail(startupId as string),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.startup.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.startup.overview });

        setDirtyCount(0);
        toast.success("Alterações salvas com sucesso!");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao salvar alterações",
        );
        throw err;
      }
    });
  }, [setOnSave, getAllSectionValues, setDirtyCount, startupId, queryClient, countries]);

  return null;
}

export default function EditStartupLayout() {
  const startup = useLoaderData<typeof loader>();
  const [isResubmitting, setIsResubmitting] = useState(false);

  // Bloqueio de navegação: se o termo de adesão NÃO está assinado E o usuário
  // está na seção "Documentos", o avanço para "Bancário" (ou qualquer seção
  // posterior) fica bloqueado até que aceite e salve o termo.
  // Voltar para Identidade/Time nunca é bloqueado.
  const { pathname } = useLocation();
  const editBase = `/founder/startups/${startup.id}/edit`;
  const documentosActive = resolveDocumentosLockedIndex(pathname, editBase);
  const termoStatusQuery = useTermoAdesaoStatus(startup.id);
  const termoAceito = termoStatusQuery.data?.exists === true;
  const lockedFromIndex =
    documentosActive !== null && !termoAceito ? DOCUMENTOS_NAV_INDEX : null;

  async function handleResubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isResubmitting) return;
    setIsResubmitting(true);

    try {
      const response = await fetch(`/api/startup/${startup.id}/resubmit`, {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        toast.error(body?.message ?? "Não foi possível ressubmeter a startup.");
        return;
      }

      toast.success("Startup ressubmetida para nova análise.");
      window.location.reload();
    } catch {
      toast.error("Serviço de startups indisponível.");
    } finally {
      setIsResubmitting(false);
    }
  }

  return (
    <EditStartupFormProvider>
      {/* Registra o save consolidado DENTRO do provider para que
          form.setOnSave atinja o mesmo contexto lido pela action bar. */}
      <EditStartupSaveRegistrar startupId={startup.id} />
      <div className="startup-editor-shell isolate -mx-6 min-h-screen overflow-x-clip bg-background pb-28 text-foreground lg:-mx-12">
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 md:px-8 lg:max-w-[1400px] lg:pt-6">
          <EditStartupHeader
            name={startup.name}
            platformStatus={startup.platformStatus}
            campaignStatus={startup.campaignStatus}
          />

          {/* Banner de ressubmissão para startups rejeitadas (PRD §14.2) */}
          {startup.platformStatus === "rejected" && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-100">
                    Startup rejeitada pela curadoria
                  </p>
                  <p className="text-xs text-amber-100/70 mt-1">
                    Corrija os problemas apontados e ressubmeta para uma nova
                    análise do Compliance.
                  </p>
                </div>
              </div>
              <form onSubmit={handleResubmit}>
                <button
                  type="submit"
                  disabled={isResubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isResubmitting
                    ? "Ressubmetendo…"
                    : "Ressubmeter para análise"}
                </button>
              </form>
            </div>
          )}

          <EditStartupNav id={startup.id} lockedFromIndex={lockedFromIndex} />
          <div className="relative z-10">
            <GlobalErrorBoundary>
              <Outlet />
            </GlobalErrorBoundary>
          </div>
        </div>
        <EditStartupActionBar />
      </div>
    </EditStartupFormProvider>
  );
}
