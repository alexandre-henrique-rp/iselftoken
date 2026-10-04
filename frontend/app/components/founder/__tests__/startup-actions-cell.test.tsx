import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StartupActionsCell } from "../startup-actions-cell";

vi.mock("react-router", async () => {
  const actual = await import("react-router");
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...props
    }: {
      to: string;
      children: React.ReactNode;
    }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

const CAMPAIGN_STATUSES = [
  "draft",
  "open",
  "paused",
  "closed",
  "funded",
  "paid_out",
] as const;

describe("StartupActionsCell -- CASE.md [Painel do Fundador]", () => {
  describe("Editar (cadastral) -- sempre visivel", () => {
    for (const status of CAMPAIGN_STATUSES) {
      it(`mostra Editar quando campaignStatus = ${status}`, () => {
        render(
          <StartupActionsCell startupId="startup-1" campaignStatus={status} />,
        );
        expect(
          screen.getByRole("link", { name: /^editar$/i }),
        ).toBeInTheDocument();
      });
    }
  });

  describe("Ver investidores -- APENAS OPEN (regra CASE.md)", () => {
    it("mostra Ver investidores quando campaignStatus = open", () => {
      render(
        <StartupActionsCell
          startupId="s1"
          startupSlug="startup-slug"
          campaignStatus="open"
        />,
      );
      expect(
        screen.getByRole("link", { name: /ver investidores/i }),
      ).toBeInTheDocument();
    });

    for (const status of [
      "draft",
      "paused",
      "closed",
      "funded",
      "paid_out",
    ] as const) {
      it(`NAO mostra Ver investidores quando campaignStatus = ${status}`, () => {
        render(
          <StartupActionsCell startupId="s1" campaignStatus={status} />,
        );
        expect(
          screen.queryByRole("link", { name: /ver investidores/i }),
        ).not.toBeInTheDocument();
      });
    }
  });

  describe("Ver startup -- APENAS OPEN", () => {
    it("mostra o link público quando a captação está ativa", () => {
      render(
        <StartupActionsCell
          startupId="s1"
          startupSlug="startup-slug"
          campaignStatus="open"
        />,
      );
      expect(
        screen.getByRole("link", { name: /ver startup/i }),
      ).toHaveAttribute("href", "/marketplace/startup/startup-slug");
    });

    for (const status of [
      "draft",
      "paused",
      "closed",
      "funded",
      "paid_out",
    ] as const) {
      it(`não mostra o link público quando campaignStatus = ${status}`, () => {
        render(<StartupActionsCell startupId="s1" campaignStatus={status} />);
        expect(
          screen.queryByRole("link", { name: /ver startup/i }),
        ).not.toBeInTheDocument();
      });
    }
  });

  describe("Transparencia -- liberada por configuração do repasse (regra CASE.md)", () => {
    // Com repasse configurado + captação concluída → botão aparece.
    for (const status of ["funded", "paid_out"] as const) {
      it(`mostra Transparencia quando ${status} e repasse configurado`, () => {
        render(
          <StartupActionsCell
            startupId="s1"
            campaignStatus={status}
            repasseConfigurado
          />,
        );
        expect(
          screen.getByRole("link", { name: /transpar[êe]ncia/i }),
        ).toBeInTheDocument();
      });
    }

    // A transparência fica disponível assim que a captação é financiada,
    // mesmo antes de o Admin definir as parcelas.
    for (const status of ["funded", "paid_out"] as const) {
      it(`mostra Transparencia quando ${status} sem repasse configurado`, () => {
        render(<StartupActionsCell startupId="s1" campaignStatus={status} />);
        expect(
          screen.getByRole("link", { name: /transpar[êe]ncia/i }),
        ).toBeInTheDocument();
      });
    }

    // Fora de captação concluída → nunca aparece, mesmo com flag.
    for (const status of [
      "draft",
      "open",
      "paused",
      "closed",
    ] as const) {
      it(`NAO mostra Transparencia quando ${status} (mesmo configurado)`, () => {
        render(
          <StartupActionsCell
            startupId="s1"
            campaignStatus={status}
            repasseConfigurado
          />,
        );
        expect(
          screen.queryByRole("link", { name: /transpar[êe]ncia/i }),
        ).not.toBeInTheDocument();
      });
    }
  });

  describe("Afiliados -- APENAS OPEN", () => {
    it("mostra Afiliados quando campaignStatus = open", () => {
      render(<StartupActionsCell startupId="s1" campaignStatus="open" />);
      expect(
        screen.getByRole("link", { name: /afiliados/i }),
      ).toBeInTheDocument();
    });

    for (const status of [
      "draft",
      "paused",
      "closed",
      "funded",
      "paid_out",
    ] as const) {
      it(`NAO mostra Afiliados quando campaignStatus = ${status}`, () => {
        render(
          <StartupActionsCell startupId="s1" campaignStatus={status} />,
        );
        expect(
          screen.queryByRole("link", { name: /afiliados/i }),
        ).not.toBeInTheDocument();
      });
    }
  });

  describe("Financeiro — rota única do repasse", () => {
    // O acesso às parcelas fica dentro do Financeiro; não renderizamos um
    // segundo botão apontando para a mesma rota.
    for (const status of ["funded", "paid_out"] as const) {
      it(`mostra apenas Financeiro quando ${status} e repasse configurado`, () => {
        render(
          <StartupActionsCell
            startupId="s1"
            campaignStatus={status}
            repasseConfigurado
            campaignId={99}
          />,
        );
        expect(screen.getByRole("link", { name: /financeiro/i })).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /solicitar parcela/i })).not.toBeInTheDocument();
      });
    }

    // Captação concluída MAS repasse não configurado → botão NÃO aparece.
    for (const status of ["funded", "paid_out"] as const) {
      it(`NAO mostra Solicitar Parcela quando ${status} sem repasse configurado`, () => {
        render(
          <StartupActionsCell startupId="s1" campaignStatus={status} />,
        );
        expect(
          screen.queryByRole("link", { name: /solicitar parcela/i }),
        ).not.toBeInTheDocument();
      });
    }

    // Fora de captação concluída → nunca aparece, mesmo com flag.
    for (const status of ["draft", "open", "paused", "closed"] as const) {
      it(`NAO mostra Solicitar Parcela quando ${status} (mesmo configurado)`, () => {
        render(
          <StartupActionsCell
            startupId="s1"
            campaignStatus={status}
            repasseConfigurado
          />,
        );
        expect(
          screen.queryByRole("link", { name: /solicitar parcela/i }),
        ).not.toBeInTheDocument();
      });
    }
  });

  describe("Editar Captacao -- APENAS DRAFT", () => {
    it("mostra Editar Captacao quando campaignStatus = draft", () => {
      render(
        <StartupActionsCell
          startupId="s1"
          campaignStatus="draft"
          platformStatus="approved"
        />,
      );
      expect(
        screen.getByRole("link", { name: /editar captação/i }),
      ).toBeInTheDocument();
    });

    it("mostra correção quando a Fase 3 foi rejeitada", () => {
      render(
        <StartupActionsCell
          startupId="s1"
          campaignStatus="draft"
          phase3Rejected
        />,
      );
      expect(
        screen.getByRole("link", { name: /editar captação/i }),
      ).toBeInTheDocument();
    });

    for (const status of [
      "open",
      "paused",
      "closed",
      "funded",
      "paid_out",
    ] as const) {
      it(`NAO mostra Editar Captacao quando campaignStatus = ${status}`, () => {
        render(
          <StartupActionsCell startupId="s1" campaignStatus={status} />,
        );
        expect(
          screen.queryByRole("link", { name: /editar captação/i }),
        ).not.toBeInTheDocument();
      });
    }
  });

  describe("Pausar -- open + ativa", () => {
    it("mostra Pausar quando campaignStatus = open e roundStatus = ativa", () => {
      const onPausar = vi.fn();
      render(
        <StartupActionsCell
          startupId="s1"
          campaignStatus="open"
          roundStatus="ativa"
          onConfirmPausar={onPausar}
        />,
      );
      const btn = screen.getByRole("button", { name: /pausar/i });
      expect(btn).toBeInTheDocument();
      btn.click();
      expect(onPausar).toHaveBeenCalledTimes(1);
    });

    for (const status of [
      "draft",
      "paused",
      "closed",
      "funded",
      "paid_out",
    ] as const) {
      it(`NAO mostra Pausar quando campaignStatus = ${status}`, () => {
        render(
          <StartupActionsCell startupId="s1" campaignStatus={status} />,
        );
        expect(
          screen.queryByRole("button", { name: /pausar/i }),
        ).not.toBeInTheDocument();
      });
    }
  });

  describe("Retornar + Cancelar -- apenas paused", () => {
    it("mostra Retornar quando campaignStatus = paused", () => {
      render(<StartupActionsCell startupId="s1" campaignStatus="paused" />);
      expect(
        screen.getByRole("link", { name: /retornar/i }),
      ).toBeInTheDocument();
    });

    it("mostra Cancelar quando campaignStatus = paused", () => {
      const onCancelar = vi.fn();
      render(
        <StartupActionsCell
          startupId="s1"
          campaignStatus="paused"
          onConfirmCancelar={onCancelar}
        />,
      );
      const btn = screen.getByRole("button", { name: /cancelar/i });
      expect(btn).toBeInTheDocument();
      btn.click();
      expect(onCancelar).toHaveBeenCalledTimes(1);
    });

    for (const status of [
      "draft",
      "open",
      "closed",
      "funded",
      "paid_out",
    ] as const) {
      it(`NAO mostra Retornar/Cancelar quando campaignStatus = ${status}`, () => {
        render(
          <StartupActionsCell startupId="s1" campaignStatus={status} />,
        );
        expect(
          screen.queryByRole("link", { name: /retornar/i }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: /cancelar/i }),
        ).not.toBeInTheDocument();
      });
    }
  });

  describe("Nova Captacao -- APENAS PAID_OUT (Sprint S34-d, repasse concluído)", () => {
    it("mostra Nova Captacao quando campaignStatus = paid_out", () => {
      render(<StartupActionsCell startupId="s1" campaignStatus="paid_out" />);
      expect(
        screen.getByRole("link", { name: /nova captação/i }),
      ).toBeInTheDocument();
    });

    for (const status of [
      "draft",
      "open",
      "paused",
      "closed",
      "funded",
    ] as const) {
      it(`NAO mostra Nova Captacao quando campaignStatus = ${status} (repasse em curso)`, () => {
        render(
          <StartupActionsCell startupId="s1" campaignStatus={status} />,
        );
        expect(
          screen.queryByRole("link", { name: /nova captação/i }),
        ).not.toBeInTheDocument();
      });
    }
  });

  describe("Tooltips em PT-BR descrevem a restricao de cada botao", () => {
    it("tooltip Transparencia descreve regra de visibilidade", () => {
      render(
        <StartupActionsCell
          startupId="s1"
          campaignStatus="paid_out"
          repasseConfigurado
        />,
      );
      expect(
        screen.getByRole("link", { name: /transpar[êe]ncia/i }),
      ).toHaveAttribute("title", "Transparência e divulgações");
    });

    it("tooltip Nova Captacao descreve repasse concluido (Sprint S34-d)", () => {
      render(<StartupActionsCell startupId="s1" campaignStatus="paid_out" />);
      expect(
        screen.getByRole("link", { name: /nova captação/i }),
      ).toHaveAttribute(
        "title",
        "Iniciar nova captação (repasse concluído)",
      );
    });
  });

  describe("Links com href correto", () => {
    it("Editar leva para /founder/startups/:id/edit", () => {
      render(
        <StartupActionsCell startupId="abc-123" campaignStatus="open" />,
      );
      expect(
        screen.getByRole("link", { name: /^editar$/i }),
      ).toHaveAttribute("href", "/founder/startups/abc-123/edit");
    });

    it("Editar Captacao leva para /founder/startups/:id/captacao", () => {
      render(
        <StartupActionsCell
          startupId="abc-123"
          campaignStatus="draft"
          platformStatus="approved"
        />,
      );
      expect(
        screen.getByRole("link", { name: /editar captação/i }),
      ).toHaveAttribute("href", "/founder/startups/abc-123/captacao");
    });

    it("Transparencia leva para /founder/startups/:id/transparencia quando funded + repasse configurado", () => {
      render(
        <StartupActionsCell
          startupId="abc-123"
          campaignStatus="funded"
          repasseConfigurado
        />,
      );
      expect(
        screen.getByRole("link", { name: /transpar[êe]ncia/i }),
      ).toHaveAttribute(
        "href",
        "/founder/startups/abc-123/transparencia",
      );
    });

    it("Financeiro usa o link da campanha como rota única do repasse", () => {
      render(
        <StartupActionsCell
          startupId="abc-123"
          campaignStatus="funded"
          repasseConfigurado
          campaignId={99}
        />,
      );
      expect(screen.getByRole("link", { name: /financeiro/i })).toHaveAttribute(
        "href",
        "/founder/campaigns/99/financeiro",
      );
      expect(screen.queryByRole("link", { name: /solicitar parcela/i })).not.toBeInTheDocument();
    });

    it("Nova Captacao leva para a nova rodada da startup", () => {
      render(
        <StartupActionsCell startupId="abc-123" campaignStatus="paid_out" />,
      );
      expect(
        screen.getByRole("link", { name: /nova captação/i }),
      ).toHaveAttribute("href", "/founder/startups/abc-123/new-round");
    });
  });
});
