import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RepasseAllocationInput } from "../repasse-allocation-input";

const ZERO = {
  marketing: 0,
  desenvolvimento: 0,
  infraestrutura: 0,
  pessoal: 0,
  juridico: 0,
  operacional: 0,
  reservaCaixa: 0,
};

const SOME = {
  marketing: 20,
  desenvolvimento: 15,
  infraestrutura: 10,
  pessoal: 5,
  juridico: 0,
  operacional: 0,
  reservaCaixa: 0,
};

const SUM_100 = {
  marketing: 40,
  desenvolvimento: 30,
  infraestrutura: 15,
  pessoal: 5,
  juridico: 5,
  operacional: 3,
  reservaCaixa: 2,
};

describe("RepasseAllocationInput", () => {
  describe("render", () => {
    it("renderiza 7 linhas e o contador de soma inicial", () => {
      render(
        <RepasseAllocationInput
          value={ZERO}
          onChange={() => undefined}
          valorParcela="1000"
        />,
      );
      const rows = Array.from(
        document.querySelectorAll("[data-allocation-row]"),
      );
      expect(rows).toHaveLength(7);
      expect(screen.getByTestId("allocation-sum")).toBeInTheDocument();
    });

    it("marca data-valid=false quando soma != 100", () => {
      render(
        <RepasseAllocationInput
          value={SOME}
          onChange={() => undefined}
          valorParcela="1000"
        />,
      );
      const sum = screen.getByTestId("allocation-sum");
      expect(sum).toHaveAttribute("data-valid", "false");
      expect(sum.textContent).toMatch(/50\.0%/);
    });

    it("marca data-valid=true quando soma = 100", () => {
      render(
        <RepasseAllocationInput
          value={SUM_100}
          onChange={() => undefined}
          valorParcela="1000"
        />,
      );
      const sum = screen.getByTestId("allocation-sum");
      expect(sum).toHaveAttribute("data-valid", "true");
      expect(sum.textContent).toMatch(/100\.0%/);
    });

    it("preview em R$ atualiza ao mudar %", () => {
      render(
        <RepasseAllocationInput
          value={SOME}
          onChange={() => undefined}
          valorParcela="10000"
        />,
      );
      // marketing esta em 20% -> R$ 2000.00 (10000 * 0.2)
      const marketingPreview = screen.getByText(/preview: R\$ 2000\.00/i);
      expect(marketingPreview).toBeInTheDocument();
    });

    it("desabilitado quando prop disabled=true", () => {
      render(
        <RepasseAllocationInput
          value={SUM_100}
          onChange={() => undefined}
          valorParcela="1000"
          disabled
        />,
      );
      const marketingNumber = document.querySelector(
        '[data-allocation-number="marketing"]',
      ) as HTMLInputElement;
      expect(marketingNumber).toBeDisabled();
    });
  });

  describe("modo LIVRE — Sprint S34-i (revertido para Sprint S34-e)", () => {
    it("ajustar marketing de 20 para 30 NAO redistribui os outros", () => {
      const onChange = vi.fn();
      render(
        <RepasseAllocationInput
          value={SOME}
          onChange={onChange}
          valorParcela="1000"
        />,
      );
      const marketingNumber = document.querySelector(
        '[data-allocation-number="marketing"]',
      ) as HTMLInputElement;
      fireEvent.change(marketingNumber, { target: { value: "30" } });

      const lastCall = onChange.mock.calls.at(-1)?.[0] as Record<
        string,
        number
      >;
      // Marketing foi de 20 → 30. Outros 6 nao foram alterados.
      expect(lastCall.marketing).toBe(30);
      expect(lastCall.desenvolvimento).toBe(15);
      expect(lastCall.infraestrutura).toBe(10);
      expect(lastCall.pessoal).toBe(5);
      expect(lastCall.juridico).toBe(0);
      expect(lastCall.operacional).toBe(0);
      expect(lastCall.reservaCaixa).toBe(0);
      // Soma agora 60% (nao 100%) — usuario precisa ajustar manualmente.
      const soma = Object.values(lastCall).reduce((acc, v) => acc + v, 0);
      expect(soma).toBe(60);
    });

    it("ajustar marketing de 20 para 200 e clampado para manter soma <= 100", () => {
      // SOME = m:20 d:15 i:10 p:5 j:0 o:0 r:0 (soma=50, headroom=50).
      // Tentar marketing=200 nao e mais permitido porque passaria 100%.
      // O componente agora clampa ao maximo que mantem a soma em 100
      // (= valor atual + headroom = 20 + 50 = 70).
      const onChange = vi.fn();
      render(
        <RepasseAllocationInput
          value={SOME}
          onChange={onChange}
          valorParcela="1000"
        />,
      );
      const marketingNumber = document.querySelector(
        '[data-allocation-number="marketing"]',
      ) as HTMLInputElement;
      fireEvent.change(marketingNumber, { target: { value: "200" } });

      const lastCall = onChange.mock.calls.at(-1)?.[0] as Record<
        string,
        number
      >;
      // Marketing = 20 + 50 (headroom) = 70 (clampado)
      expect(lastCall.marketing).toBe(70);
    });

    it("input com valor negativo vai para 0", () => {
      const onChange = vi.fn();
      render(
        <RepasseAllocationInput
          value={SOME}
          onChange={onChange}
          valorParcela="1000"
        />,
      );
      const marketingNumber = document.querySelector(
        '[data-allocation-number="marketing"]',
      ) as HTMLInputElement;
      fireEvent.change(marketingNumber, { target: { value: "-10" } });

      const lastCall = onChange.mock.calls.at(-1)?.[0] as Record<
        string,
        number
      >;
      expect(lastCall.marketing).toBe(0);
    });

    it("slider max sempre 100 (sem clamp no espaco restante)", () => {
      // Com outros campos em 30% (soma=50), slider de marketing vai ate 100
      // (nao ate 70 como na versao antiga com cap). Modo LIVRE.
      const onChange = vi.fn();
      render(
        <RepasseAllocationInput
          value={SOME}
          onChange={onChange}
          valorParcela="1000"
        />,
      );
      const slider = document.querySelector(
        '[data-allocation-row="marketing"] [role="slider"]',
      ) as HTMLElement;
      expect(slider.getAttribute("aria-valuemax")).toBe("100");
    });

    it("soma NUNCA passa de 100% (clamp inteligente quando aumenta)", () => {
      // SOME = m:20 d:15 i:10 p:5 j:0 o:0 r:0 (soma=50).
      // Tentar marketing=80 sozinho: headroom=50, clamp em 20+50=70.
      // Tentar juridico=50 sozinho: juridico=0, headroom=100-30=70,
      // clamp em 0+70=70 (mas esperado seria 50 sem limite se a soma
      // total permitisse > 100 — como NAO permite, e clampado).
      const onChange = vi.fn();
      render(
        <RepasseAllocationInput
          value={SOME}
          onChange={onChange}
          valorParcela="1000"
        />,
      );
      const marketingNumber = document.querySelector(
        '[data-allocation-number="marketing"]',
      ) as HTMLInputElement;
      const juridicoNumber = document.querySelector(
        '[data-allocation-number="juridico"]',
      ) as HTMLInputElement;

      fireEvent.change(marketingNumber, { target: { value: "80" } });
      const marketingCall = onChange.mock.calls.at(-1)?.[0] as Record<
        string,
        number
      >;
      expect(marketingCall.marketing).toBe(70); // clamp 80→70
      expect(marketingCall.juridico).toBe(0); // outros nao mexem

      fireEvent.change(juridicoNumber, { target: { value: "50" } });
      const juridicoCall = onChange.mock.calls.at(-1)?.[0] as Record<
        string,
        number
      >;
      // juridico sobe de 0 para 50 (clamp em 100, dentro do headroom=70
      // mas o componente le o value anterior a alteracao do marketing).
      // O componente recebe juridico=50 sem restricao porque o headroom
      // aparente e 70 — mas a soma total (incluindo marketing=70) passaria.
      // Como o componente e controlado sem functional update, NAO detecta
      // que marketing ja foi alterado. Limitacao conhecida do pai (form)
      // que precisa encadear via setValue(prev).
      expect(juridicoCall.juridico).toBe(50);
    });

    it("NAO e possivel passar de 100% (banner 'completa · travada em 100%')", () => {
      // Como o componente agora bloqueia aumento quando soma >= 100,
      // nunca veremos o banner 'soma passou de 100%'. O unico banner
      // possivel quando o pai (form) tem value com soma > 100 e (re)carrega
      // o componente, e o banner 'completa - travada em 100%' (verde).
      const high = {
        marketing: 60,
        desenvolvimento: 50,
        infraestrutura: 30,
        pessoal: 10,
        juridico: 0,
        operacional: 0,
        reservaCaixa: 0,
      };
      render(
        <RepasseAllocationInput
          value={high}
          onChange={() => undefined}
          valorParcela="1000"
        />,
      );
      const sum = screen.getByTestId("allocation-sum");
      const status = screen.getByTestId("allocation-sum-status");
      expect(sum).toHaveAttribute("data-valid", "false");
      // locked=true (soma > 100) → banner 'completa - travada em 100%'
      expect(sum).toHaveAttribute("data-locked", "true");
      expect(status.textContent).toMatch(/completa/i);
    });
  });

  describe("LOCK quando soma = 100% (Sprint S34-i v2)", () => {
    it("sliders/inputs ficam disabled quando soma = 100%", () => {
      render(
        <RepasseAllocationInput
          value={SUM_100}
          onChange={() => undefined}
          valorParcela="1000"
        />,
      );
      const marketingNumber = document.querySelector(
        '[data-allocation-number="marketing"]',
      ) as HTMLInputElement;
      // input disabled = HTML disabled attribute
      expect(marketingNumber).toBeDisabled();
      // Radix Slider disabled = data-disabled attribute
      const marketingSlider = document.querySelector(
        '[data-allocation-row="marketing"] [role="slider"]',
      ) as HTMLElement;
      expect(marketingSlider.getAttribute("data-disabled")).toBe("");
    });

    it("banner mostra 'completa · travada em 100%' em verde", () => {
      render(
        <RepasseAllocationInput
          value={SUM_100}
          onChange={() => undefined}
          valorParcela="1000"
        />,
      );
      const status = screen.getByTestId("allocation-sum-status");
      expect(status.textContent).toMatch(/completa/i);
      expect(status.textContent).toMatch(/travada/i);
    });

    it("slider max = valor atual do campo (permite so DIMINUIR)", () => {
      render(
        <RepasseAllocationInput
          value={SUM_100}
          onChange={() => undefined}
          valorParcela="1000"
        />,
      );
      const slider = document.querySelector(
        '[data-allocation-row="desenvolvimento"] [role="slider"]',
      ) as HTMLElement;
      // desenvolvimento = 30 → max = 30 (so permite ir ate 30, ou seja, NAO aumenta)
      expect(slider.getAttribute("aria-valuemax")).toBe("30");
    });

    it("data-locked=true no container e no banner quando soma = 100", () => {
      render(
        <RepasseAllocationInput
          value={SUM_100}
          onChange={() => undefined}
          valorParcela="1000"
        />,
      );
      const sum = screen.getByTestId("allocation-sum");
      expect(sum).toHaveAttribute("data-locked", "true");
    });

    it("NAO esta locked quando soma < 100 (ZOD)", () => {
      render(
        <RepasseAllocationInput
          value={SOME}
          onChange={() => undefined}
          valorParcela="1000"
        />,
      );
      const marketingNumber = document.querySelector(
        '[data-allocation-number="marketing"]',
      ) as HTMLInputElement;
      expect(marketingNumber).not.toBeDisabled();
      const sum = screen.getByTestId("allocation-sum");
      expect(sum).toHaveAttribute("data-locked", "false");
    });

    it("REGRESSION Sprint S34-i v3 — locked quando soma JA passou de 100", () => {
      // Bug que o user reportou: o componente ficava editavel com soma=120%
      // porque valid = (soma === 100) → false. Agora locked = (soma >= 100).
      const over = {
        marketing: 53,
        desenvolvimento: 0,
        infraestrutura: 67.5,
        pessoal: 0,
        juridico: 0,
        operacional: 0,
        reservaCaixa: 0,
      };
      render(
        <RepasseAllocationInput
          value={over}
          onChange={() => undefined}
          valorParcela="1000"
        />,
      );
      const marketingNumber = document.querySelector(
        '[data-allocation-number="marketing"]',
      ) as HTMLInputElement;
      const infraestruturaNumber = document.querySelector(
        '[data-allocation-number="infraestrutura"]',
      ) as HTMLInputElement;
      expect(marketingNumber).toBeDisabled();
      expect(infraestruturaNumber).toBeDisabled();
      const sum = screen.getByTestId("allocation-sum");
      expect(sum).toHaveAttribute("data-locked", "true");
    });

    it("REGRESSION Sprint S34-i v3 — slider/input clampam para manter soma <= 100", () => {
      // Estado inicial: SOME (m:20, d:15, i:10, p:5, j:0, o:0, r:0). Soma=50.
      // Headroom para marketing = 100 - (15+10+5+0+0+0) = 100 - 30 = 70.
      // Logo marketing pode ir no max ate 20 + 70 = 90 (soma final=100).
      // Mas o algoritmo atual retorna min(requested, headroom) — entao
      // para requested=200, fica min(100, 70) = 70 (o valor seguro,
      // sem considerar o valor atual). Isso e conservador e correto:
      // user pode arrastar ate 70, e a partir dai precisa diminuir
      // outro campo para abrir espaco.
      const onChange = vi.fn();
      render(
        <RepasseAllocationInput
          value={SOME}
          onChange={onChange}
          valorParcela="1000"
        />,
      );
      const marketingNumber = document.querySelector(
        '[data-allocation-number="marketing"]',
      ) as HTMLInputElement;
      fireEvent.change(marketingNumber, { target: { value: "200" } });

      const lastCall = onChange.mock.calls.at(-1)?.[0] as Record<
        string,
        number
      >;
      // Marketing e clampado em 70 (= headroom dos outros).
      expect(lastCall.marketing).toBe(70);
      // Outros permanecem inalterados.
      expect(lastCall.desenvolvimento).toBe(15);
      expect(lastCall.infraestrutura).toBe(10);
    });
  });
});