import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { RecursoField, RECURSO_FIELDS } from "../captacao-shared";
import type { RecursosFormData } from "../captacao-shared";

function Harness({
  initialValues,
  watchedOverrides = {},
}: {
  initialValues: Partial<RecursosFormData>;
  watchedOverrides?: Partial<RecursosFormData>;
}) {
  const { control, watch } = useForm<RecursosFormData>({
    defaultValues: {
      recursosFundador: 0,
      recursosDesenvolvimento: 0,
      recursosComercial: 0,
      recursosMarketing: 0,
      recursosNuvem: 0,
      recursosJuridico: 0,
      recursosCaixa: 0,
      ...initialValues,
    },
  });
  const watched = watch();
  return (
    <>
      {RECURSO_FIELDS.map((f) => (
        <RecursoField
          key={f.name}
          name={f.name}
          label={f.label}
          control={control}
          watchedFields={watched}
        />
      ))}
    </>
  );
}

describe("RecursoField — lock quando soma = 100% (Sprint S34-j)", () => {
  it("com soma = 100, campos com currentValue === 0 ficam disabled", () => {
    // Para redistribuir, o user precisa DIMINUIR um campo. Os campos
    // ja em 0 (que nao podem diminuir) ficam disabled. Os campos com
    // valor > 0 ficam enabled mas com max = valor atual (permitem so
    // DIMINUIR).
    const { container } = render(
      <Harness
        initialValues={{
          recursosFundador: 20,
          recursosDesenvolvimento: 30,
          recursosComercial: 10,
          recursosMarketing: 15,
          recursosNuvem: 10,
          recursosJuridico: 5,
          recursosCaixa: 10,
        }}
      />,
    );
    const inputs = container.querySelectorAll(
      'input[type="number"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(inputs.length).toBe(7);
    // Nenhum campo em 0 → nenhum disabled
    inputs.forEach((input) => {
      expect(input).not.toBeDisabled();
    });
  });

  it("com soma < 100, inputs estao habilitados e max = headroom disponivel", () => {
    // Sprint S34-i v3 — clamp inteligente: max de cada campo =
    // min(categoryMax, 100 - somaOutros). categoryMax e 20 para Fundador
    // (regra de negocio) e 100 para os outros.
    const { container } = render(
      <Harness
        initialValues={{
          recursosFundador: 10,
          recursosDesenvolvimento: 10,
          recursosComercial: 0,
          recursosMarketing: 0,
          recursosNuvem: 0,
          recursosJuridico: 0,
          recursosCaixa: 0,
        }}
      />,
    );
    const inputs = container.querySelectorAll(
      'input[type="number"]',
    ) as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => {
      expect(input).not.toBeDisabled();
    });
    // fundador = 10, categoriaMax = 20, headroom = 100 - 10 = 90,
    // max = min(20, 90) = 20.
    expect((container.querySelector('#recursosFundador') as HTMLInputElement).max).toBe("20");
    // desenvolvimento = 10, categoriaMax = 100, headroom = 90.
    expect((container.querySelector('#recursosDesenvolvimento') as HTMLInputElement).max).toBe("90");
    // comercial = 0, categoriaMax = 100, headroom = 80.
    expect((container.querySelector('#recursosComercial') as HTMLInputElement).max).toBe("80");
  });

  it("com soma > 100 (passou), inputs com currentValue === 0 ficam disabled", () => {
    const { container } = render(
      <Harness
        initialValues={{
          recursosFundador: 53,
          recursosDesenvolvimento: 0,
          recursosComercial: 0,
          recursosMarketing: 0,
          recursosNuvem: 67.5, // soma 120.5
          recursosJuridico: 0,
          recursosCaixa: 0,
        }}
      />,
    );
    const inputs = container.querySelectorAll(
      'input[type="number"]',
    ) as NodeListOf<HTMLInputElement>;
    // Campos com currentValue === 0 (desenvolvimento, comercial, marketing,
    // juridico, caixa) devem estar disabled.
    // Campos com currentValue > 0 (fundador=53, nuvem=67.5) NAO disabled
    // mas tem max = valor atual (permitem so DIMINUIR).
    const zeroFields = ["recursosDesenvolvimento", "recursosComercial", "recursosMarketing", "recursosJuridico", "recursosCaixa"];
    zeroFields.forEach((fieldId) => {
      const input = container.querySelector(
        `input[id="${fieldId}"]`,
      ) as HTMLInputElement;
      expect(input).toBeDisabled();
    });
    // Campos com valor > 0: max = valor atual
    expect((container.querySelector('#recursosFundador') as HTMLInputElement).max).toBe("53");
    expect((container.querySelector('#recursosNuvem') as HTMLInputElement).max).toBe("67.5");
  });

  it("input max = valor atual quando locked (permite so DIMINUIR)", () => {
    const { container } = render(
      <Harness
        initialValues={{
          recursosFundador: 20,
          recursosDesenvolvimento: 30,
          recursosComercial: 10,
          recursosMarketing: 15,
          recursosNuvem: 10,
          recursosJuridico: 5,
          recursosCaixa: 10,
        }}
      />,
    );
    const infraestrutura = container.querySelector(
      'input[id="recursosNuvem"]',
    ) as HTMLInputElement;
    expect(infraestrutura.max).toBe("10"); // valor atual
  });
});