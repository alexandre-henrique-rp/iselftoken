import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { StartupCard } from "../startup-card";
import type { Startup } from "../startup-card";

/**
 * Spec unitario -- Visibilidade de botoes nos cards do /founder/dashboard.
 *
 * Cobre a regra de negocio documentada em CASE.md na secao
 * `[Painel do Fundador]`. Valida que cada botao aparece SOMENTE nos status
 * esperados (matriz 6 status x 7 botoes).
 */

const BASE_STARTUP = {
  id: "1",
  slug: "techinnovate",
  name: "TechInnovate",
  segment: "AI",
  logo: "https://example.com/logo.png",
  platformStatus: "approved" as const,
  raised: "R$ 2.250.000",
  goal: "R$ 5.000.000",
  raisedAmount: 2_250_000,
  goalAmount: 5_000_000,
  progressPct: 45,
};

function makeStartup(overrides: Partial<Startup>): Startup {
  return { ...BASE_STARTUP, ...overrides } as Startup;
}

function renderCard(startup: Startup) {
  return render(
    <MemoryRouter>
      <StartupCard startup={startup} />
    </MemoryRouter>,
  );
}

const STATUS_LIST = [
  "draft",
  "open",
  "paused",
  "closed",
  "funded",
  "paid_out",
] as const;

/** Factory de assercoes reutilizaveis -- cada it monta/destroi seu proprio DOM */
function buildSuite(status: Startup["campaignStatus"]) {
  const startup = makeStartup({ campaignStatus: status });
  return () => {
    renderCard(startup);
    return startup;
  };
}

describe.each(STATUS_LIST)(
  "StartupCard -- visibilidade por campaignStatus = '%s'",
  (status) => {
    let renderedStartup: Startup;

    beforeEach(() => {
      renderedStartup = buildSuite(status)();
    });

    it("exibe link Editar (sempre visivel)", () => {
      expect(
        screen.getByRole("link", { name: "Editar" }),
      ).toHaveAttribute("href", "/founder/startups/1/edit");
    });

    // ===== Ver investidores (aria-label "Ver investidores") =====
    // Regra CASE.md [Painel do Fundador]: APENAS OPEN
    if (status === "open") {
      it("exibe botao Ver investidores (regra: apenas OPEN)", () => {
        expect(
          screen.getByRole("link", { name: "Ver investidores" }),
        ).toHaveAttribute("href", "/founder/investors?startupId=1");
      });
    } else {
      it("oculta botao Ver investidores (regra: apenas OPEN)", () => {
        expect(
          screen.queryByRole("link", { name: "Ver investidores" }),
        ).toBeNull();
      });
    }

    // ===== Transparencia (aria-label "Transparencia") =====
    if (status === "funded" || status === "paid_out") {
      it("exibe Transparência quando a captação está financiada", () => {
        expect(
          screen.getByRole("link", { name: "Transparência" }),
        ).toBeInTheDocument();
      });
    } else {
      it("oculta Transparência antes da captação ser financiada", () => {
        expect(
          screen.queryByRole("link", { name: "Transparência" }),
        ).toBeNull();
      });
    }

    // ===== Afiliados (Handshake) =====
    // Regra CASE.md: APENAS OPEN
    if (status === "open") {
      it("exibe botao Afiliados (regra: apenas OPEN)", () => {
        expect(
          screen.getByRole("link", { name: "Afiliados" }),
        ).toHaveAttribute(
          "href",
          "/founder/affiliate/triagem?startupId=1",
        );
      });
    } else {
      it("oculta botao Afiliados", () => {
        expect(
          screen.queryByRole("link", { name: "Afiliados" }),
        ).toBeNull();
      });
    }

    // ===== Editar Captacao (ClipboardList) =====
    // Regra CASE.md: APENAS DRAFT
    if (status === "draft") {
      it("exibe botao Editar Captacao (regra: apenas DRAFT)", () => {
        expect(
          screen.getByRole("link", { name: "Editar Capta\u00e7\u00e3o" }),
        ).toHaveAttribute("href", "/founder/startups/1/captacao");
      });
    } else {
      it("oculta botao Editar Captacao", () => {
        expect(
          screen.queryByRole("link", { name: "Editar Capta\u00e7\u00e3o" }),
        ).toBeNull();
      });
    }

    // ===== Nova Captação (Rocket) =====
    // Sprint S34-d: APENAS PAID_OUT (repasse concluído). FUNDED mostra
    // "Repasse" / "Solicitar Parcela" no lugar (repasse em curso).
    if (status === "paid_out") {
      it("exibe CTA Nova Captação (regra: apenas PAID_OUT, repasse concluído)", () => {
        expect(
          screen.getByRole("link", { name: "Nova Captação" }),
        ).toHaveAttribute("href", "/founder/startups/1/new-round");
      });
    } else {
      it("oculta CTA Nova Captação (FUNDED mas repasse em curso)", () => {
        expect(
          screen.queryByRole("link", { name: "Nova Captação" }),
        ).toBeNull();
      });
    }
  },
);

describe("StartupCard -- invariantes globais", () => {
  it("Editar aparece em TODOS os 6 status", () => {
    for (const status of STATUS_LIST) {
      const { unmount } = renderCard(makeStartup({ campaignStatus: status }));
      expect(
        screen.getByRole("link", { name: "Editar" }),
        `Esperava Editar visivel para status=${status}`,
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("caso critico: CLOSED (captacao encerrada SEM bater meta) NAO mostra Transparencia, NAO mostra Ver investidores", () => {
    // Regra critica CASE.md [Painel do Fundador]:
    // CLOSED -> sem repasse/dividendos/motivo estruturado para relato.
    renderCard(makeStartup({ campaignStatus: "closed" }));
    expect(
      screen.queryByRole("link", { name: "Transparência" }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Ver investidores" }),
    ).toBeNull();
    // Solicitar Parcela NÃO aparece (CLOSED não tem repasse configurado).
    expect(
      screen.queryByRole("link", { name: "Solicitar Parcela" }),
    ).toBeNull();
  });

  it("Financeiro aparece somente quando o repasse foi configurado", () => {
    renderCard(
      makeStartup({
        campaignStatus: "funded",
        repasseConfigurado: true,
        campaignId: 99,
      }),
    );
    expect(screen.getByRole("link", { name: "Financeiro" })).toHaveAttribute(
      "href",
      "/founder/campaigns/99/financeiro",
    );
  });

  it("Financeiro fica oculto enquanto as parcelas não foram definidas", () => {
    renderCard(makeStartup({ campaignStatus: "funded" }));
    expect(screen.queryByRole("link", { name: "Financeiro" })).toBeNull();
  });

  it("Transparência aparece quando FUNDED mesmo sem repasse configurado", () => {
    renderCard(makeStartup({ campaignStatus: "funded" }));
    expect(
      screen.getByRole("link", { name: "Transparência" }),
    ).toHaveAttribute("href", "/founder/startups/1/transparencia");
  });

  it("tooltips (title) em PT-BR descrevem o contexto da regra", () => {
    renderCard(
      makeStartup({ campaignStatus: "paid_out", repasseConfigurado: true }),
    );
    expect(
      screen.getByRole("link", { name: "Transparência" }),
    ).toHaveAttribute("title", "Transparência e divulgações");
    expect(
      screen.getByRole("link", { name: "Nova Captação" }),
    ).toHaveAttribute(
      "title",
      "Iniciar nova captação (repasse concluído)",
    );
  });
});
