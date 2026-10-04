import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { StartupGridCard } from "../startup-grid-card";
import type { Startup } from "../startup-card";

/**
 * Spec unitario -- Visibilidade de botoes na variante GRID do card
 * (/founder/dashboard, view=grid). Garante PARIDADE com a regra do
 * `startup-card.tsx` (list) e `startup-actions-cell.tsx`, documentada em
 * CASE.md `[Painel do Fundador]`.
 *
 * Regras cobertas:
 *  - Editar: sempre visivel
 *  - Editar Captacao: apenas DRAFT
 *  - Afiliados: apenas OPEN
 *  - Financeiro: apenas != OPEN
 *  - Transparencia + Solicitar Parcela: apenas (FUNDED|PAID_OUT) E repasse liberado
 *  - Nova Captação: apenas FUNDED
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

function renderGrid(startup: Startup) {
  return render(
    <MemoryRouter>
      <StartupGridCard startup={startup} />
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

describe.each(STATUS_LIST)(
  "StartupGridCard -- visibilidade por campaignStatus = '%s'",
  (status) => {
    beforeEach(() => {
      renderGrid(
        makeStartup({
          campaignStatus: status,
          ...(status === "draft" ? { platformStatus: "analyzing" } : {}),
        }),
      );
    });

    it("exibe Editar (sempre visivel)", () => {
      expect(
        screen.getByRole("link", { name: "Editar" }),
      ).toHaveAttribute("href", "/founder/startups/1/edit");
    });

    // Financeiro só aparece depois que o Admin define as parcelas.
    it("oculta Financeiro enquanto o repasse não está configurado", () => {
      expect(screen.queryByRole("link", { name: "Financeiro" })).toBeNull();
    });

    // Afiliados: apenas OPEN
    if (status === "open") {
      it("exibe Afiliados (regra: apenas OPEN)", () => {
        expect(
          screen.getByRole("link", { name: "Afiliados" }),
        ).toHaveAttribute("href", "/founder/affiliate/triagem?startupId=1");
      });
    } else {
      it("oculta Afiliados", () => {
        expect(screen.queryByRole("link", { name: "Afiliados" })).toBeNull();
      });
    }

    // Editar Captacao: apenas DRAFT E fase 2 aprovada (S18.6).
    // O describe.each usa `makeStartup({ campaignStatus: status })` sem
    // platformStatus, então cai no default `analyzing` → Editar Captação
    // nunca aparece (porque fase 2 não aprovada).
    if (status === "draft") {
      it("NAO exibe Editar Captacao em DRAFT com fase 2 NAO aprovada (regra S18.6)", () => {
        expect(
          screen.queryByRole("link", { name: "Editar Captação" }),
        ).toBeNull();
      });
    } else {
      it("oculta Editar Captacao (nao DRAFT)", () => {
        expect(
          screen.queryByRole("link", { name: "Editar Captação" }),
        ).toBeNull();
      });
    }

    // Transparência aparece assim que a captação é financiada.
    if (status === "funded" || status === "paid_out") {
      it("exibe Transparência após a captação ser financiada", () => {
        expect(screen.getByRole("link", { name: "Transparência" })).toBeInTheDocument();
      });
    } else {
      it("oculta Transparência antes da captação ser financiada", () => {
        expect(screen.queryByRole("link", { name: "Transparência" })).toBeNull();
      });
    }

    it("não exibe botão Solicitar Parcela separado", () => {
      expect(screen.queryByRole("link", { name: "Solicitar Parcela" })).toBeNull();
    });

    // Nova Captação: apenas PAID_OUT (Sprint S34-d — repasse concluído)
    if (status === "paid_out") {
      it("exibe Nova Captação (regra: apenas PAID_OUT, repasse concluído)", () => {
        expect(
          screen.getByRole("link", { name: /nova captação/i }),
        ).toHaveAttribute("href", "/founder/startups/1/new-round");
      });
    } else {
      it("oculta Nova Captação (FUNDED mas repasse em curso)", () => {
        expect(
          screen.queryByRole("link", { name: /nova captação/i }),
        ).toBeNull();
      });
    }
  },
);

describe("StartupGridCard -- repasse liberado (FUNDED|PAID_OUT + configurado)", () => {
  for (const status of ["funded", "paid_out"] as const) {
    it(`exibe Transparencia quando ${status} e repasse configurado`, () => {
      renderGrid(makeStartup({ campaignStatus: status, repasseConfigurado: true }));
      expect(
        screen.getByRole("link", { name: "Transparência" }),
      ).toHaveAttribute("href", "/founder/startups/1/transparencia");
    });

    it(`exibe Financeiro quando ${status} e repasse configurado`, () => {
      renderGrid(
        makeStartup({ campaignStatus: status, repasseConfigurado: true }),
      );
      expect(screen.getByRole("link", { name: "Financeiro" })).toHaveAttribute(
        "href",
        "/founder/startups/1/financeiro",
      );
    });
  }

  it("Financeiro usa link direto da campanha quando configurado", () => {
    renderGrid(
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

  it("NAO exibe Transparencia/Financeiro em OPEN mesmo configurado", () => {
    renderGrid(makeStartup({ campaignStatus: "open", repasseConfigurado: true }));
    expect(screen.queryByRole("link", { name: "Transparência" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Financeiro" })).toBeNull();
  });

  it("Financeiro usa link direto da campanha (S18.6) quando campaignId presente", () => {
    renderGrid(
      makeStartup({
        campaignStatus: "funded",
        campaignId: 99,
        repasseConfigurado: true,
      }),
    );
    expect(
      screen.getByRole("link", { name: "Financeiro" }),
    ).toHaveAttribute("href", "/founder/campaigns/99/financeiro");
  });

  it("S18.6 — Editar Captacao SÓ aparece em DRAFT com fase 2 aprovada", () => {
    renderGrid(
      makeStartup({
        campaignStatus: "draft",
        platformStatus: "approved",
      }),
    );
    expect(
      screen.getByRole("link", { name: "Editar Captação" }),
    ).toHaveAttribute("href", "/founder/startups/1/captacao");
  });

  it("Financeiro NAO aparece em DRAFT mesmo com campaignId (regra: só captação finalizada)", () => {
    renderGrid(
      makeStartup({ campaignStatus: "draft", campaignId: 99 }),
    );
    expect(screen.queryByRole("link", { name: "Financeiro" })).toBeNull();
  });
});
